import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    console.log("=== Edge Function Start ===");
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate environment variables
    const abacateApiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    if (!abacateApiKey) {
      console.error("ABACATE_PAY_API_KEY não configurada");
      throw new Error("API Key do AbacatePay não configurada");
    }
    console.log("Environment variables OK");
    
    const { orderData, total, items } = await req.json();
    console.log("Request data received:", { 
      hasOrderData: !!orderData, 
      total, 
      itemsCount: items?.length 
    });

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
        console.log("User authenticated:", userId);
      } catch (authError) {
        console.warn("Auth error (continuing without user):", authError);
      }
    }

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        total: total,
        customer_data: orderData
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error(`Database error: ${orderError.message}`);
    }

    console.log("Order created:", order.id);

    // Create order items with error handling
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        ticket_id: item.ticketId,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        name: item.name
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
        // Continue even if items fail to insert
      } else {
        console.log("Order items created successfully");
      }
    }

    // Create payment with Abacate Pay
    console.log("Creating Abacate Pay payment...");
    
    // Validate and format CPF
    const cpfFormatted = orderData.cpf?.replace(/\D/g, '') || '';
    const isValidCpf = cpfFormatted.length === 11;
    
    const abacatePayload = {
      amount: total * 100, // Convert to cents
      expiresIn: 3600, // 1 hour expiration  
      description: `Pedido #${order.id} - Borboleta Eventos`,
      customer: {
        name: `${orderData.firstName} ${orderData.lastName}`,
        email: orderData.email || `${orderData.firstName.toLowerCase()}@borboletaeventos.com`,
        cellphone: orderData.phone?.replace(/\D/g, '') || '',
        ...(isValidCpf && { taxId: cpfFormatted })
      }
    };

    console.log("Abacate payload:", JSON.stringify(abacatePayload, null, 2));

    const abacateResponse = await fetch("https://api.abacatepay.com/v1/pixQrCode/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${abacateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(abacatePayload),
    });

    console.log("Abacate API response status:", abacateResponse.status);

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error("Abacate Pay API error:", errorText);
      throw new Error(`Abacate Pay API error: ${abacateResponse.status} - ${errorText}`);
    }

    const paymentData = await abacateResponse.json();
    console.log("Payment response:", JSON.stringify(paymentData, null, 2));

    // AbacatePay returns data wrapped in { error, data } structure
    const paymentInfo = paymentData.data || paymentData;
    
    if (paymentData.error) {
      throw new Error(`AbacatePay error: ${paymentData.error}`);
    }

    if (!paymentInfo.id) {
      throw new Error("No payment ID returned from AbacatePay");
    }

    console.log("Payment created successfully with ID:", paymentInfo.id);

    // Update order with payment ID
    await supabase
      .from('orders')
      .update({ payment_id: paymentInfo.id })
      .eq('id', order.id);

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      paymentData: paymentInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== Error in Edge Function ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      success: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
