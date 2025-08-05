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
    const { transactionId } = await req.json();
    
    if (!transactionId) {
      throw new Error("Transaction ID is required");
    }

    console.log("Checking payment status for transaction:", transactionId);

    // Check payment status with Abacate Pay
    const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${transactionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ABACATE_PAY_API_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text();
      console.error("Abacate Pay API error:", errorText);
      throw new Error(`Abacate Pay API error: ${abacateResponse.status}`);
    }

    const paymentStatus = await abacateResponse.json();
    console.log("Payment status response:", paymentStatus);

    return new Response(JSON.stringify({
      success: true,
      data: paymentStatus.data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error checking payment status:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});