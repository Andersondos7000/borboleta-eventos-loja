import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    
    // Validate environment variables
    const abacateApiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    
    if (!abacateApiKey) {
      throw new Error("ABACATE_PAY_API_KEY not configured");
    }
    
    console.log("Environment variables OK");
    
    const { orderData, total, items } = await req.json();
    console.log("Request data received:", { 
      hasOrderData: !!orderData, 
      total, 
      itemsCount: items?.length 
    });

    // Create payment with Abacate Pay (simplified version)
    console.log("Creating Abacate Pay payment...");
    const abacatePayload = {
      amount: total * 100, // Convert to cents
      expiresIn: 3600, // 1 hour expiration  
      description: `Pedido Borboleta Eventos`,
      customer: {
        name: `${orderData.firstName} ${orderData.lastName}`,
        email: orderData.email || "test@example.com",
        cellphone: orderData.phone,
        taxId: orderData.cpf
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
    console.log("Payment created successfully:", !!paymentData);

    return new Response(JSON.stringify({
      success: true,
      orderId: `temp-${Date.now()}`, // Temporary order ID
      paymentData: paymentData
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
