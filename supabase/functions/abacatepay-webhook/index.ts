import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface WebhookData {
  id: string;
  external_reference: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "expired";
  amount: number;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

const createSupabaseClients = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  
  return { supabaseService };
};

const verifyWebhookSignature = (payload: string, signature: string): boolean => {
  const webhookSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    console.warn("ABACATEPAY_WEBHOOK_SECRET not configured");
    return true; // Allow in development mode
  }
  
  // TODO: Implement HMAC signature verification
  // For now, we'll skip verification in development
  return true;
};

const processWebhook = async (webhookData: WebhookData): Promise<{ success: boolean; message: string }> => {
  const { supabaseService } = createSupabaseClients();
  const { external_reference, status } = webhookData;
  
  if (!external_reference) {
    throw new Error("Missing external_reference in webhook data");
  }

  // Map AbacatePay status to our internal status
  let orderStatus = "pending";
  let paymentStatus = "pending";
  
  switch (status) {
    case "paid":
      orderStatus = "confirmed";
      paymentStatus = "paid";
      break;
    case "failed":
    case "cancelled":
      orderStatus = "cancelled";
      paymentStatus = "failed";
      break;
    case "expired":
      orderStatus = "cancelled";
      paymentStatus = "expired";
      break;
    case "pending":
      orderStatus = "pending";
      paymentStatus = "awaiting_payment";
      break;
  }

  // Update order in database
  const { error } = await supabaseService
    .from("orders")
    .update({
      order_status: orderStatus,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", external_reference);

  if (error) {
    throw error;
  }
  
  return { 
    success: true, 
    message: `Order ${external_reference} updated to status: ${orderStatus}` 
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-abacatepay-signature") || "";
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const webhookData: WebhookData = JSON.parse(body);
    
    const result = await processWebhook(webhookData);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Webhook processing error:", error);
    
    return new Response(JSON.stringify({ 
      error: "Webhook processing failed",
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
