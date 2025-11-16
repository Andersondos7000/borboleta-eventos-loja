import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Iniciando sincronização de cobranças históricas...')

    // Obter API key do AbacatePay das variáveis de ambiente
    const abacatePayApiKey = Deno.env.get('ABACATEPAY_API_KEY')
    if (!abacatePayApiKey) {
      throw new Error('ABACATEPAY_API_KEY não configurada')
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('📡 Buscando cobranças do AbacatePay...')

    // Buscar todas as cobranças do AbacatePay
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/billing/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacatePayApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text()
      console.error('❌ Erro na API AbacatePay:', abacateResponse.status, errorText)
      throw new Error(`AbacatePay API error: ${abacateResponse.status} - ${errorText}`)
    }

    const abacateData = await abacateResponse.json()
    const abacateCharges = abacateData.data || []
    
    console.log(`✅ ${abacateCharges.length} cobranças encontradas no AbacatePay`)

    // Buscar cobranças existentes no Supabase
    const { data: existingCharges, error: fetchError } = await supabase
      .from('abacatepay_charges')
      .select('charge_id')

    if (fetchError) {
      console.error('❌ Erro ao buscar cobranças existentes:', fetchError)
      throw fetchError
    }

    const existingChargeIds = new Set(existingCharges?.map(c => c.charge_id) || [])
    console.log(`📊 ${existingChargeIds.size} cobranças já existem no banco local`)

    // Filtrar cobranças que não existem no banco local
    const missingCharges = abacateCharges.filter(charge => !existingChargeIds.has(charge.id))
    console.log(`🔍 ${missingCharges.length} cobranças precisam ser sincronizadas`)

    if (missingCharges.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todas as cobranças já estão sincronizadas',
          total_abacatepay: abacateCharges.length,
          total_local: existingChargeIds.size,
          sincronizadas: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Preparar dados para inserção
    const chargesToInsert = missingCharges.map(charge => ({
      charge_id: charge.id,
      amount: (charge.amount || 0) / 100, // Converter de centavos para reais
      status: (charge.status || 'pending').toLowerCase(),
      qr_code: charge.url || '',
      customer_name: charge.customer?.name || 'Cliente',
      customer_email: charge.customer?.email || 'cliente@exemplo.com',
      expires_at: charge.expiresAt || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log('💾 Inserindo cobranças no banco local...')

    // Inserir em lotes para evitar timeout
    const batchSize = 50
    let totalInserted = 0
    let totalErrors = 0

    for (let i = 0; i < chargesToInsert.length; i += batchSize) {
      const batch = chargesToInsert.slice(i, i + batchSize)
      
      try {
        const { error: insertError } = await supabase
          .from('abacatepay_charges')
          .insert(batch)

        if (insertError) {
          console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, insertError)
          totalErrors += batch.length
        } else {
          console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} inserido com sucesso (${batch.length} itens)`)
          totalInserted += batch.length
        }
      } catch (batchError) {
        console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, batchError)
        totalErrors += batch.length
      }
    }

    const successRate = totalInserted / (totalInserted + totalErrors) * 100

    console.log(`📊 Sincronização concluída:`)
    console.log(`   • Inseridas: ${totalInserted}`)
    console.log(`   • Erros: ${totalErrors}`)
    console.log(`   • Taxa de sucesso: ${successRate.toFixed(1)}%`)

    // Verificar se a cobrança específica foi sincronizada
    const specificBillId = 'bill_3EfWH4ehzz6YFmQG6WCUhWRz'
    const { data: specificBill } = await supabase
      .from('abacatepay_charges')
      .select('*')
      .eq('charge_id', specificBillId)
      .single()

    const specificBillStatus = specificBill ? '✅ Sincronizada' : '❌ Não encontrada'

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sincronização de cobranças históricas concluída',
        total_abacatepay: abacateCharges.length,
        total_local_antes: existingChargeIds.size,
        cobranças_faltantes: missingCharges.length,
        inseridas: totalInserted,
        erros: totalErrors,
        taxa_sucesso: `${successRate.toFixed(1)}%`,
        cobranca_especifica: {
          id: specificBillId,
          status: specificBillStatus
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro na sincronização de cobranças históricas',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})