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
    const abacateApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacateApiKey) {
      console.error("ABACATEPAY_API_KEY não configurada");
      throw new Error("API Key do AbacatePay não configurada");
    }
    console.log("Environment variables OK");
    
    const requestBody = await req.json();
    console.log("Raw request body:", JSON.stringify(requestBody, null, 2));
    
    // Handle different payload structures
    const { orderData, total, items, amount, customer_data } = requestBody;
    const finalTotal = total || amount;
    const finalCustomerData = orderData || customer_data;
    
    console.log("Processed data:", { 
      hasCustomerData: !!finalCustomerData, 
      total: finalTotal, 
      itemsCount: items?.length 
    });
    
    if (!finalTotal || !finalCustomerData) {
      throw new Error("Missing required fields: amount and customer_data");
    }

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
        total: finalTotal,
        customer_data: finalCustomerData
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
    const abacatePayload = {
      amount: finalTotal * 100, // Convert to cents
      expiresIn: 3600, // 1 hour expiration  
      description: `Pedido #${order.id} - Borboleta Eventos`,
      customer: {
        name: finalCustomerData.name || `${finalCustomerData.firstName || ''} ${finalCustomerData.lastName || ''}`.trim(),
        email: finalCustomerData.email || `cliente@borboletaeventos.com`,
        cellphone: finalCustomerData.phone || finalCustomerData.cellphone,
        taxId: finalCustomerData.cpf || finalCustomerData.taxId
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

    // Return the complete payment data including brCodeBase64 and brCode
    const responsePayload = {
      success: true,
      orderId: order.id,
      paymentData: {
        ...paymentInfo,
        // Ensure brCodeBase64 and brCode are included
        brCodeBase64: paymentInfo.brCodeBase64,
        brCode: paymentInfo.brCode
      }
    };

    console.log("Final response payload:", JSON.stringify(responsePayload, null, 2));

    return new Response(JSON.stringify(responsePayload), {
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