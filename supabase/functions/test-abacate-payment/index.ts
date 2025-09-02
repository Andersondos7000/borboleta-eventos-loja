import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Simple test function that creates a PIX payment
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Mock PIX response for testing
    const mockPixResponse = {
      success: true,
      pix: {
        id: `test-pix-${Date.now()}`,
        amount: requestBody.amount || 2990,
        status: "PENDING",
        devMode: true,
        qrCode: "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540529.905802BR5913TESTE USUARIO6009SAO PAULO62070503***6304ABCD",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      }
    };

    return new Response(JSON.stringify(mockPixResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in test-abacate-payment:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});