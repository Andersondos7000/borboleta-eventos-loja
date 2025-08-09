import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Supabase service client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar todos os pedidos pendentes
    const { data: pendingOrders, error } = await supabase
      .from("orders")
      .select("id, payment_id, status")
      .in("status", ["pending", "awaiting_payment"]);

    if (error) throw error;
    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum pedido pendente." }), { headers: corsHeaders, status: 200 });
    }

    let updated = 0;
    for (const order of pendingOrders) {
      if (!order.payment_id) continue;
      // Checar status do pagamento na API do Abacate Pay
      const abacateRes = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${order.payment_id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("ABACATE_PAY_API_KEY")}`,
          "Content-Type": "application/json",
        },
      });
      if (!abacateRes.ok) continue;
      const abacateData = await abacateRes.json();
      if (abacateData?.data?.status?.toLowerCase() === "sucesso" || abacateData?.data?.status?.toLowerCase() === "success" || abacateData?.data?.status?.toLowerCase() === "paid") {
        // Atualizar status do pedido para 'completed'
        const { error: updateError } = await supabase
          .from("orders")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", order.id);
        if (!updateError) updated++;
        // Também atualizar tickets relacionados ao pedido
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("ticket_id")
          .eq("order_id", order.id)
          .not("ticket_id", "is", null);
        if (orderItems && orderItems.length > 0) {
          const ticketIds = orderItems.map(item => item.ticket_id).filter(Boolean);
          if (ticketIds.length > 0) {
            await supabase
              .from("tickets")
              .update({ status: "sold", updated_at: new Date().toISOString() })
              .in("id", ticketIds);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 