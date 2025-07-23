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
    const webhookData = await req.json();
    console.log("Received Abacate Pay webhook:", webhookData);

    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extract payment information
    const { external_reference, status } = webhookData;
    
    if (!external_reference) {
      throw new Error("Missing external_reference in webhook data");
    }

    // Update order status based on payment status
    let orderStatus = "pending";
    switch (status) {
      case "paid":
        orderStatus = "paid";
        break;
      case "failed":
      case "cancelled":
        orderStatus = "cancelled";
        break;
      case "pending":
        orderStatus = "awaiting_payment";
        break;
    }

    // Update order in database
    const { error } = await supabaseService
      .from("orders")
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", external_reference);

    if (error) {
      console.error("Error updating order:", error);
      throw error;
    }

    console.log(`Order ${external_reference} updated to status: ${orderStatus}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error processing Abacate webhook:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});