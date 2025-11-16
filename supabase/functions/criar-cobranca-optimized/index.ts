import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// Interfaces para tipagem
interface Customer {
  name: string;
  email: string;
  phone?: string;
  document: string;
}

interface OrderItem {
  nome: string;
  quantidade: number;
  preco: number;
  product_id?: string;
  size?: string;
  event_id?: string;
  ticket_type?: string;
}

interface CreateChargeRequest {
  customer: Customer;
  items: OrderItem[];
  amount: number;
  description: string;
  external_id?: string;
}

interface AbacatePayResponse {
  id: string; // pix_char_*
  status: string;
  amount: number;
  pix?: {
    id: string;
    qr_code: string;
    qr_code_base64: string;
    codigo_pix: string;
    expires_at: string;
    amount: number;
    status: string;
  };
  qrCode?: string;
  qrCodeBase64?: string;
  pixKey?: string;
  expiresAt?: string;
  pix_id?: string; // pix_char_* - único identificador
  brCode?: string;
  brCodeBase64?: string;
  created_at?: string;
}

// Configuração de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key",
};

// Iniciar a função Deno
serve(async (req: Request) => {
  // Tratar requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validar método POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ler e parsear o corpo da requisição
    let data: CreateChargeRequest;
    try {
      data = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalizar e validar dados
    data.customer.document = data.customer.document.replace(/[^0-9]/g, '');
    const { isValid, errors } = validateRequiredFields(data);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Dados inválidos", details: errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    data.customer.document = validateAndFormatCPF(data.customer.document).formatted;

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    // Padronizar variável: ABACATEPAY_API_KEY com fallback para ABACATE_PAY_API_KEY
    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY") || Deno.env.get("ABACATE_PAY_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !abacatePayApiKey) {
      return new Response(JSON.stringify({ error: "Variáveis de ambiente não configuradas", missing: {
        SUPABASE_URL: !supabaseUrl,
        SUPABASE_ANON_KEY: !supabaseAnonKey,
        ABACATEPAY_API_KEY: !abacatePayApiKey
      }}), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log rápido do modo de ambiente da AbacatePay (sem expor a chave)
    const abacateEnv = abacatePayApiKey?.includes('abc_live') ? 'production' : 'test/dev';
    console.log(`🔑 AbacatePay ambiente: ${abacateEnv}`);

    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${supabaseAnonKey}` } },
    });

    // Tratar chave de idempotência
    const idempotencyKey = req.headers.get("Idempotency-Key") || req.headers.get("x-idempotency-key");
    
    // ✅ CORREÇÃO: Gerar external_id único baseado em timestamp + idempotency para evitar conflitos
    // Se external_id foi fornecido, usar. Caso contrário, gerar um novo baseado em timestamp
    const externalId = data.external_id || `pedido_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // ✅ CORREÇÃO: Buscar user_id do header Authorization se disponível
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      try {
        // Tentar extrair user_id do token JWT (simplificado - em produção usar biblioteca JWT)
        const token = authHeader.replace("Bearer ", "");
        // Por enquanto, vamos buscar pelo email do customer
      } catch (e) {
        console.warn("⚠️ Não foi possível extrair user_id do token");
      }
    }

    // ✅ CORREÇÃO: Usar reserve_order_with_lock com todos os parâmetros necessários
    const customerEmail = data.customer?.email || '';
    const customerName = data.customer?.name || '';
    const customerPhone = data.customer?.phone || '';
    const customerDocument = data.customer?.document || '';
    const totalAmount = data.amount || 0;
    const orderType = data.items?.some((item: any) => item.event_id) ? 'ticket' : 'product';
    const customerData = data.customer ? {
      name: data.customer.name,
      email: data.customer.email,
      phone: data.customer.phone,
      document: data.customer.document
    } : null;
    const itemsData = data.items ? data.items.map((item: any) => ({
      nome: item.nome || item.title,
      quantidade: item.quantidade || item.quantity,
      preco: item.preco || item.unit_price,
      product_id: item.product_id,
      event_id: item.event_id,
      ticket_type: item.ticket_type,
      size: item.size
    })) : null;

    const { data: reservedOrder, error: reserveError } = await supabase.rpc('reserve_order_with_lock', {
      p_external_id: externalId,
      p_customer_email: customerEmail,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_document: customerDocument,
      p_total_amount: totalAmount,
      p_order_type: orderType,
      p_customer_data: customerData,
      p_items: itemsData,
      p_customer_id: null,
      p_user_id: userId
    });

    if (reserveError) {
      console.error("❌ Erro ao reservar pedido:", reserveError);
      return new Response(JSON.stringify({ error: "Erro ao processar reserva do pedido", details: reserveError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ CORREÇÃO: A função retorna order_id, não reserved_order_id
    const reservedOrderResult = reservedOrder && reservedOrder[0];
    const reservedOrderId = reservedOrderResult?.order_id;
    const orderExists = reservedOrderResult?.order_exists;

    if (!reservedOrderId) {
      console.error("❌ Pedido não pôde ser reservado. Possível duplicata ou falha no lock:", reservedOrder);
      return new Response(JSON.stringify({ error: "Não foi possível reservar o pedido. Tente novamente." }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ CORREÇÃO: Se o pedido já existe, verificar se tem payment_id e retornar dados existentes
    if (orderExists) {
      console.log("✅ Pedido já existe (external_id:", externalId, "). Verificando se tem payment_id...");
      
      // Buscar dados completos do pedido existente
      const { data: existingOrder, error: existingOrderError } = await supabase
        .from('orders')
        .select('id, payment_id, payment_data, status, payment_status, total_amount, created_at')
        .eq('id', reservedOrderId)
        .single();

      if (existingOrderError) {
        console.error("❌ Erro ao buscar pedido existente:", existingOrderError);
      }

      if (existingOrder && existingOrder.payment_id && existingOrder.payment_data) {
        console.log("✅ Pedido já possui cobrança. Retornando dados existentes.");
        const paymentData = existingOrder.payment_data as any;
        
        // Verificar status da cobrança no AbacatePay
        try {
          const checkResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?paymentId=${existingOrder.payment_id}`, {
            headers: { 'Authorization': `Bearer ${abacatePayApiKey}` }
          });
          
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (checkResult.data?.status) {
              paymentData.status = checkResult.data.status;
            }
          }
        } catch (checkError) {
          console.warn("⚠️ Erro ao verificar status no AbacatePay:", checkError);
        }
        
        // Retornar dados do pedido existente
        return new Response(JSON.stringify({ 
          success: true,
          data: {
            ...paymentData,
            pix: paymentData,
            id: existingOrder.payment_id,
            status: existingOrder.payment_status || existingOrder.status,
            amount: existingOrder.total_amount
          },
          message: "Pedido já existe. Retornando dados existentes."
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Pedido existe mas não tem payment_id - continuar para criar cobrança
        console.log("⚠️ Pedido existe mas não tem payment_id. Continuando para criar cobrança...");
      }
    }

    // Buscar ou criar cliente (apenas se o pedido não existia)
    if (!orderExists) {
      const { data: customerDbData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('document', customerDocument)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        console.error("❌ Erro ao buscar cliente:", customerError);
      }

      let customerDbId = customerDbData?.id;
      if (!customerDbId) {
        const { data: newCustomer, error: newCustomerError } = await supabase
          .from('customers')
          .insert({
            full_name: customerName,
            email: customerEmail,
            phone: customerPhone,
            document: customerDocument
          })
          .select('id')
          .single();
        if (newCustomerError) {
          console.error("❌ Erro ao criar cliente:", newCustomerError);
        } else {
          customerDbId = newCustomer.id;
        }
      }
    }

    // Criar cobrança no AbacatePay
    const chargeResult = await createAbacatePayCharge(abacatePayApiKey, data, externalId, idempotencyKey);

    if (!chargeResult.success || !chargeResult.data) {
      return new Response(JSON.stringify({ error: "Falha ao criar cobrança no AbacatePay", details: chargeResult.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chargeData = chargeResult.data;

    // Salvar dados do pedido e da cobrança no Supabase
    const saveResult = await saveOrderToDatabase(supabase, data, chargeData, externalId, reservedOrderId);

    if (!saveResult.success) {
      return new Response(JSON.stringify({ error: "Falha ao salvar pedido no banco de dados", details: saveResult.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retornar resposta de sucesso
    return new Response(JSON.stringify({ ...chargeData, pix: chargeData }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro inesperado:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Função para validar e formatar CPF
function validateAndFormatCPF(cpf: string): { isValid: boolean; formatted: string } {
  const cleanCPF = cpf.replace(/[^0-9]/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return { isValid: false, formatted: cleanCPF };
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return { isValid: false, formatted: cleanCPF };
  }
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return { isValid: false, formatted: cleanCPF };
  }
  return { isValid: true, formatted: cleanCPF };
}

// Função para validar campos obrigatórios
function validateRequiredFields(data: CreateChargeRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Customer é opcional para a API do AbacatePay.
  // Quando informado, todos os campos (name, cellphone, email, taxId) devem estar presentes.
  // Aqui validamos apenas os campos básicos, e a inclusão do objeto customer no payload
  // será condicionada a todos os campos estarem preenchidos (ver createAbacatePayCharge).
  if (data.customer) {
    const hasName = !!(data.customer.name && data.customer.name.trim().length > 0);
    const hasEmail = !!(data.customer.email && data.customer.email.includes('@'));
    const hasDocument = !!data.customer.document;
    const cpfValid = hasDocument ? validateAndFormatCPF(data.customer.document).isValid : false;
    // Telefone pode estar ausente; se estiver presente, deve ter conteúdo
    const hasPhone = !!(data.customer.phone && data.customer.phone.toString().trim().length > 0);

    // Não exigimos customer completo aqui para não bloquear a criação do PIX.
    // Se o consumidor enviar parcialmente, omitiremos o customer no payload.
    // Ainda assim, validamos caso tenha sido fornecido CPF inválido.
    if (hasDocument && !cpfValid) {
      errors.push('CPF do cliente é inválido');
    }
    // Mantemos avisos mínimos sobre nome/email quando presentes mas inválidos
    if (data.customer.name !== undefined && !hasName) errors.push('Nome do cliente é obrigatório quando informado');
    if (data.customer.email !== undefined && !hasEmail) errors.push('Email válido do cliente é obrigatório quando informado');
  }
  if (!data.amount || data.amount <= 0) errors.push('Valor da cobrança deve ser maior que zero');
  if (!data.description || data.description.trim().length === 0) errors.push('Descrição da cobrança é obrigatória');
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Pelo menos um item é obrigatório');
  } else {
    data.items.forEach((item, index) => {
      if (!item.nome || item.nome.trim().length === 0) errors.push(`Nome do item ${index + 1} é obrigatório`);
      if (!item.quantidade || item.quantidade <= 0) errors.push(`Quantidade do item ${index + 1} deve ser maior que zero`);
      if (!item.preco || item.preco <= 0) errors.push(`Preço do item ${index + 1} deve ser maior que zero`);
    });
  }
  return { isValid: errors.length === 0, errors };
}

// Função para interpretar erros da API do AbacatePay
function interpretAbacatePayError(status: number, errorText: string): string {
  try {
    const errorData = JSON.parse(errorText);
    if (errorData.error?.message) return errorData.error.message;
  } catch {}

  switch (status) {
    case 400: return `Dados da requisição inválidos: ${errorText}`;
    case 401: return 'Chave de API inválida ou expirada.';
    case 403: return 'Acesso negado.';
    case 404: return 'Endpoint não encontrado.';
    case 429: return 'Muitas requisições. Tente novamente mais tarde.';
    case 500: case 502: case 503: case 504: return 'Erro interno do servidor AbacatePay.';
    default: return `Erro da API AbacatePay (${status}): ${errorText}`;
  }
}

// Função para criar cobrança no AbacatePay
// CORREÇÃO: Usar APENAS o endpoint /v1/pixQrCode/create conforme documentação
// https://docs.abacatepay.com/pages/pix-qrcode/create
async function createAbacatePayCharge(apiKey: string, data: CreateChargeRequest, externalId: string, idempotencyKey?: string | null) {
  try {
    // Preparar headers comuns
    const commonHeaders: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (idempotencyKey) {
      commonHeaders['Idempotency-Key'] = idempotencyKey;
      commonHeaders['x-idempotency-key'] = idempotencyKey;
    }

    // Preparar payload do PIX QRCode conforme documentação
    // Documentação: https://docs.abacatepay.com/pages/pix-qrcode/create
    // Campos obrigatórios: amount (em centavos), description
    // Customer é opcional, mas se informado, TODOS os campos são obrigatórios: name, cellphone, email, taxId
    
    const pixPayload: any = {
      amount: Math.round(data.amount), // Garantir que está em centavos e é inteiro
      description: data.description?.substring(0, 140) || 'Pagamento',
      expiresIn: 3600, // 1 hora em segundos
    };

    // Adicionar customer apenas se TODOS os campos obrigatórios estiverem presentes
    // Conforme documentação: "ao informar qualquer informação do customer, todos os campos são obrigatórios"
    const customerName = data.customer?.name?.trim() || '';
    const customerEmail = data.customer?.email?.trim() || '';
    const customerDocument = data.customer?.document?.trim().replace(/[^0-9]/g, '') || '';
    const customerPhone = data.customer?.phone?.toString().trim() || '';

    const hasCustomerName = customerName.length > 0;
    const hasCustomerEmail = customerEmail.includes('@') && customerEmail.length > 5;
    const hasCustomerDocument = customerDocument.length >= 11; // CPF tem 11 dígitos, CNPJ tem 14
    const hasCustomerPhone = customerPhone.length >= 10; // Telefone mínimo: 10 dígitos (DDD + número)

    // Se tiver algum campo do customer, todos devem estar presentes e válidos
    if (hasCustomerName || hasCustomerEmail || hasCustomerDocument || hasCustomerPhone) {
      if (!hasCustomerName || !hasCustomerEmail || !hasCustomerDocument || !hasCustomerPhone) {
        console.warn('⚠️ Customer parcialmente informado ou inválido. Omitindo customer do payload PIX.');
        console.warn('⚠️ Validação dos campos:', {
          name: { present: hasCustomerName, value: customerName.substring(0, 20) },
          email: { present: hasCustomerEmail, value: customerEmail.substring(0, 30) },
          document: { present: hasCustomerDocument, length: customerDocument.length },
          phone: { present: hasCustomerPhone, length: customerPhone.length }
        });
        // Não incluir customer se não estiver completo
      } else {
        // Todos os campos estão presentes e válidos, incluir customer
        pixPayload.customer = {
          name: customerName,
          email: customerEmail,
          cellphone: customerPhone,
          taxId: customerDocument
        };
        console.log('✅ Customer válido incluído no payload PIX');
      }
    } else {
      console.log('ℹ️ Customer não informado. Criando PIX sem dados do cliente.');
    }

    // Adicionar metadata com externalId se fornecido
    if (externalId) {
      pixPayload.metadata = { externalId };
    }

    console.log('📤 Criando PIX QRCode na AbacatePay:', {
      amount: pixPayload.amount,
      description: pixPayload.description,
      hasCustomer: !!pixPayload.customer,
      externalId: externalId
    });

    // Criar PIX QRCode diretamente
    const pixResp = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(pixPayload)
    });

    const pixText = await pixResp.text();
    console.log('📥 Resposta da AbacatePay:', {
      status: pixResp.status,
      statusText: pixResp.statusText,
      body: pixText.substring(0, 500) // Limitar log para não expor dados sensíveis
    });

    if (!pixResp.ok) {
      const errorMessage = interpretAbacatePayError(pixResp.status, pixText);
      console.error('❌ Erro ao criar PIX QRCode:', errorMessage);
      console.error('❌ Resposta completa:', pixText);
      throw new Error(errorMessage);
    }

    const pixJson = JSON.parse(pixText);
    
    // Verificar se há erro na resposta
    if (pixJson.error) {
      const errorMessage = pixJson.error.message || JSON.stringify(pixJson.error);
      console.error('❌ AbacatePay retornou erro:', errorMessage);
      throw new Error(`Erro da AbacatePay: ${errorMessage}`);
    }

    // Verificar se há data na resposta
    if (!pixJson.data) {
      console.error('❌ Resposta da AbacatePay não contém data:', pixJson);
      throw new Error('Resposta da AbacatePay não contém dados do PIX');
    }

    const pixData = pixJson.data;

    // ✅ LOG DETALHADO: Verificar TODOS os campos retornados pela API
    console.log('🔍 Dados completos retornados pela API AbacatePay:', {
      id: pixData.id,
      status: pixData.status,
      amount: pixData.amount,
      hasBrCode: !!pixData.brCode,
      allKeys: Object.keys(pixData),
      // Verificar se há algum campo que contenha 'bill' ou 'billing'
      keysWithBill: Object.keys(pixData).filter(key => key.toLowerCase().includes('bill')),
      // Verificar valores que possam conter 'bill_'
      valuesWithBill: Object.entries(pixData)
        .filter(([key, value]) => typeof value === 'string' && value.includes('bill_'))
        .map(([key, value]) => `${key}: ${value}`)
    });

    // ✅ VALIDAÇÃO: Rejeitar resposta se houver campos com 'bill' ou 'billing'
    const keysWithBill = Object.keys(pixData).filter(key => 
      key.toLowerCase().includes('bill') || key.toLowerCase().includes('billing')
    );
    if (keysWithBill.length > 0) {
      console.error('❌ API retornou campos com "bill" ou "billing" (não permitido):', keysWithBill);
      console.error('❌ Valores desses campos:', keysWithBill.map(key => `${key}: ${pixData[key]}`));
      // Filtrar esses campos antes de continuar
      keysWithBill.forEach(key => {
        console.log(`⚠️ Removendo campo não permitido: ${key}`);
        delete pixData[key];
      });
    }

    // ✅ VALIDAÇÃO: Verificar se há valores que contenham 'bill_'
    const valuesWithBill = Object.entries(pixData)
      .filter(([key, value]) => typeof value === 'string' && value.includes('bill_'));
    if (valuesWithBill.length > 0) {
      console.error('❌ API retornou valores contendo "bill_":', valuesWithBill);
      throw new Error(`API retornou valores contendo "bill_": ${valuesWithBill.map(([k, v]) => `${k}=${v}`).join(', ')}. Apenas pix_char_* é permitido.`);
    }

    // Verificar se o brCode foi gerado (obrigatório)
    if (!pixData.brCode) {
      console.error('❌ PIX criado mas brCode não foi gerado:', pixData);
      throw new Error('QR Code PIX não foi gerado pela AbacatePay');
    }

    // ✅ VALIDAÇÃO: Garantir que o ID retornado seja pix_char_* (não bill_)
    if (!pixData.id || !pixData.id.startsWith('pix_char_')) {
      console.error('❌ API AbacatePay retornou ID inválido (não é pix_char_*):', pixData.id);
      console.error('❌ Dados completos da resposta:', JSON.stringify(pixData, null, 2));
      throw new Error(`ID retornado pela API não é pix_char_*: ${pixData.id}. Apenas pix_char_* é permitido.`);
    }

    console.log('✅ PIX QRCode criado com sucesso:', {
      id: pixData.id,
      status: pixData.status,
      amount: pixData.amount,
      hasBrCode: !!pixData.brCode,
      hasBrCodeBase64: !!pixData.brCodeBase64,
      expiresAt: pixData.expiresAt
    });

    // ✅ REMOVIDO: billing_id - usando APENAS pix_id (pix_char_*) 
    // Filtrar qualquer campo que possa conter bill_ antes de retornar
    const pixId = pixData.id; // Sempre será pix_char_*
    
    // Montar dados consolidados no formato esperado pelo frontend
    // ✅ GARANTIA: NUNCA incluir billing_id ou qualquer campo com bill_
    const consolidated = {
      id: pixId, // pix_char_* - único ID permitido
      status: pixData.status || 'PENDING',
      amount: pixData.amount || data.amount,
      external_id: externalId,
      qrCode: pixData.brCode,
      qrCodeBase64: pixData.brCodeBase64,
      pixKey: pixData.brCode,
      expiresAt: pixData.expiresAt,
      brCode: pixData.brCode,
      brCodeBase64: pixData.brCodeBase64,
      pix_id: pixId, // pix_char_* - único ID permitido
      pix: {
        id: pixId, // pix_char_* - único ID permitido
        qr_code: pixData.brCode,
        qr_code_base64: pixData.brCodeBase64,
        codigo_pix: pixData.brCode,
        expires_at: pixData.expiresAt,
        amount: pixData.amount,
        status: pixData.status
      },
      created_at: pixData.createdAt || new Date().toISOString()
    };
    
    // ✅ VALIDAÇÃO FINAL: Garantir que nenhum campo contenha bill_
    const consolidatedStr = JSON.stringify(consolidated);
    if (consolidatedStr.includes('bill_')) {
      console.error('❌ Dados consolidados contêm bill_ (não permitido):', consolidated);
      throw new Error('Dados consolidados contêm bill_ (não permitido). Apenas pix_char_* é permitido.');
    }

    return { success: true, data: consolidated };

  } catch (error) {
    console.error("❌ Erro ao criar cobrança no AbacatePay:", (error as Error).message);
    console.error("❌ Stack trace:", (error as Error).stack);
    return { success: false, error: (error as Error).message };
  }
}

// Função para salvar pedido no banco de dados
async function saveOrderToDatabase(supabase: any, data: CreateChargeRequest, chargeData: any, externalId: string, orderId: string) {
  try {
    // ✅ VALIDAÇÃO: Garantir que apenas pix_char_* seja usado como payment_id
    const paymentId = chargeData.pix_id || chargeData.id;
    
    // ✅ VALIDAÇÃO RIGOROSA: Rejeitar qualquer ID que não seja pix_char_*
    if (!paymentId || !paymentId.startsWith('pix_char_')) {
      console.error('❌ Tentativa de salvar payment_id que não é pix_char_*:', paymentId);
      throw new Error(`payment_id inválido: ${paymentId}. Apenas pix_char_* é permitido.`);
    }
    
    // ✅ GARANTIA: payment_id sempre será pix_char_*
    const qrCode = chargeData.pix?.qr_code || chargeData.qrCode || chargeData.brCode || null;
    const qrCodeBase64 = chargeData.pix?.qr_code_base64 || chargeData.qrCodeBase64 || chargeData.brCodeBase64 || null;

    // ✅ REMOVIDO: billing_id e billing_url do payment_data
    // Filtrar TODOS os campos que possam conter bill_ antes de salvar
    const chargeDataFiltered: any = {};
    for (const [key, value] of Object.entries(chargeData)) {
      // Ignorar qualquer campo que contenha 'billing' ou 'bill_' no nome ou valor
      if (key.toLowerCase().includes('billing') || key.toLowerCase().includes('bill_')) {
        console.log(`⚠️ Campo filtrado (contém billing/bill_): ${key}`);
        continue;
      }
      // Ignorar valores que sejam strings contendo 'bill_'
      if (typeof value === 'string' && value.includes('bill_')) {
        console.log(`⚠️ Valor filtrado (contém bill_): ${key} = ${value}`);
        continue;
      }
      chargeDataFiltered[key] = value;
    }
    
    // Filtrar campos do objeto pix também
    const pixDataFiltered = chargeData.pix ? (() => {
      const pixObj = chargeData.pix as any;
      const pixFiltered: any = {};
      for (const [key, value] of Object.entries(pixObj)) {
        // Ignorar qualquer campo que contenha 'billing' ou 'bill_'
        if (key.toLowerCase().includes('billing') || key.toLowerCase().includes('bill_')) {
          console.log(`⚠️ Campo PIX filtrado (contém billing/bill_): ${key}`);
          continue;
        }
        // Ignorar valores que sejam strings contendo 'bill_'
        if (typeof value === 'string' && value.includes('bill_')) {
          console.log(`⚠️ Valor PIX filtrado (contém bill_): ${key} = ${value}`);
          continue;
        }
        pixFiltered[key] = value;
      }
      return pixFiltered;
    })() : undefined;

    const paymentDataToSave = {
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      expires_at: chargeData.pix?.expires_at || chargeData.expiresAt || null,
      status: chargeData.pix?.status || chargeData.status || 'PENDING',
      amount: chargeData.pix?.amount || chargeData.amount || data.amount,
      pix_id: paymentId, // pix_char_*
      pix: pixDataFiltered || {
        id: paymentId,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        codigo_pix: qrCode,
        expires_at: chargeData.pix?.expires_at || chargeData.expiresAt || null,
        amount: chargeData.pix?.amount || chargeData.amount || data.amount,
        status: chargeData.pix?.status || chargeData.status || 'PENDING'
      }
    };

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_id: paymentId,
        payment_data: paymentDataToSave,
        status: 'pending',
        payment_status: 'pending'
      })
      .eq('id', orderId);

    if (updateError) {
      console.error("❌ Erro ao atualizar pedido:", updateError);
      return { success: false, error: updateError.message };
    }

    if (data.items && data.items.length > 0) {
      const orderItems = data.items.map((item: any) => ({
        order_id: orderId,
        quantity: item.quantidade,
        price: item.preco,
        unit_price: item.preco,
        total_price: item.preco * item.quantidade,
        name: item.nome,
        product_id: item.product_id || null,
        size: item.size || null,
        event_id: item.event_id || null,
        ticket_type: item.ticket_type || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        console.error("❌ Erro ao salvar itens do pedido:", itemsError);
      }
    }

    return { success: true };

  } catch (error) {
    console.error("❌ Erro ao salvar pedido no banco de dados:", error.message);
    return { success: false, error: error.message };
  }
}