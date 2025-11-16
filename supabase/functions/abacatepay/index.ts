import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: corsHeaders }
      )
    }

    // Extrair dados do corpo da requisição
    const body = await req.json()
    const { action = 'simulate_payment', billing_id, billingId } = body

    // Suporte para ambos os formatos: billing_id e billingId
    const finalBillingId = billing_id || billingId
    const finalAction = action

    console.log('AbacatePay Function - Action:', finalAction, 'Billing ID:', finalBillingId)

    // Processar diferentes ações
    if (finalAction === 'simulate_payment') {
      // Validar billing_id
      if (!finalBillingId) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'billing_id ou billingId é obrigatório para simulação' 
          }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Simular resposta de pagamento bem-sucedido
      const simulationResponse = {
        success: true,
        data: {
          id: finalBillingId,
          status: 'paid',
          amount: 1000, // R$ 10,00 em centavos
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
          description: 'Pagamento simulado com sucesso'
        }
      }

      console.log('Simulação de pagamento realizada:', simulationResponse)

      return new Response(
        JSON.stringify(simulationResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Ação não reconhecida
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Ação não reconhecida: ${finalAction}` 
      }),
      { status: 400, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Erro na função AbacatePay:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno da função',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})