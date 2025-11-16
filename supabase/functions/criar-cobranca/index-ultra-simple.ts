import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🚀 ULTRA-DEBUG: Função iniciada - versão ultra-simples');
  
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('✅ ULTRA-DEBUG: CORS preflight');
      return new Response('ok', { headers: corsHeaders });
    }

    console.log('📝 ULTRA-DEBUG: Método da requisição:', req.method);

    if (req.method !== 'POST') {
      console.log('❌ ULTRA-DEBUG: Método não permitido:', req.method);
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lê o body de forma segura para evitar erro de parsing automático do Deno
    console.log('📖 ULTRA-DEBUG: Tentando ler body da requisição...');
    const bodyText = await req.text();
    console.log('📖 ULTRA-DEBUG: Body recebido (length):', bodyText.length);
    console.log('📖 ULTRA-DEBUG: Body content:', bodyText.substring(0, 100) + '...');

    console.log('🎯 ULTRA-DEBUG: Chegou até aqui - função está funcionando!');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Função ultra-simples funcionando!',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ ULTRA-DEBUG: Erro geral:', error);
    console.error('❌ ULTRA-DEBUG: Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});