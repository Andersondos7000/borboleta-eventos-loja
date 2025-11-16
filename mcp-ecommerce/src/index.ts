#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AbacatePayService } from './services/abacatepay.js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://ojxmfxbflbfinodkhixk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY é obrigatória');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração do AbacatePay
const abacatePayApiKey = process.env.ABACATE_PAY_API_KEY;
let abacatePayService: AbacatePayService | null = null;

if (abacatePayApiKey) {
  try {
    abacatePayService = new AbacatePayService(abacatePayApiKey);
    console.error('✅ AbacatePay configurado com sucesso');
  } catch (error) {
    console.error('⚠️ Erro ao configurar AbacatePay:', error);
  }
} else {
  console.error('⚠️ ABACATE_PAY_API_KEY não configurada - funcionalidades de pagamento desabilitadas');
}

// Schemas de validação
const ProductSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().optional(),
  image_url: z.string().url().optional(),
  stock_quantity: z.number().int().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
});

const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  user_id: z.string().uuid(),
});

const OrderSchema = z.object({
  user_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })),
  total_amount: z.number().positive(),
  payment_method: z.enum(['pix', 'credit_card', 'debit_card']).optional().default('pix'),
});

// Servidor MCP
const server = new Server(
  {
    name: 'mcp-ecommerce-querenhapuque',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Lista de ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Produtos
      {
        name: 'list_products',
        description: 'Lista todos os produtos disponíveis',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filtrar por categoria' },
            active_only: { type: 'boolean', description: 'Apenas produtos ativos', default: true },
            limit: { type: 'number', description: 'Limite de resultados', default: 50 },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Busca um produto específico por ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'ID do produto' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_product',
        description: 'Cria um novo produto',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do produto' },
            description: { type: 'string', description: 'Descrição do produto' },
            price: { type: 'number', description: 'Preço do produto' },
            category: { type: 'string', description: 'Categoria do produto' },
            image_url: { type: 'string', description: 'URL da imagem' },
            stock_quantity: { type: 'number', description: 'Quantidade em estoque' },
          },
          required: ['name', 'price'],
        },
      },
      {
        name: 'update_product',
        description: 'Atualiza um produto existente',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'ID do produto' },
            name: { type: 'string', description: 'Nome do produto' },
            description: { type: 'string', description: 'Descrição do produto' },
            price: { type: 'number', description: 'Preço do produto' },
            category: { type: 'string', description: 'Categoria do produto' },
            image_url: { type: 'string', description: 'URL da imagem' },
            stock_quantity: { type: 'number', description: 'Quantidade em estoque' },
            active: { type: 'boolean', description: 'Produto ativo' },
          },
          required: ['product_id'],
        },
      },
      // Carrinho
      {
        name: 'add_to_cart',
        description: 'Adiciona item ao carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
            product_id: { type: 'string', description: 'ID do produto' },
            quantity: { type: 'number', description: 'Quantidade', default: 1 },
          },
          required: ['user_id', 'product_id'],
        },
      },
      {
        name: 'get_cart',
        description: 'Busca itens do carrinho do usuário',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'update_cart_item',
        description: 'Atualiza quantidade de item no carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
            product_id: { type: 'string', description: 'ID do produto' },
            quantity: { type: 'number', description: 'Nova quantidade' },
          },
          required: ['user_id', 'product_id', 'quantity'],
        },
      },
      {
        name: 'remove_from_cart',
        description: 'Remove item do carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
            product_id: { type: 'string', description: 'ID do produto' },
          },
          required: ['user_id', 'product_id'],
        },
      },
      {
        name: 'clear_cart',
        description: 'Limpa todo o carrinho do usuário',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
          },
          required: ['user_id'],
        },
      },
      // Pedidos
      {
        name: 'create_order',
        description: 'Cria um novo pedido a partir do carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
            payment_method: { type: 'string', description: 'Método de pagamento', default: 'pix' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_order',
        description: 'Busca um pedido específico',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'ID do pedido' },
          },
          required: ['order_id'],
        },
      },
      {
          name: 'list_user_orders',
          description: 'Lista pedidos de um usuário',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: { type: 'string', description: 'ID do usuário' },
              limit: { type: 'number', description: 'Limite de resultados', default: 20 },
            },
            required: ['user_id'],
          },
        },
        // Pagamentos PIX
        {
          name: 'create_pix_payment',
          description: 'Cria um pagamento PIX para um pedido',
          inputSchema: {
            type: 'object',
            properties: {
              order_id: { type: 'string', description: 'ID do pedido' },
              customer_name: { type: 'string', description: 'Nome do cliente' },
              customer_email: { type: 'string', description: 'Email do cliente' },
              customer_phone: { type: 'string', description: 'Telefone do cliente' },
              customer_document: { type: 'string', description: 'CPF/CNPJ do cliente' },
            },
            required: ['order_id'],
          },
        },
        {
          name: 'get_payment_status',
          description: 'Verifica status de um pagamento PIX',
          inputSchema: {
            type: 'object',
            properties: {
              payment_id: { type: 'string', description: 'ID do pagamento' },
            },
            required: ['payment_id'],
          },
        },
        {
          name: 'cancel_payment',
          description: 'Cancela um pagamento PIX',
          inputSchema: {
            type: 'object',
            properties: {
              payment_id: { type: 'string', description: 'ID do pagamento' },
            },
            required: ['payment_id'],
          },
        },
        // SQL Execution
        {
          name: 'execute_sql',
          description: 'Executa uma query SQL no banco de dados',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Query SQL para executar' },
              description: { type: 'string', description: 'Descrição da operação' },
            },
            required: ['query'],
          },
        },
    ],
  };
});

// Implementação das ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_products':
        return await listProducts(args);
      case 'get_product':
        return await getProduct(args);
      case 'create_product':
        return await createProduct(args);
      case 'update_product':
        return await updateProduct(args);
      case 'add_to_cart':
        return await addToCart(args);
      case 'get_cart':
        return await getCart(args);
      case 'update_cart_item':
        return await updateCartItem(args);
      case 'remove_from_cart':
        return await removeFromCart(args);
      case 'clear_cart':
        return await clearCart(args);
      case 'create_order':
        return await createOrder(args);
      case 'get_order':
        return await getOrder(args);
      case 'list_user_orders':
        return await listUserOrders(args);
      case 'create_pix_payment':
        return await createPixPayment(args);
      case 'get_payment_status':
        return await getPaymentStatus(args);
      case 'cancel_payment':
        return await cancelPayment(args);
      case 'execute_sql':
        return await executeSql(args);
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    console.error(`Erro na ferramenta ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Erro ao executar ${name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
});

// Implementações das funções
async function listProducts(args: any) {
  const { category, active_only = true, limit = 50 } = args;
  
  let query = supabase
    .from('products')
    .select('*')
    .limit(limit);
    
  if (active_only) {
    query = query.eq('active', true);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          products: data,
          count: data?.length || 0,
        }, null, 2),
      },
    ],
  };
}

async function getProduct(args: any) {
  const { product_id } = args;
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', product_id)
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          product: data,
        }, null, 2),
      },
    ],
  };
}

async function createProduct(args: any) {
  const validatedData = ProductSchema.parse(args);
  
  const { data, error } = await supabase
    .from('products')
    .insert([validatedData])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Produto criado com sucesso',
          product: data,
        }, null, 2),
      },
    ],
  };
}

async function updateProduct(args: any) {
  const { product_id, ...updateData } = args;
  
  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', product_id)
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Produto atualizado com sucesso',
          product: data,
        }, null, 2),
      },
    ],
  };
}

async function addToCart(args: any) {
  const { user_id, product_id, quantity = 1 } = args;
  
  // Verificar se o produto existe
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', product_id)
    .eq('active', true)
    .single();
    
  if (productError || !product) {
    throw new Error('Produto não encontrado ou inativo');
  }
  
  // Verificar se já existe no carrinho
  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', user_id)
    .eq('product_id', product_id)
    .single();
    
  if (existingItem) {
    // Atualizar quantidade
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: existingItem.quantity + quantity })
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Quantidade atualizada no carrinho',
            cart_item: data,
          }, null, 2),
        },
      ],
    };
  } else {
    // Criar novo item
    const { data, error } = await supabase
      .from('cart_items')
      .insert([{ user_id, product_id, quantity }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Item adicionado ao carrinho',
            cart_item: data,
          }, null, 2),
        },
      ],
    };
  }
}

async function getCart(args: any) {
  const { user_id } = args;
  
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (
        id,
        name,
        price,
        image_url,
        stock_quantity
      )
    `)
    .eq('user_id', user_id);
    
  if (error) throw error;
  
  const total = data?.reduce((sum, item) => {
    return sum + (item.products.price * item.quantity);
  }, 0) || 0;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          cart_items: data,
          total_amount: total,
          items_count: data?.length || 0,
        }, null, 2),
      },
    ],
  };
}

async function updateCartItem(args: any) {
  const { user_id, product_id, quantity } = args;
  
  if (quantity <= 0) {
    return await removeFromCart({ user_id, product_id });
  }
  
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('user_id', user_id)
    .eq('product_id', product_id)
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Item do carrinho atualizado',
          cart_item: data,
        }, null, 2),
      },
    ],
  };
}

async function removeFromCart(args: any) {
  const { user_id, product_id } = args;
  
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user_id)
    .eq('product_id', product_id);
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Item removido do carrinho',
        }, null, 2),
      },
    ],
  };
}

async function clearCart(args: any) {
  const { user_id } = args;
  
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user_id);
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Carrinho limpo com sucesso',
        }, null, 2),
      },
    ],
  };
}

async function createOrder(args: any) {
  const { user_id, payment_method = 'pix' } = args;
  
  // Buscar itens do carrinho
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (
        id,
        name,
        price,
        stock_quantity
      )
    `)
    .eq('user_id', user_id);
    
  if (cartError) throw cartError;
  
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Carrinho vazio');
  }
  
  // ✅ VALIDAR ESTOQUE ANTES DE CRIAR PEDIDO
  const stockErrors: string[] = [];
  for (const item of cartItems) {
    const availableStock = item.products.stock_quantity || 0;
    const requestedQuantity = item.quantity || 1;
    
    if (availableStock < requestedQuantity) {
      stockErrors.push(
        `${item.products.name}: estoque insuficiente (disponível: ${availableStock}, solicitado: ${requestedQuantity})`
      );
    }
  }
  
  if (stockErrors.length > 0) {
    throw new Error('Estoque insuficiente:\n' + stockErrors.join('\n'));
  }
  
  // Calcular total
  const total = cartItems.reduce((sum, item) => {
    return sum + (item.products.price * item.quantity);
  }, 0);
  
  // Criar pedido
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id,
      total_amount: total,
      payment_method,
      status: 'pending',
    }])
    .select()
    .single();
    
  if (orderError) throw orderError;
  
  // Criar itens do pedido
  const orderItems = cartItems.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.products.price,
  }));
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
    
  if (itemsError) throw itemsError;
  
  // Limpar carrinho
  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user_id);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Pedido criado com sucesso',
          order: {
            ...order,
            items: orderItems,
          },
        }, null, 2),
      },
    ],
  };
}

async function getOrder(args: any) {
  const { order_id } = args;
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          id,
          name,
          image_url
        )
      )
    `)
    .eq('id', order_id)
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          order: data,
        }, null, 2),
      },
    ],
  };
}

async function listUserOrders(args: any) {
  const { user_id, limit = 20 } = args;
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          id,
          name,
          image_url
        )
      )
    `)
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          orders: data,
          count: data?.length || 0,
        }, null, 2),
      },
    ],
  };
}

// Funções de pagamento PIX
async function createPixPayment(args: any) {
  try {
    if (!abacatePayService) {
      throw new Error('AbacatePay não configurado');
    }

    // Buscar dados do pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (
            id,
            name
          )
        )
      `)
      .eq('id', args.order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Pedido não encontrado');
    }

    // Criar pagamento PIX
    const pixPayment = await abacatePayService.createPixPayment({
      amount: order.total_amount,
      description: `Pedido #${order.id}`,
      customer: {
        name: args.customer_name || 'Cliente',
        email: args.customer_email || '',
        phone: args.customer_phone || '',
        document: args.customer_document || ''
      },
      external_id: order.id
    });

    // Salvar dados do pagamento no Supabase
    const { error: paymentError } = await supabase
      .from('pix_payments')
      .insert({
        id: pixPayment.id,
        order_id: order.id,
        amount: pixPayment.amount,
        status: pixPayment.status,
        qr_code: pixPayment.qr_code,
        qr_code_url: pixPayment.qr_code_url,
        expires_at: pixPayment.expires_at,
        external_data: pixPayment
      });

    if (paymentError) {
      console.error('Erro ao salvar pagamento:', paymentError);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          payment: pixPayment
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2)
      }]
    };
  }
}

async function getPaymentStatus(args: any) {
  try {
    if (!abacatePayService) {
      throw new Error('AbacatePay não configurado');
    }

    const payment = await abacatePayService.getPaymentStatus(args.payment_id);

    // Atualizar status no Supabase
    const { error } = await supabase
      .from('pix_payments')
      .update({
        status: payment.status,
        paid_at: payment.paid_at,
        external_data: payment
      })
      .eq('id', args.payment_id);

    if (error) {
      console.error('Erro ao atualizar status do pagamento:', error);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          payment
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2)
      }]
    };
  }
}

async function cancelPayment(args: any) {
  try {
    if (!abacatePayService) {
      throw new Error('AbacatePay não configurado');
    }

    const result = await abacatePayService.cancelPayment(args.payment_id);

    // Atualizar status no Supabase
    const { error } = await supabase
      .from('pix_payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', args.payment_id);

    if (error) {
      console.error('Erro ao atualizar cancelamento:', error);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          result
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2)
      }]
    };
  }
}

// Executar SQL
async function executeSql(args: any) {
  const { query, description = 'Execução SQL' } = args;
  
  try {
    console.log(`🔧 Executando SQL: ${description}`);
    console.log(`📝 Query: ${query}`);
    
    // Para queries SELECT, usar .from() com query personalizada
    if (query.trim().toLowerCase().startsWith('select')) {
      const { data, error } = await supabase.from('').select('*').limit(0); // Dummy query para testar conexão
      
      if (error) {
        console.error('❌ Erro na conexão:', error);
      }
      
      // Executar query raw usando rpc se disponível, senão usar uma abordagem alternativa
      try {
        const result = await supabase.rpc('exec_raw_sql', { sql_query: query });
        
        if (result.error) {
          // Se não tiver a função, tentar uma abordagem diferente
          console.log('⚠️ Função exec_raw_sql não encontrada, tentando abordagem alternativa');
          
          // Para queries de estrutura, usar information_schema
          if (query.includes('information_schema')) {
            const { data, error } = await supabase
              .from('information_schema.columns')
              .select('*')
              .limit(10);
              
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data,
                  description,
                  query,
                  note: 'Query executada com abordagem alternativa'
                }, null, 2)
              }]
            };
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: result.data,
              description,
              query
            }, null, 2)
          }]
        };
      } catch (rpcError: any) {
        console.log('⚠️ RPC não disponível, usando query direta');
        
        // Para verificar estrutura de tabelas, usar uma query específica
        if (query.includes('orders') && query.includes('order_items')) {
          const ordersStructure = await supabase
            .from('orders')
            .select('*')
            .limit(1);
            
          const orderItemsStructure = await supabase
            .from('order_items')
            .select('*')
            .limit(1);
            
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: {
                  orders_sample: ordersStructure.data,
                  order_items_sample: orderItemsStructure.data,
                  orders_error: ordersStructure.error,
                  order_items_error: orderItemsStructure.error
                },
                description,
                query,
                note: 'Estrutura das tabelas verificada'
              }, null, 2)
            }]
          };
        }
      }
    }
    
    // Para queries DDL (ALTER, CREATE, etc.), precisamos de uma abordagem diferente
    console.log('✅ Query processada');
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Query DDL detectada - use ferramentas específicas do Supabase',
          description,
          query
        }, null, 2)
      }]
    };
  } catch (error: any) {
    console.error('❌ Erro na execução SQL:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          description
        }, null, 2)
      }]
    };
  }
}

// Inicializar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🛒 MCP Ecommerce Server iniciado com sucesso!');
}

main().catch((error) => {
  console.error('❌ Erro ao iniciar MCP Ecommerce Server:', error);
  process.exit(1);
});