import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ CORREÇÃO: Aceitar apenas 'id' (pix_char_*) - não aceitar billingId ou billing_id
    let chargeId: string | null = null
    if (req.method === 'GET') {
      const url = new URL(req.url)
      chargeId = url.searchParams.get('id')
    } else if (req.method === 'POST') {
      try {
        const body = await req.json()
        console.log('📋 Body recebido na consultar-cobranca:', JSON.stringify(body, null, 2))
        // ✅ VALIDAÇÃO: Aceitar apenas 'id' - não aceitar billingId ou billing_id
        chargeId = body.id || null
        if (body.billingId || body.billing_id) {
          console.warn('⚠️ Parâmetros billingId ou billing_id foram ignorados. Use apenas "id" (pix_char_*).');
        }
        console.log('🆔 ID extraído:', chargeId)
      } catch (parseError) {
        console.error('❌ Erro ao parsear body:', parseError)
        chargeId = null
      }
    } else {
      return new Response(
        JSON.stringify({ erro: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!chargeId) {
      return new Response(
        JSON.stringify({ erro: 'ID da cobrança é obrigatório (use "id" com valor pix_char_*)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ VALIDAÇÃO: Garantir que o ID seja pix_char_* (não bill_)
    if (!chargeId.startsWith('pix_char_')) {
      console.error('❌ ID inválido (não é pix_char_*):', chargeId);
      return new Response(
        JSON.stringify({ 
          erro: 'ID inválido', 
          detalhes: `O ID deve ser pix_char_*. Recebido: ${chargeId}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obter chave da API AbacatePay das variáveis de ambiente (fallback para dev)
    const abacateApiKey = Deno.env.get('ABACATEPAY_API_KEY') || 'abc_dev_fhb5Dh0s24wHQ6XWgFAGdzjc'
    if (!abacateApiKey) {
      console.error('ABACATEPAY_API_KEY não configurada')
      return new Response(
        JSON.stringify({ erro: 'Configuração de pagamento não encontrada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Consultando cobrança AbacatePay (PIX QR):', chargeId)
    console.log('🔑 API Key:', abacateApiKey ? `${abacateApiKey.substring(0, 10)}...` : 'AUSENTE')

    // Endpoint oficial: /pixQrCode/check?id={id}
    const checkUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${encodeURIComponent(chargeId)}`
    console.log('📤 URL da requisição:', checkUrl)
    
    const abacateResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    console.log('📥 Status da resposta:', abacateResponse.status, abacateResponse.statusText)
    
    const responseText = await abacateResponse.text()
    console.log('📥 Resposta bruta da API:', responseText)

    let abacateData: any = null
    try {
      abacateData = JSON.parse(responseText)
      console.log('📥 Resposta parseada:', JSON.stringify(abacateData, null, 2))
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta JSON:', parseError)
      console.error('❌ Resposta que falhou:', responseText)
      return new Response(
        JSON.stringify({ 
          erro: 'Resposta inválida da API AbacatePay', 
          detalhes: `Não foi possível parsear a resposta: ${responseText.substring(0, 200)}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!abacateResponse.ok) {
      console.error('❌ Erro AbacatePay (check):', abacateData)
      const errorMessage = abacateData?.error?.message || 
                          abacateData?.mensagem || 
                          abacateData?.message || 
                          abacateData?.error ||
                          `HTTP ${abacateResponse.status}`
      return new Response(
        JSON.stringify({ 
          erro: 'Falha ao consultar cobrança', 
          detalhes: errorMessage
        }),
        { status: abacateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se há erro na resposta mesmo com status 200
    if (abacateData?.error) {
      console.error('❌ Erro na resposta da API:', abacateData.error)
      return new Response(
        JSON.stringify({ 
          erro: 'Erro na resposta da API', 
          detalhes: abacateData.error?.message || abacateData.error || 'Erro desconhecido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ CORREÇÃO: Seguir formato exato da documentação da AbacatePay
    // Documentação: https://docs.abacatepay.com/pages/pix-qrcode/check
    // Resposta esperada: 
    // {
    //   "data": {
    //     "status": "PENDING" | "PAID" | "EXPIRED" | "CANCELLED",
    //     "expiresAt": "2025-03-25T21:50:20.772Z"
    //   },
    //   "error": null
    // }
    // 
    // IMPORTANTE: O endpoint /pixQrCode/check retorna APENAS status e expiresAt
    // Não retorna: amount, description, createdAt, updatedAt
    // Esses campos só vêm na criação do PIX QR Code (endpoint /pixQrCode/create)
    
    const responseData = abacateData?.data ?? abacateData
    console.log('📊 Dados extraídos da API AbacatePay:', JSON.stringify(responseData, null, 2))

    // Extrair apenas os campos que a documentação garante que existem
    const statusRaw = responseData?.status
    const expiresAt = responseData?.expiresAt || responseData?.expires_at || null

    // Validar que status existe (campo obrigatório)
    if (!statusRaw) {
      console.error('❌ Status não encontrado na resposta da API')
      return new Response(
        JSON.stringify({ 
          erro: 'Resposta inválida da API AbacatePay', 
          detalhes: 'Campo "status" não encontrado na resposta'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalizar status: converter para uppercase primeiro, depois para lowercase
    // A API retorna: "PENDING", "PAID", "EXPIRED", "CANCELLED" (uppercase)
    // Nós convertemos para: "pending", "paid", "expired", "cancelled" (lowercase)
    const statusNormalized = statusRaw.toString().toUpperCase()
    const statusLowercase = statusNormalized.toLowerCase()

    console.log('🔍 Status bruto da API:', statusRaw)
    console.log('🔍 Status normalizado (uppercase):', statusNormalized)
    console.log('🔍 Status final (lowercase):', statusLowercase)
    console.log('🔍 Expira em:', expiresAt)

    // ✅ VALIDAÇÃO: Verificar se a resposta contém campos com 'bill_' ou 'billing'
    const responseStr = JSON.stringify(responseData);
    if (responseStr.includes('bill_')) {
      console.error('❌ Resposta da API contém "bill_" (não permitido):', responseData);
      // Filtrar campos que contenham 'bill_' antes de processar
      const filteredData: any = {};
      for (const [key, value] of Object.entries(responseData)) {
        if (key.toLowerCase().includes('bill') || key.toLowerCase().includes('billing')) {
          console.warn(`⚠️ Campo filtrado (contém bill/billing): ${key}`);
          continue;
        }
        if (typeof value === 'string' && value.includes('bill_')) {
          console.warn(`⚠️ Valor filtrado (contém bill_): ${key} = ${value}`);
          continue;
        }
        filteredData[key] = value;
      }
      // Usar dados filtrados
      responseData.status = filteredData.status || responseData.status;
      responseData.expiresAt = filteredData.expiresAt || filteredData.expires_at || responseData.expiresAt;
    }

    // Normalizar resposta para o frontend
    // Retornar apenas os campos que o endpoint realmente fornece
    // ✅ GARANTIA: NUNCA retornar campos com 'bill_' ou 'billing'
    const normalized = {
      id: chargeId, // Sempre pix_char_*
      status: statusLowercase, // 'pending', 'paid', 'expired', 'cancelled'
      expiresAt: expiresAt
      // NOTA: Não incluir amount, description, createdAt, updatedAt
      // pois o endpoint /pixQrCode/check não retorna esses campos
      // Eles só estão disponíveis na criação do PIX (endpoint /pixQrCode/create)
    }

    // ✅ VALIDAÇÃO FINAL: Garantir que a resposta não contenha 'bill_'
    const normalizedStr = JSON.stringify(normalized);
    if (normalizedStr.includes('bill_')) {
      console.error('❌ Resposta normalizada contém "bill_" (não permitido):', normalized);
      throw new Error('Resposta contém "bill_" (não permitido). Apenas pix_char_* é permitido.');
    }

    console.log('✅ Status consultado com sucesso:', normalized.status)
    console.log('✅ Resposta normalizada para frontend:', JSON.stringify(normalized, null, 2))

    return new Response(
      JSON.stringify(normalized),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Erro interno:', error)
    return new Response(
      JSON.stringify({ 
        erro: 'Erro interno do servidor',
        detalhes: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})