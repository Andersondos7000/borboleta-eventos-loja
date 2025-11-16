import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Armazenamento local para valores de cobrança (em produção, usar banco de dados)
const billingStorage = new Map();

// Carregar variáveis de ambiente do .env e .env.backend
const envFiles = ['.env', '.env.backend'];
envFiles.forEach(envFile => {
  const envPath = join(__dirname, envFile);
  try {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.warn(`⚠️ Não foi possível carregar ${envFile}:`, error.message);
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AbacatePay Backend'
  });
});

// Endpoint para extrair dados PIX via MCP
app.post('/mcp/extractPixData', async (req, res) => {
  try {
    const { apiKey, billingId, customerData } = req.body;

    if (!apiKey || !billingId || !customerData) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: apiKey, billingId, customerData'
      });
    }

    console.log('🔍 Recebida solicitação de extração PIX:', { billingId, customerName: customerData.name });

    // Chamar o MCP AbacatePay para extrair dados PIX
    // Assumindo que o MCP está rodando na porta padrão
    const mcpUrl = process.env.MCP_ABACATEPAY_URL || 'http://localhost:3002';
    
    const mcpResponse = await fetch(`${mcpUrl}/tools/extractPixDataFromPaymentPage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey,
        billingId,
        customerData
      })
    });

    if (!mcpResponse.ok) {
      throw new Error(`MCP Error: ${mcpResponse.status} - ${mcpResponse.statusText}`);
    }

    const mcpResult = await mcpResponse.json();
    
    if (mcpResult.success) {
      console.log('✅ Dados PIX extraídos com sucesso via MCP');
      return res.json({
        success: true,
        data: mcpResult.data
      });
    } else {
      console.log('❌ Erro no MCP:', mcpResult.error);
      return res.status(500).json({
        success: false,
        error: mcpResult.error || 'Erro ao extrair dados PIX'
      });
    }

  } catch (error) {
    console.error('❌ Erro no endpoint extractPixData:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// Endpoint para criar cobrança PIX (alinhado ao fluxo otimizado)
app.post('/api/abacatepay/criar-cobranca', async (req, res) => {
  console.log('📦 Recebendo requisição para criar cobrança:', req.body);
  try {
    console.log('📝 Criando cobrança AbacatePay via Supabase (optimized):', {
      amount: req.body.amount || req.body.total || req.body.valor,
      cliente: (req.body.cliente?.nome || req.body.customer?.name),
      items: req.body.items?.length
    });

    console.log('🔧 Debug - Body completo da requisição:', JSON.stringify(req.body, null, 2));

    // Chamar função Supabase criar-cobranca-optimized
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔧 Debug - Variáveis de ambiente:', {
      supabaseUrl: supabaseUrl ? 'DEFINIDA' : 'UNDEFINED',
      supabaseServiceKey: supabaseServiceKey ? 'DEFINIDA' : 'UNDEFINED',
      fullUrl: `${supabaseUrl}/functions/v1/criar-cobranca-optimized`
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    // Criar instância do Supabase (para futuras operações, se necessário)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar cliente (suporta tanto formato antigo 'cliente' quanto novo 'customer')
    const clienteInfo = req.body.cliente || req.body.customer;
    if (!clienteInfo) {
      throw new Error('Dados do cliente são obrigatórios');
    }

    // Limpar CPF/taxId removendo caracteres não numéricos
    const cpfOriginal = clienteInfo.cpf || clienteInfo.taxId || clienteInfo.document;
    const cpfLimpo = cpfOriginal ? cpfOriginal.replace(/\D/g, '') : '';

    console.log('🔧 Debug CPF - Original:', cpfOriginal);
    console.log('🔧 Debug CPF - Limpo:', cpfLimpo);
    console.log('🔧 Debug CPF - Tamanho:', cpfLimpo.length);

    // Montar payload no formato esperado pela Edge Function otimizada
    const payload = {
      amount: req.body.amount || req.body.total || req.body.valor,
      description: req.body.description || req.body.descricao || 'Cobrança via sistema',
      external_id: req.body.external_id || req.body.externalId,
      customer: {
        name: clienteInfo.nome || clienteInfo.name,
        email: clienteInfo.email,
        phone: clienteInfo.telefone || clienteInfo.phone,
        document: cpfLimpo
      },
      items: Array.isArray(req.body.items) ? req.body.items : []
    };

    // Gerar chave de idempotência baseada nos dados críticos da requisição
    const crypto = await import('crypto');
    const idempotencyKeyBase = JSON.stringify({
      amount: payload.amount,
      customer: { name: payload.customer.name, email: payload.customer.email, document: payload.customer.document },
      external_id: payload.external_id,
      items_hash: Array.isArray(payload.items) ? payload.items.map(i => `${i.nome||i.name}-${i.quantidade||i.quantity}-${i.preco||i.unit_price}`).join('|') : ''
    });
    const idempotencyKey = crypto.createHash('sha256').update(idempotencyKeyBase).digest('hex');

    console.log('🔑 Chave de idempotência gerada:', idempotencyKey);

    const response = await fetch(`${supabaseUrl}/functions/v1/criar-cobranca-optimized`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na função Supabase (optimized):', errorData);
      throw new Error(`Erro na função Supabase: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('✅ Resposta completa da função Supabase (optimized):', JSON.stringify(responseData, null, 2));

    // A resposta pode vir diretamente ou dentro de responseData.data
    let cobrancaData = responseData.data || responseData;
    
    // ✅ FILTRAGEM EXPLÍCITA: Remover TODOS os campos que contenham 'billing' ou 'bill_' da resposta
    cobrancaData = Object.fromEntries(
      Object.entries(cobrancaData).filter(([key, value]) => {
        // Filtrar campos com 'billing' ou 'bill_' no nome
        if (key.toLowerCase().includes('billing') || key.toLowerCase().includes('bill_')) {
          console.log(`⚠️ Campo filtrado no server.js (contém billing/bill_): ${key}`);
          return false;
        }
        // Filtrar valores que sejam strings contendo 'bill_'
        if (typeof value === 'string' && value.includes('bill_')) {
          console.log(`⚠️ Valor filtrado no server.js (contém bill_): ${key} = ${value}`);
          return false;
        }
        // Se o valor for um objeto, filtrar recursivamente
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const filteredValue = Object.fromEntries(
            Object.entries(value).filter(([subKey, subValue]) => {
              if (subKey.toLowerCase().includes('billing') || subKey.toLowerCase().includes('bill_')) {
                console.log(`⚠️ Campo filtrado no server.js (objeto aninhado): ${key}.${subKey}`);
                return false;
              }
              if (typeof subValue === 'string' && subValue.includes('bill_')) {
                console.log(`⚠️ Valor filtrado no server.js (objeto aninhado): ${key}.${subKey} = ${subValue}`);
                return false;
              }
              return true;
            })
          );
          return [key, filteredValue];
        }
        return true;
      })
    );
    
    // ✅ CORREÇÃO: Validar que o ID seja pix_char_* (não permitir bill_)
    // A Edge Function criar-cobranca-optimized SEMPRE retorna pix_char_*
    const paymentId = cobrancaData.pix_id || cobrancaData.id;
    
    if (!paymentId || !paymentId.startsWith('pix_char_')) {
      console.error('❌ Resposta inválida da API - ID não é pix_char_*:', {
        paymentId,
        cobrancaData: JSON.stringify(cobrancaData, null, 2),
        responseData: JSON.stringify(responseData, null, 2)
      });
      throw new Error('Resposta inválida da API AbacatePay: ID deve ser pix_char_*');
    }
    
    if (!cobrancaData || !cobrancaData.status) {
      console.error('❌ Resposta inválida da API - dados:', responseData);
      throw new Error('Resposta inválida da API AbacatePay');
    }
    
    console.log('🔧 Debug - Dados da cobrança (após filtragem):', JSON.stringify(cobrancaData, null, 2));
    
    // ✅ VALIDAÇÃO FINAL: Garantir que a resposta não contenha 'bill_'
    const cobrancaDataStr = JSON.stringify(cobrancaData);
    if (cobrancaDataStr.includes('bill_')) {
      console.error('❌ Resposta filtrada ainda contém "bill_" (não permitido):', cobrancaData);
      throw new Error('Resposta contém "bill_" (não permitido). Apenas pix_char_* é permitido.');
    }
    
    // Mapear resposta da API AbacatePay para o formato esperado pelo frontend
    // A API retorna 'url' que é o link de pagamento PIX
    const pixUrl = cobrancaData.pix?.qr_code || cobrancaData.qrCode || cobrancaData.brCode || cobrancaData.url || cobrancaData.pix?.qr_code_url || 'mock-pix-url';
    
    // ✅ CORREÇÃO: NUNCA gerar bill_ - usar apenas pix_char_* retornado pela API
    console.log('✅ Cobrança criada com sucesso via AbacatePay (pix_char_*):', paymentId);
    
    // Armazenar valor da cobrança para uso posterior na simulação (usando pix_char_* como chave)
    billingStorage.set(paymentId, {
      amount: cobrancaData.amount || amount,
      created_at: new Date().toISOString()
    });
    
    // ✅ RETORNO FINAL: Retornar apenas campos permitidos (sem billing_id ou billing_url)
    const response = {
      id: paymentId, // Sempre pix_char_*
      status: cobrancaData.status?.toLowerCase() || 'pending',
      amount: cobrancaData.amount,
      external_id: cobrancaData.external_id,
      pix: {
        id: cobrancaData.pix?.id || paymentId,
        qr_code: pixUrl,
        qr_code_url: pixUrl,
        qr_code_base64: cobrancaData.pix?.qr_code_base64 || cobrancaData.pix?.brCodeBase64,
        codigo_pix: cobrancaData.pix?.codigo_pix || cobrancaData.pix?.qr_code,
        expires_at: cobrancaData.pix?.expires_at || cobrancaData.pix?.expiresAt || cobrancaData.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        amount: cobrancaData.pix?.amount || cobrancaData.amount,
        status: cobrancaData.pix?.status || cobrancaData.status
      },
      created_at: cobrancaData.created_at || new Date().toISOString()
    };
    
    // ✅ VALIDAÇÃO FINAL: Garantir que a resposta não contenha 'bill_'
    const responseStr = JSON.stringify(response);
    if (responseStr.includes('bill_')) {
      console.error('❌ Resposta final contém "bill_" (não permitido):', response);
      throw new Error('Resposta final contém "bill_" (não permitido). Apenas pix_char_* é permitido.');
    }
    
    res.json(response);

  } catch (error) {
    console.error('❌ Erro interno ao criar cobrança:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Endpoint para consultar cobrança
app.get('/api/abacatepay/consultar-cobranca/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Consultando cobrança:', id);

    // Simular resposta da consulta
    const mockResponse = {
      id: id,
      status: 'pending',
      valor: 1000,
      valorFormatado: 'R$ 10,00',
      descricao: 'Pedido de teste',
      created_at: new Date().toISOString()
    };

    console.log('✅ Cobrança consultada:', mockResponse.status);
    res.json(mockResponse);

  } catch (error) {
    console.error('❌ Erro interno ao consultar cobrança:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Endpoint para simular pagamento
app.post('/api/abacatepay/simular-pagamento', async (req, res) => {
  try {
    const { billingId } = req.body;
    
    console.log('💰 Simulando pagamento para cobrança:', billingId);

    if (!billingId) {
      return res.status(400).json({
        erro: 'billingId é obrigatório'
      });
    }

    // Configurar Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Recuperar valor armazenado da cobrança
    const storedBilling = billingStorage.get(billingId);
    const billingAmount = storedBilling?.amount || 659; // Valor padrão se não encontrado
    
    console.log('💰 Valor recuperado para cobrança:', billingId, '=', billingAmount);
    
    // Simular pagamento localmente (sem depender da Edge Function)
    console.log('🔧 Simulando pagamento localmente com valor:', billingAmount);
    
    const simulationData = {
      id: billingId,
      status: 'paid',
      amount: billingAmount,
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      description: 'Pagamento simulado com sucesso'
    };
    
    console.log('✅ Pagamento simulado com sucesso:', simulationData);
    
    res.json({
      id: simulationData.id,
      status: simulationData.status,
      valor: simulationData.amount,
      valorFormatado: `R$ ${(simulationData.amount / 100).toFixed(2).replace('.', ',')}`,
      descricao: 'Pagamento simulado com sucesso',
      paid_at: simulationData.updatedAt,
      expires_at: simulationData.expiresAt
    });

  } catch (error) {
    console.error('❌ Erro interno ao simular pagamento:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    path: req.path
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 Servidor AbacatePay iniciado!');
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`💰 Criar Cobrança: POST http://localhost:${PORT}/api/abacatepay/criar-cobranca`);
  console.log(`🔍 Consultar Cobrança: GET http://localhost:${PORT}/api/abacatepay/consultar-cobranca/:id`);
  console.log(`💳 Simular Pagamento: POST http://localhost:${PORT}/api/abacatepay/simular-pagamento`);
  console.log('');
  console.log('⚠️  Usando dados simulados para teste');
});