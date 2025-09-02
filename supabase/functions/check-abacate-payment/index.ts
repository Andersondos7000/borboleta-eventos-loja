import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Payment status check function for testing
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { transactionId } = requestBody;
    
    // Validate required fields
    if (!transactionId) {
      throw new Error("Missing required field: transactionId");
    }

    // Mock payment status response
    const isTestTransaction = transactionId.startsWith('test-') || transactionId.startsWith('bill_test');
    
    const mockStatusResponse = {
      success: true,
      data: {
        id: transactionId,
        status: "PENDING", // Could be PENDING, APPROVED, EXPIRED, FAILED
        amount: 2990, // R$ 29,90 in cents
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 minutes remaining
        testMode: isTestTransaction
      }
    };

    // Simulate different statuses based on transaction ID for testing
    if (transactionId.includes('paid')) {
      mockStatusResponse.data.status = "APPROVED";
      mockStatusResponse.data.paidAt = new Date().toISOString();
    } else if (transactionId.includes('expired')) {
      mockStatusResponse.data.status = "EXPIRED";
    } else if (transactionId.includes('failed')) {
      mockStatusResponse.data.status = "FAILED";
    }

    console.log("Payment status checked:", {
      transactionId,
      status: mockStatusResponse.data.status,
      testMode: isTestTransaction
    });

    return new Response(JSON.stringify(mockStatusResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-abacate-payment:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});