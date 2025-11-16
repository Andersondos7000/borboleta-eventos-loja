// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interfaces para tipagem
interface Customer {
  name: string;
  email: string;
  phone?: string;
  document: string; // CPF
}

interface OrderItem {
  nome: string;        // Campo enviado pelo frontend
  quantidade: number;  // Campo enviado pelo frontend  
  preco: number;       // Campo enviado pelo frontend
}

interface CreateChargeRequest {
  customer: Customer;
  amount: number;
  description: string;
  items: OrderItem[];
  external_id?: string;
}

// Função para validar dados da cobrança
function validateAndFormatCPF(cpf: string): { isValid: boolean; formatted: string } {
  if (!cpf || typeof cpf !== 'string') return { isValid: false, formatted: '' }
  
  // Remove todos os caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  // Validação do algoritmo do CPF
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  return { isValid: true, formatted: cleanCPF }
}

// Função para validar campos obrigatórios
function validateRequiredFields(data: CreateChargeRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validar customer
  if (!data.customer) {
    errors.push('Campo customer é obrigatório')
  } else {
    if (!data.customer.name || data.customer.name.trim().length === 0) {
      errors.push('Nome do cliente é obrigatório')
    }
    if (!data.customer.email || !data.customer.email.includes('@')) {
      errors.push('Email válido do cliente é obrigatório')
    }
    if (!data.customer.document) {
      errors.push('CPF do cliente é obrigatório')
    } else {
      const cpfValidation = validateAndFormatCPF(data.customer.document)
      if (!cpfValidation.isValid) {
        errors.push('CPF do cliente é inválido')
      }
    }
  }
  
  // Validar amount
  if (!data.amount || data.amount <= 0) {
    errors.push('Valor da cobrança deve ser maior que zero')
  }
  
  // Validar description
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Descrição da cobrança é obrigatória')
  }
  
  // Validar items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Pelo menos um item é obrigatório')
  } else {
    data.items.forEach((item, index) => {
      if (!item.nome || item.nome.trim().length === 0) {
        errors.push(`Nome do item ${index + 1} é obrigatório`)
      }
      if (!item.quantidade || item.quantidade <= 0) {
        errors.push(`Quantidade do item ${index + 1} deve ser maior que zero`)
      }
      if (!item.preco || item.preco <= 0) {
        errors.push(`Preço do item ${index + 1} deve ser maior que zero`)
      }
    })
  }
  
  return { isValid: errors.length === 0, errors }
}

// Função para interpretar erros da API do AbacatePay
function interpretAbacatePayError(status: number, errorText: string): string {
  // Tentar fazer parse do JSON se possível
  let errorData: any = null
  try {
    errorData = JSON.parse(errorText)
  } catch {
    // Se não for JSON válido, usar o texto diretamente
  }

  // Interpretar códigos de status HTTP
  switch (status) {
    case 400:
      if (errorText.includes('Invalid taxId') || errorText.includes('taxId')) {
        return 'CPF inválido. Verifique se o CPF está correto e possui 11 dígitos.'
      }
      if (errorText.includes('returnUrl') || errorText.includes('completionUrl')) {
        return 'URLs de retorno obrigatórias estão faltando na configuração.'
      }
      if (errorText.includes('frequency')) {
        return 'Frequência de cobrança inválida. Deve ser ONE_TIME, WEEKLY ou MONTHLY.'
      }
      if (errorText.includes('amount')) {
        return 'Valor da cobrança inválido. Deve ser um número positivo em centavos.'
      }
      if (errorText.includes('email')) {
        return 'Email do cliente inválido. Verifique o formato do email.'
      }
      return `Dados da requisição inválidos: ${errorText}`
    
    case 401:
      return 'Chave de API inválida ou expirada. Verifique suas credenciais do AbacatePay.'
    
    case 403:
      return 'Acesso negado. Sua conta pode não ter permissão para esta operação.'
    
    case 404:
      return 'Endpoint não encontrado. Verifique se a URL da API está correta.'
    
    case 429:
      return 'Muitas requisições. Aguarde alguns segundos antes de tentar novamente.'
    
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Erro interno do servidor AbacatePay. Tente novamente em alguns minutos.'
    
    default:
      return `Erro da API AbacatePay (${status}): ${errorText}`
  }
}

interface AbacatePayResponse {
  id: string;
  status: string;
  amount: number;
  qrCode?: string;
  qrCodeBase64?: string;
  pixKey?: string;
  paymentUrl?: string;
  expiresAt?: string;
  // Campos específicos do billing
  billingUrl?: string;
  frequency?: string;
  methods?: string[];
  products?: any[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400', // 24 hours
}

console.log("🚀 Edge Function AbacatePay iniciada")

Deno.serve(async (req) => {
  // Handle CORS preflight requests - retornar status 200 explicitamente
  if (req.method === 'OPTIONS') {
    console.log("✅ CORS preflight request recebido")
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  console.log("📥 Requisição recebida:", req.method, req.url)
  
  try {
    // Verificar se é POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Ler e validar body
    const bodyText = await req.text()
    console.log("📄 Body length:", bodyText.length)
    
    if (!bodyText.trim()) {
      return new Response(
        JSON.stringify({ error: 'Body da requisição está vazio' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let requestData: CreateChargeRequest
    
    try {
      requestData = JSON.parse(bodyText)
      console.log("✅ JSON parsed - keys:", Object.keys(requestData))
    } catch (parseError) {
      console.error("❌ JSON parse failed:", parseError.message)
      return new Response(
        JSON.stringify({ 
          error: "JSON inválido", 
          details: parseError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Normalizar dados para compatibilidade com frontend
    const normalizedData = normalizeRequestData(requestData)
    console.log("🔄 Dados normalizados:", JSON.stringify(normalizedData, null, 2))

    console.log("🔍 Dados normalizados:", JSON.stringify(normalizedData, null, 2))
    console.log("🔍 Validação CPF:", validateAndFormatCPF(normalizedData.customer.document))
    
    // Validar dados obrigatórios
    const validation = validateRequiredFields(normalizedData)
    if (!validation.isValid) {
      console.error("❌ Dados inválidos:", validation.errors)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados inválidos', 
          details: validation.errors 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Formatar CPF após validação
    const cpfValidation = validateAndFormatCPF(normalizedData.customer.document)
    normalizedData.customer.document = cpfValidation.formatted

    // Obter variáveis de ambiente
    const apiKey = Deno.env.get('ABACATEPAY_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!apiKey || !supabaseUrl || !supabaseKey) {
      console.error("❌ Variáveis de ambiente faltando")
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Inicializar Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Gerar external_id se não fornecido
    const externalId = normalizedData.external_id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log("🆔 External ID:", externalId)

    // Criar cobrança no AbacatePay (apenas PIX QR Code)
    const abacatePayResult = await createAbacatePayPixCharge(apiKey, normalizedData, externalId)
    
    if (!abacatePayResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar cobrança', 
          details: abacatePayResult.error 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const chargeData = abacatePayResult.data

    // Salvar pedido no banco Supabase
    const orderResult = await saveOrderToDatabase(supabase, normalizedData, chargeData, externalId)
    
    if (!orderResult.success) {
      console.error("⚠️ Cobrança criada mas falha ao salvar no banco:", orderResult.error)
      // Não retornar erro aqui pois a cobrança já foi criada
    }

    // Resposta de sucesso
    const responseData = {
      success: true,
      data: {
        id: chargeData.id,
        status: chargeData.status,
        amount: chargeData.amount,
        external_id: externalId,
        pix: {
          qr_code: chargeData.qrCode,
          qr_code_base64: chargeData.qrCodeBase64,
          codigo_pix: chargeData.pixKey,
          expires_at: chargeData.expiresAt
        },
        // fluxo apenas PIX: não há payment_url/billing_url
        created_at: new Date().toISOString()
      }
    }

    console.log("✅ Cobrança criada com sucesso:", chargeData.id)
    
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error("❌ Erro geral:", error.message)
    console.error("Stack trace:", error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor", 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Função para validar dados da cobrança}

// Função para normalizar dados da requisição para compatibilidade
function normalizeRequestData(data: any): CreateChargeRequest {
  // Se já está no formato correto (com customer), retorna como está
  if (data.customer && data.amount && data.description) {
    return data as CreateChargeRequest
  }

  // Se está no formato antigo (com valor, descricao, cliente), converte
  if (data.valor && data.descricao && data.cliente) {
    return {
      customer: {
        name: data.cliente.nome || data.cliente.name,
        email: data.cliente.email,
        phone: data.cliente.telefone || data.cliente.phone,
        document: data.cliente.cpf || data.cliente.document
      },
      amount: data.valor,
      description: data.descricao,
      items: data.items || [],
      external_id: data.external_id
    }
  }

  // Retorna os dados como estão se não conseguir normalizar
  return data
}

function validateAndFormatCPF(cpf: string): { isValid: boolean; formatted: string } {
  if (!cpf || typeof cpf !== 'string') return { isValid: false, formatted: '' }
  
  // Remove todos os caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  // Validação do algoritmo do CPF
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return { isValid: false, formatted: cleanCPF }
  }
  
  return { isValid: true, formatted: cleanCPF }
}

// Função para criar cobrança no AbacatePay
async function createAbacatePayCharge(apiKey: string, data: CreateChargeRequest, externalId: string) {
  return await createAbacatePayPixCharge(apiKey, data, externalId)
  try {
    console.log("🔍 Criando cobrança no AbacatePay para", data.items.length, "itens")
    
    const payload = {
      frequency: 'ONE_TIME', // Campo obrigatório para cobrança única
      methods: ['PIX'], // Métodos de pagamento aceitos
      returnUrl: 'https://querenhapuque.com/pagamento/sucesso', // URL de retorno obrigatória
      completionUrl: 'https://querenhapuque.com/pagamento/concluido', // URL de conclusão obrigatória
      products: data.items.map(item => ({
        externalId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.nome, // Usando o campo correto do frontend
        price: Math.round(item.preco * 100), // Preço em centavos
        quantity: item.quantidade // Usando o campo correto do frontend
      })),
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        cellphone: data.customer.phone || '',
        taxId: data.customer.document
      },
      expiresIn: 3600 // 1 hora de expiração
    }

    console.log("📤 Criando cobrança no AbacatePay")
    console.log("📦 Payload:", JSON.stringify(payload, null, 2))

    // ⚠️ DEPRECATED: Esta função cria billing, mas não deve ser usada.
    // Use 'criar-cobranca-optimized' que usa apenas PIX (pix_char_*) para evitar duplicação.
    // Esta função está mantida apenas para compatibilidade com código legado.
    console.warn('⚠️ ATENÇÃO: Esta função cria billing (bill_*). Use criar-cobranca-optimized que usa apenas PIX (pix_char_*).');
    
    const response = await fetch('https://api.abacatepay.com/v1/billing/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      const friendlyError = interpretAbacatePayError(response.status, errorText)
      console.error("❌ AbacatePay Billing API error:", response.status, errorText)
      console.error("❌ Erro interpretado:", friendlyError)
      throw new Error(friendlyError)
    }

    const result = await response.json()
    console.log("✅ Cobrança criada com sucesso no AbacatePay")

    // A API do AbacatePay retorna { error: null, data: {...} }
    if (result.error) {
      throw new Error(`AbacatePay Billing API error: ${result.error}`)
    }

    // Extrair dados do campo 'data'
    const billingData = result.data
    
    console.log("🎯 Cobrança criada com ID:", billingData.id)
    console.log("⏰ Expira em:", new Date(billingData.expiresAt).toLocaleString('pt-BR'))
    console.log("🔗 URL de pagamento:", billingData.url)

    // 🚀 NOVO: Criar PIX QR Code usando a API específica
    console.log("📱 Criando PIX QR Code...")
    console.log("📦 Payload PIX:", JSON.stringify({
      amount: data.amount,
      description: data.description,
      customer: data.customer
    }, null, 2))
    
    let pixData = null
    
    try {
      const pixPayload = {
        amount: data.amount, // Valor total em centavos
        description: data.description,
        customer: {
          name: data.customer.name,
          email: data.customer.email,
          cellphone: data.customer.phone || '',
          taxId: data.customer.document
        },
        expiresIn: 3600 // 1 hora
      }

      console.log("🔑 Usando API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : 'AUSENTE')
      console.log("📤 Enviando para PIX API:", JSON.stringify(pixPayload, null, 2))

      const pixResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(pixPayload)
      })

      console.log("📥 PIX Response Status:", pixResponse.status)
      const pixResponseText = await pixResponse.text()
      console.log("📥 PIX Response Body:", pixResponseText)

      if (pixResponse.ok) {
        const pixResult = JSON.parse(pixResponseText)
        console.log("✅ PIX Result:", JSON.stringify(pixResult, null, 2))
        
        if (pixResult.data) {
          pixData = pixResult.data
          console.log("✅ PIX QR Code criado com sucesso:", pixData.id)
        } else if (pixResult.error) {
          const pixError = interpretAbacatePayError(400, JSON.stringify(pixResult.error))
          console.error("❌ Erro na API PIX:", pixResult.error)
          console.error("❌ Erro PIX interpretado:", pixError)
        }
      } else {
        const pixError = interpretAbacatePayError(pixResponse.status, pixResponseText)
        console.warn("⚠️ PIX API retornou erro:", pixResponse.status, pixResponseText)
        console.warn("⚠️ Erro PIX interpretado:", pixError)
      }
    } catch (pixError) {
      console.error("❌ Erro ao criar PIX QR Code:", pixError.message)
      console.error("❌ Stack trace:", pixError.stack)
    }
    
    console.log("🎯 Dados PIX finais:", pixData ? "Disponível" : "Não disponível")
    
    // Log detalhado sobre o status do PIX
    if (pixData) {
      console.log("✅ PIX QR Code criado com sucesso - usando dados específicos do PIX")
    } else {
      console.log("⚠️ PIX QR Code não foi criado - usando dados do billing como fallback")
      console.log("📋 Billing ID será usado como pix_id:", billingData.id)
    }
    
    return {
      success: true,
      data: {
        id: billingData.id,
        status: billingData.status || 'PENDING',
        amount: billingData.amount,
        external_id: externalId,
        // Dados PIX - priorizar dados do PIX QR Code se disponível
        qrCode: pixData?.brCode || billingData.brCode,
        qrCodeBase64: pixData?.brCodeBase64 || billingData.brCodeBase64,
        pixKey: pixData?.brCode || billingData.brCode,
        paymentUrl: billingData.url, // URL da página de pagamento
        expiresAt: pixData?.expiresAt || billingData.expiresAt,
        // Dados específicos do billing
        billingUrl: billingData.url,
        frequency: billingData.frequency || 'once',
        methods: billingData.methods || ['PIX'],
        products: data.items,
        // Adicionar dados PIX no formato esperado pelo modal
        pix: {
          id: pixData?.id || billingData.id, // Usar billing ID como fallback
          qr_code: pixData?.brCode || billingData.brCode,
          qr_code_base64: pixData?.brCodeBase64 || billingData.brCodeBase64,
          codigo_pix: pixData?.brCode || billingData.brCode,
          expires_at: pixData?.expiresAt || billingData.expiresAt,
          amount: pixData?.amount || billingData.amount,
          status: pixData?.status || 'PENDING'
        },
        // Compatibilidade com diferentes formatos
        brCode: pixData?.brCode || billingData.brCode,
        brCodeBase64: pixData?.brCodeBase64 || billingData.brCodeBase64,
        // Dados do PIX QR Code específico (se criado)
        pix_qr_code: pixData?.brCode,
        pix_qr_code_base64: pixData?.brCodeBase64,
        pix_qr_code_url: pixData?.url,
        pix_id: pixData?.id || billingData.id // Usar billing ID como fallback
      }
    }

  } catch (error) {
    console.error("❌ Erro ao criar cobrança AbacatePay:", error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Nova função: criar cobrança APENAS com PIX QR Code
async function createAbacatePayPixCharge(apiKey: string, data: CreateChargeRequest, externalId: string) {
  try {
    const pixPayload = {
      amount: data.amount,
      description: data.description,
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        cellphone: data.customer.phone || '',
        taxId: data.customer.document
      },
      expiresIn: 3600,
      metadata: { externalId }
    }

    const pixResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(pixPayload)
    })

    const pixText = await pixResponse.text()
    if (!pixResponse.ok) {
      const friendlyError = interpretAbacatePayError(pixResponse.status, pixText)
      throw new Error(friendlyError)
    }

    const pixResult = JSON.parse(pixText)
    if (pixResult.error) throw new Error(JSON.stringify(pixResult.error))
    const pixData = pixResult.data
    if (!pixData?.id || !pixData?.brCode) throw new Error('Resposta PIX inválida (id/brCode ausentes)')

    return {
      success: true,
      data: {
        id: pixData.id,
        status: pixData.status || 'PENDING',
        amount: pixData.amount || data.amount,
        external_id: externalId,
        qrCode: pixData.brCode,
        qrCodeBase64: pixData.brCodeBase64,
        pixKey: pixData.brCode,
        expiresAt: pixData.expiresAt,
        pix: {
          id: pixData.id,
          qr_code: pixData.brCode,
          qr_code_base64: pixData.brCodeBase64,
          codigo_pix: pixData.brCode,
          expires_at: pixData.expiresAt,
          amount: pixData.amount || data.amount,
          status: pixData.status || 'PENDING'
        },
        brCode: pixData.brCode,
        brCodeBase64: pixData.brCodeBase64,
        pix_qr_code: pixData.brCode,
        pix_qr_code_base64: pixData.brCodeBase64,
        pix_id: pixData.id
      }
    }
  } catch (error) {
    console.error("❌ Erro ao criar PIX AbacatePay:", (error as Error).message)
    return {
      success: false,
      error: (error as Error).message
    }
  }
}

// Função para salvar pedido no banco
async function saveOrderToDatabase(supabase: any, data: CreateChargeRequest, chargeData: AbacatePayResponse, externalId: string) {
  try {
    // Mapear dados para o schema da tabela orders
    const orderData = {
      external_id: externalId,
      payment_id: chargeData.pix_id || chargeData.id, // ✅ CORREÇÃO: Usar pix_id (pix_char_xxx) em vez de billing_id (bill_xxx)
      payment_status: 'pending',
      total_amount: data.amount,
      customer_email: data.customer.email,
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      customer_document: data.customer.document,
      customer_data: data.customer,
      items: data.items,
      payment_method: 'pix',
      status: 'pending'
    }

    console.log("💾 Salvando pedido no banco:", externalId)
    console.log("🔍 IDs disponíveis - Billing ID:", chargeData.id, "PIX ID:", chargeData.pix_id)
    console.log("✅ Payment ID escolhido:", chargeData.pix_id || chargeData.id)
    console.log("📋 Dados do pedido:", JSON.stringify(orderData, null, 2))

    const { data: insertedOrders, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()

    if (error) {
      console.error("❌ Erro ao salvar no banco:", error.message)
      console.error("❌ Código do erro:", error.code)
      console.error("❌ Detalhes:", error.details)
      return {
        success: false,
        error: error.message
      }
    }

    // Verificar se a inserção foi bem-sucedida
    if (!insertedOrders || insertedOrders.length === 0) {
      console.error("❌ Nenhum pedido foi inserido")
      return {
        success: false,
        error: "Nenhum pedido foi inserido"
      }
    }

    const insertedOrder = insertedOrders[0]
    console.log("✅ Pedido salvo no banco:", insertedOrder.id)
    return {
      success: true,
      data: insertedOrder
    }

  } catch (error) {
    console.error("❌ Erro ao salvar pedido:", error.message)
    console.error("❌ Stack trace:", error.stack)
    return {
      success: false,
      error: error.message
    }
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/criar-cobranca' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
