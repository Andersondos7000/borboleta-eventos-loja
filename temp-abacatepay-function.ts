import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Método não permitido'
      }), {
        status: 405,
        headers: corsHeaders
      });
    }

    // Extrair dados do corpo da requisição
    const { action, billing_id, amount } = await req.json();
    console.log('AbacatePay Function - Action:', action, 'Billing ID:', billing_id, 'Amount:', amount);

    // Processar diferentes ações
    if (action === 'simulate_payment') {
      // Validar billing_id
      if (!billing_id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'billing_id é obrigatório para simulação'
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Simular resposta de pagamento bem-sucedido
      // Usar o amount passado ou um valor padrão
      const paymentAmount = amount || 659;
      
      const simulationResponse = {
        success: true,
        data: {
          id: billing_id,
          status: 'paid',
          amount: paymentAmount,
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          description: 'Pagamento simulado com sucesso'
        }
      };

      console.log('Simulação de pagamento realizada:', simulationResponse);

      return new Response(JSON.stringify(simulationResponse), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Ação não reconhecida
    return new Response(JSON.stringify({
      success: false,
      error: `Ação não reconhecida: ${action}`
    }), {
      status: 400,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Erro na função AbacatePay:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno da função',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});