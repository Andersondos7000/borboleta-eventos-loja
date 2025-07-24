import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderData, total, items } = await req.json();
    
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Create order in Supabase first
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        user_id: user.id,
        total: total,
        status: "pending"
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Validate items exist before inserting
    const productIds = items.filter((item: any) => item.productId).map((item: any) => item.productId);
    const ticketIds = items.filter((item: any) => item.ticketId).map((item: any) => item.ticketId);
    
    // Check if all products exist
    if (productIds.length > 0) {
      const { data: existingProducts, error: productCheckError } = await supabaseService
        .from("products")
        .select("id")
        .in("id", productIds);
      
      if (productCheckError) throw productCheckError;
      
      const existingProductIds = existingProducts?.map(p => p.id) || [];
      const missingProducts = productIds.filter(id => !existingProductIds.includes(id));
      
      if (missingProducts.length > 0) {
        throw new Error(`Products not found: ${missingProducts.join(', ')}`);
      }
    }
    
    // Check if all tickets exist
    if (ticketIds.length > 0) {
      const { data: existingTickets, error: ticketCheckError } = await supabaseService
        .from("tickets")
        .select("id")
        .in("id", ticketIds);
      
      if (ticketCheckError) throw ticketCheckError;
      
      const existingTicketIds = existingTickets?.map(t => t.id) || [];
      const missingTickets = ticketIds.filter(id => !existingTicketIds.includes(id));
      
      if (missingTickets.length > 0) {
        throw new Error(`Tickets not found: ${missingTickets.join(', ')}`);
      }
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId || null,
      ticket_id: item.ticketId || null,
      price: item.price,
      quantity: item.quantity,
      size: item.size || null
    }));

    const { error: itemsError } = await supabaseService
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Create payment with Abacate Pay
    const abacatePayload = {
      amount: total, // Amount as decimal number
      transactionId: `TXID-${order.id}` // Required unique transaction identifier
    };

    console.log("Sending payload to Abacate Pay:", JSON.stringify(abacatePayload, null, 2));

    const abacateResponse = await fetch("https://api.abacatepay.com/v1/pixQrCode/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ABACATE_PAY_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(abacatePayload),
    });

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error("Abacate Pay API error:", errorText);
      throw new Error(`Abacate Pay API error: ${abacateResponse.status}`);
    }

    const paymentData = await abacateResponse.json();

    // Update order with payment information
    await supabaseService
      .from("orders")
      .update({
        status: "awaiting_payment"
      })
      .eq("id", order.id);

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      paymentData: paymentData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating Abacate payment:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});