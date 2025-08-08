// supabase/functions/abacate-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WEBHOOK_SECRET = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    // Verificar o header de assinatura
    const signature = req.headers.get("X-Abacate-Signature");
    const requestBody = await req.text();

    // Verificar a assinatura do webhook
    if (!signature) {
      console.error("Missing X-Abacate-Signature header");
      throw new Error("Missing signature header");
    }

    // Criar HMAC SHA256 do corpo da requisição
    const hmac = createHmac("sha256", WEBHOOK_SECRET);
    hmac.update(requestBody);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;
    
    // Comparar assinaturas de forma segura
    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature", { received: signature, expected: expectedSignature });
      throw new Error("Invalid signature");
    }
    
    console.log("Webhook signature validated successfully");

    const payload = JSON.parse(requestBody);
    console.log("Webhook payload received:", payload);
    
    // Extrair dados do payload (ajustar conforme estrutura real do Abacate Pay)
    const { id: chargeId, status, transaction_id } = payload;
    
    if (!chargeId && !transaction_id) {
      console.error("Missing charge ID or transaction ID in payload", payload);
      throw new Error("Invalid payload: missing charge/transaction ID");
    }
    
    if (!status) {
      console.error("Missing status in payload", payload);
      throw new Error("Invalid payload: missing status");
    }

    // Atualizar o pedido usando o abacate_charge_id
    const updateField = chargeId ? "abacate_charge_id" : "id";
    const updateValue = chargeId || transaction_id;
    
    console.log(`Updating order with ${updateField}=${updateValue} to status=${status}`);
    
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq(updateField, updateValue)
      .select();
      
    if (error) {
      console.error("Database update error:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn(`No order found with ${updateField}=${updateValue}`);
      // Não falhar aqui, pois pode ser um webhook duplicado ou de teste
    } else {
      console.log("Order updated successfully:", data[0]);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});