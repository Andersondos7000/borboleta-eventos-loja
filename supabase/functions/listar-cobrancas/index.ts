import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Iniciando listagem de cobranças AbacatePay...')

    // Obter API key do AbacatePay das variáveis de ambiente
    const abacatePayApiKey = Deno.env.get('ABACATEPAY_API_KEY')
    if (!abacatePayApiKey) {
      throw new Error('ABACATEPAY_API_KEY não configurada')
    }

    console.log('📡 Fazendo requisição para AbacatePay API...')

    // Fazer requisição para a API do AbacatePay
    const response = await fetch('https://api.abacatepay.com/v1/billing/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacatePayApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erro na API AbacatePay:', response.status, errorText)
      throw new Error(`AbacatePay API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ Cobranças obtidas: ${data.data?.length || 0}`)

    // Processar e normalizar os dados
    const charges = data.data || []
    const processedCharges = charges.map(charge => ({
      id: charge.id,
      status: charge.status,
      amount: charge.amount,
      currency: charge.currency || 'BRL',
      customer: {
        id: charge.customer?.id,
        name: charge.customer?.metadata?.name,
        email: charge.customer?.metadata?.email,
        cellphone: charge.customer?.metadata?.cellphone,
        taxId: charge.customer?.metadata?.taxId
      },
      createdAt: charge.createdAt,
      expiresAt: charge.expiresAt,
      url: charge.url,
      qrCode: charge.qrCode,
      pixKey: charge.pixKey,
      devMode: charge.devMode,
      methods: charge.methods,
      products: charge.products,
      frequency: charge.frequency,
      nextBilling: charge.nextBilling,
      allowCoupons: charge.allowCoupons,
      coupons: charge.coupons
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: processedCharges,
        total: processedCharges.length,
        message: `${processedCharges.length} cobranças encontradas`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na função listar-cobrancas:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Erro ao listar cobranças'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})