import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configuração da API AbacatePay
const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';
// Preferir variável de ambiente; manter fallback para desenvolvimento
const ABACATEPAY_API_KEY = Deno.env.get('ABACATEPAY_API_KEY') || 'abc_dev_fhb5Dh0s24wHQ6XWgFAGdzjc';

// ✅ CORREÇÃO: Configuração do Supabase com fallbacks
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ojxmfxbflbfinodkhixk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkyNTA4MCwiZXhwIjoyMDcwNTAxMDgwfQ.otn_yr7CqJpg9B_z9XaONVxqHSlNsCro67bVstt5JmQ';

// Função para gerar hash de idempotência
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  console.log('🚀 Função criar-cobranca iniciada');
  
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight');
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      console.log('❌ Método não permitido:', req.method);
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Lendo body da requisição...');
    const body = await req.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    // Converter campos do português para inglês se necessário
    const requestData = {
      amount: body.amount || body.valor,
      description: body.description || body.descricao,
      customer: body.customer || body.cliente,
      external_id: body.external_id
    };

    console.log('🔍 RequestData processado:', JSON.stringify(requestData, null, 2));

    // Validar campos obrigatórios
    const missingFields = [];
    if (!requestData.amount) missingFields.push('amount/valor');
    if (!requestData.description) missingFields.push('description/descricao');
    if (!requestData.customer) missingFields.push('customer/cliente');

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ error: `Campos obrigatórios: ${missingFields.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Valores para processamento
    const valor = requestData.amount || 10;
    const descricao = requestData.description || "Teste de cobrança";
    const cliente = requestData.customer || {
      nome: "Cliente Teste",
      email: "cliente@teste.com",
      cpf: "12345678909",
      telefone: "11999999999"
    };

    console.log('🔍 Valores usados:', { 
      valor, 
      descricao, 
      cliente
    });

    // Converter valor para centavos se necessário
    let amountInCents;
    if (typeof valor === 'number') {
      amountInCents = Math.round(valor * 100);
    } else if (typeof valor === 'string') {
      amountInCents = Math.round(parseFloat(valor) * 100);
    } else {
      amountInCents = 1000; // 10 reais como fallback
    }
    
    console.log('💰 Valor convertido:', {
      original: valor,
      centavos: amountInCents
    });

    // Preparar dados para AbacatePay conforme documentação oficial
    const pixData = {
      frequency: 'ONE_TIME',
      methods: ['PIX'],
      amount: amountInCents,
      products: [
        {
          externalId: requestData.external_id || `produto_${Date.now()}`,
          name: descricao,
          description: descricao,
          quantity: 1,
          price: amountInCents
        }
      ],
      returnUrl: 'http://localhost:8082/checkout/success',
      completionUrl: 'http://localhost:8082/checkout/completion',
      customer: {
        name: cliente.nome || cliente.name || 'Cliente',
        cellphone: cliente.telefone || cliente.phone || cliente.cellphone || '',
        email: cliente.email || 'cliente@exemplo.com',
        taxId: (cliente.cpf || cliente.document || cliente.taxId || '').replace(/\D/g, '') // Limpar CPF
      }
    };
    
    console.log('📋 Cliente processado:', {
      original: cliente,
      processado: pixData.customer
    });

    console.log('🔄 Enviando para AbacatePay:', JSON.stringify(pixData, null, 2));

    // Chamar API do AbacatePay para criar cobrança PIX
    const idempotencyKey = req.headers.get('x-idempotency-key') || undefined;
    
    console.log('📤 Enviando para AbacatePay:', {
      url: `${ABACATEPAY_API_URL}/billing/create`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify(pixData, null, 2)
    });

    const abacatePayResponse = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
        // Encaminhar idempotência quando disponível
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      body: JSON.stringify(pixData)
    });

    console.log('📥 Resposta da AbacatePay:', {
      status: abacatePayResponse.status,
      statusText: abacatePayResponse.statusText,
      headers: Object.fromEntries(abacatePayResponse.headers.entries())
    });

    if (!abacatePayResponse.ok) {
      const errorData = await abacatePayResponse.text();
      console.error('❌ Erro da API AbacatePay:', {
        status: abacatePayResponse.status,
        statusText: abacatePayResponse.statusText,
        body: errorData
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar cobrança PIX',
          status: abacatePayResponse.status,
          message: errorData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixResponse = await abacatePayResponse.json();
    console.log('✅ PIX QRCode criado com sucesso (raw):', JSON.stringify(pixResponse, null, 2));

    // Algumas respostas da AbacatePay vêm dentro de { data: {...}, error: null }
    const d = pixResponse?.data ?? pixResponse;
    
    console.log('🔍 Dados extraídos da resposta:', {
      id: d?.id,
      status: d?.status,
      amount: d?.amount,
      brCode: d?.brCode,
      brCodeBase64: d?.brCodeBase64,
      expiresAt: d?.expiresAt,
      description: d?.description
    });

    // Verificar se temos os dados essenciais
    if (!d?.id) {
      console.error('❌ Resposta da AbacatePay não contém dados essenciais:', {
        hasId: !!d?.id,
        hasAmount: !!d?.amount,
        rawResponse: pixResponse
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Resposta inválida da API AbacatePay',
          details: 'ID da cobrança não encontrado na resposta',
          debug: { pixResponse, extractedData: d }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ CORREÇÃO: Salvar dados no banco de dados Supabase
    console.log('🔄 INICIANDO SALVAMENTO NO BANCO DE DADOS...');
    console.log('🔍 External ID recebido no requestData:', requestData.external_id);
    console.log('🔍 External ID recebido no body:', body.external_id);
    
    try {
      // Configurar Supabase - usar constantes definidas no topo
      console.log('🔧 Configuração Supabase:', {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_SERVICE_ROLE_KEY,
        urlLength: SUPABASE_URL?.length || 0,
        keyLength: SUPABASE_SERVICE_ROLE_KEY?.length || 0
      });
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Variáveis de ambiente do Supabase não configuradas');
        console.error('❌ SUPABASE_URL:', SUPABASE_URL ? 'DEFINIDA' : 'NÃO DEFINIDA');
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
      } else {
        console.log('✅ Variáveis do Supabase configuradas corretamente');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        console.log('✅ Cliente Supabase criado com sucesso');

        // Gerar chave de idempotência se não fornecida
        let idempotencyKey = req.headers.get('x-idempotency-key');
        if (!idempotencyKey) {
          const idempotencyData = JSON.stringify({
            amount: amountInCents,
            description: descricao,
            customer: cliente,
            external_id: requestData.external_id
          });
          idempotencyKey = await generateHash(idempotencyData);
        }
        
        console.log('🔑 Chave de idempotência:', idempotencyKey);

        // Verificar se já existe um pedido com esta chave de idempotência
        console.log('🔍 Verificando pedido existente...');
        const { data: existingOrder, error: selectError } = await supabase
          .from('orders')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .single();
          
        if (selectError && selectError.code !== 'PGRST116') {
          console.error('❌ Erro ao verificar pedido existente:', selectError);
        } else {
          console.log('✅ Verificação de pedido existente concluída:', {
            existingOrderId: existingOrder?.id || 'NENHUM',
            hasExistingOrder: !!existingOrder
          });
        }

        // Preparar dados do pedido
        const finalExternalId = requestData.external_id || body.external_id || `pedido_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const orderData = {
          idempotency_key: idempotencyKey,
          customer_email: cliente.email || 'cliente@exemplo.com',
          total_amount: (amountInCents / 100).toFixed(2),
          customer_data: {
            name: cliente.nome || cliente.name || 'Cliente',
            email: cliente.email || 'cliente@exemplo.com',
            cpf: (cliente.cpf || cliente.document || cliente.taxId || '').replace(/\D/g, ''),
            phone: cliente.telefone || cliente.phone || cliente.cellphone || ''
          },
          payment_id: d.id,
          external_id: finalExternalId,
          payment_status: 'PENDING',
          status: 'pending'
        };

        console.log('💾 OrderData preparado:', JSON.stringify(orderData, null, 2));
        console.log('🔍 External ID FINAL no orderData:', orderData.external_id);
        console.log('🔍 Verificação de external_id:', {
          requestDataExternalId: requestData.external_id,
          bodyExternalId: body.external_id,
          finalExternalId: finalExternalId,
          orderDataExternalId: orderData.external_id
        });

        let orderId: string;

        if (existingOrder) {
          // Atualizar pedido existente
          console.log('🔄 Atualizando pedido existente com external_id:', orderData.external_id);
          const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update(orderData)
            .eq('id', existingOrder.id)
            .select('id, external_id')
            .single();

          if (updateError) {
            console.error('❌ Erro ao atualizar pedido:', updateError);
            console.error('❌ Detalhes do erro de update:', {
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint
            });
          } else {
            console.log('✅ Pedido atualizado com sucesso:', {
              id: updatedOrder.id,
              external_id: updatedOrder.external_id
            });
          }
          orderId = existingOrder.id;
        } else {
          // Criar novo pedido
          console.log('🆕 Criando novo pedido com external_id:', orderData.external_id);
          const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert(orderData)
            .select('id, external_id')
            .single();

          if (insertError) {
            console.error('❌ Erro ao criar pedido:', insertError);
            console.error('❌ Detalhes do erro de insert:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint
            });
          } else {
            console.log('✅ Pedido criado com sucesso:', {
              id: newOrder.id,
              external_id: newOrder.external_id
            });
            orderId = newOrder.id;
          }
        }

        // Salvar dados da cobrança na tabela abacatepay_charges (se o pedido foi criado/atualizado)
        if (orderId) {
          const chargeData = {
            order_id: orderId,
            charge_id: d.id,
            amount: amountInCents / 100,
            status: 'pending',
            qr_code: d.url, // Usar URL de pagamento do AbacatePay
            customer_name: cliente.nome || cliente.name || 'Cliente',
            customer_email: cliente.email || 'cliente@exemplo.com',
            expires_at: d.expiresAt
          };

          const { error: chargeError } = await supabase
            .from('abacatepay_charges')
            .insert(chargeData);

          if (chargeError) {
            console.error('❌ Erro ao salvar cobrança:', chargeError);
          } else {
            console.log('✅ Cobrança salva na tabela abacatepay_charges');
          }
        }
      }
    } catch (dbError) {
      console.error('❌ Erro ao salvar no banco de dados:', dbError);
      // Não interromper o fluxo, pois a cobrança foi criada com sucesso na AbacatePay
    }

    // Formatar resposta no formato esperado pelo frontend, mantendo compatibilidade
    const response = {
      id: d.id,
      status: (d.status || 'PENDING').toString().toLowerCase(),
      valor: (d.amount ?? 0) / 100, // Converter de centavos para reais
      valorFormatado: `R$ ${(((d.amount ?? 0) / 100)).toFixed(2).replace('.', ',')}`,
      descricao: d.description,
      pix: {
        qr_code: d.url, // URL de pagamento do AbacatePay
        qr_code_url: d.url, // URL de pagamento do AbacatePay
        expires_at: d.expiresAt
      },
      created_at: d.createdAt,
      expires_at: d.expiresAt,
      // Compatibilidade com resposta oficial
      data: {
        id: d.id,
        brCode: d.brCode,
        brCodeBase64: d.brCodeBase64,
        expiresAt: d.expiresAt,
        amount: d.amount,
        status: d.status,
        customer: pixData.customer // ✅ Incluir dados do cliente na resposta
      },
      // Fallbacks diretos
      brCode: d.brCode,
      brCodeBase64: d.brCodeBase64
    };

    console.log('📤 Resposta formatada:', JSON.stringify(response, null, 2));
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao criar PIX QRCode:', error);
    console.error('Stack trace:', error.stack);
    
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error('Tipo do erro:', error.constructor.name);
      console.error('Mensagem:', error.message);
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});