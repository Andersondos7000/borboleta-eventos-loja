import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

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
    console.log('⏰ Executando sincronização automática via cron...')

    // Get the sync function URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const syncUrl = `${supabaseUrl}/functions/v1/sync-abacatepay`

    // Call the sync function
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'cron',
        timestamp: new Date().toISOString()
      })
    })

    const syncResult = await syncResponse.json()

    if (!syncResponse.ok) {
      throw new Error(`Erro na sincronização: ${syncResult.error || 'Erro desconhecido'}`)
    }

    console.log('✅ Sincronização via cron concluída:', syncResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronização automática via cron executada com sucesso',
        sync_result: syncResult,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na sincronização via cron:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})