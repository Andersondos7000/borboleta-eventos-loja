import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, payment_id, payment_status, status, external_id, payment_data, abacatepay_id, billing_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const mappings = (orders || []).map((o: any) => {
      let billingIdFromPaymentData: string | null = null;
      if (o?.payment_data) {
        try {
          const pd = typeof o.payment_data === 'string' ? JSON.parse(o.payment_data) : o.payment_data;
          billingIdFromPaymentData = pd?.billing_id || pd?.billingId || null;
        } catch (_) {
          billingIdFromPaymentData = null;
        }
      }

      return {
        order_id: o.id,
        payment_id: o.payment_id,
        billing_id_column: o.billing_id || o.abacatepay_id || null,
        billing_id_from_payment_data: billingIdFromPaymentData,
        external_id: o.external_id,
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.created_at
      };
    });

    return new Response(
      JSON.stringify({ success: true, total: mappings.length, mappings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});