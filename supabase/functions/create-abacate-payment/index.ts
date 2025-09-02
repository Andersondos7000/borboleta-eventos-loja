import { serve } from "std/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Simplified payment creation function for testing
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Extract order data
    const { orderData, total, isTestUser } = requestBody;
    
    // Validate required fields
    if (!orderData || !total) {
      throw new Error("Missing required fields: orderData and total");
    }

    // Mock successful order creation for testing
    const mockOrderResponse = {
      success: true,
      orderId: `test-order-${Date.now()}`,
      paymentData: {
        data: {
          id: `bill_test${Date.now()}`,
          url: `https://checkout.abacatepay.com/test-${Date.now()}`,
          customer: {
            name: `${orderData.firstName} ${orderData.lastName}`,
            cellphone: orderData.phone,
            taxId: orderData.cpf,
            email: orderData.email
          },
          amount: Math.round(total * 100), // Convert to cents
          status: "PENDING",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          qrCode: "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540529.905802BR5913TESTE USUARIO6009SAO PAULO62070503***6304ABCD"
        }
      },
      testMode: isTestUser || true
    };

    console.log("Mock order created:", {
      orderId: mockOrderResponse.orderId,
      total,
      customer: orderData.email,
      testMode: mockOrderResponse.testMode
    });

    return new Response(JSON.stringify(mockOrderResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (error) {
    console.error("Error in create-abacate-payment:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});