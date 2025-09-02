#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ojxmfxbflbfinodkhixk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

// Cliente Supabase com service role para operações administrativas
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Schemas de validação
const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().optional(),
  image_url: z.string().url().optional(),
  sizes: z.array(z.string()).optional(),
  in_stock: z.boolean().default(true),
});

const CartItemSchema = z.object({
  user_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  ticket_id: z.string().uuid().optional(),
  quantity: z.number().positive(),
  size: z.string().optional(),
  unit_price: z.number().positive().optional(),
});

const OrderSchema = z.object({
  customer_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).default('pending'),
  payment_method: z.enum(['pix', 'credit_card', 'debit_card', 'bank_slip', 'cash']).optional(),
  payment_provider: z.string().default('abacatepay'),
  subtotal: z.number().nonnegative().default(0),
  discount_amount: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  shipping_amount: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().default(0),
});

const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zip_code: z.string(),
    country: z.string().default('Brasil'),
  }).optional(),
});

// Servidor MCP
const server = new Server(
  {
    name: 'ecommerce-supabase-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Função auxiliar para logging
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [MCP E-commerce] ${message}`;
  console.error(logMessage, data ? JSON.stringify(data, null, 2) : '');
  console.log(logMessage, data ? JSON.stringify(data, null, 2) : '');
}

// Função auxiliar para tratamento de erros
function handleError(error: any, operation: string): never {
  log(`Erro em ${operation}:`, error);
  throw new McpError(
    ErrorCode.InternalError,
    `Erro ao executar ${operation}: ${error.message || error}`
  );
}

// Lista de ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Produtos
      {
        name: 'list_products',
        description: 'Lista todos os produtos disponíveis na loja',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filtrar por categoria' },
            in_stock: { type: 'boolean', description: 'Filtrar apenas produtos em estoque' },
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
            id: { type: 'string', description: 'ID do produto' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_product',
        description: 'Cria um novo produto na loja',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do produto' },
            description: { type: 'string', description: 'Descrição do produto' },
            price: { type: 'number', description: 'Preço do produto' },
            category: { type: 'string', description: 'Categoria do produto' },
            image_url: { type: 'string', description: 'URL da imagem do produto' },
            sizes: { type: 'array', items: { type: 'string' }, description: 'Tamanhos disponíveis' },
            in_stock: { type: 'boolean', description: 'Se o produto está em estoque' },
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
            id: { type: 'string', description: 'ID do produto' },
            name: { type: 'string', description: 'Nome do produto' },
            description: { type: 'string', description: 'Descrição do produto' },
            price: { type: 'number', description: 'Preço do produto' },
            category: { type: 'string', description: 'Categoria do produto' },
            image_url: { type: 'string', description: 'URL da imagem do produto' },
            sizes: { type: 'array', items: { type: 'string' }, description: 'Tamanhos disponíveis' },
            in_stock: { type: 'boolean', description: 'Se o produto está em estoque' },
          },
          required: ['id'],
        },
      },
      
      // Carrinho
      {
        name: 'get_cart',
        description: 'Busca itens do carrinho de um usuário',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'add_to_cart',
        description: 'Adiciona um item ao carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'ID do usuário' },
            product_id: { type: 'string', description: 'ID do produto' },
            ticket_id: { type: 'string', description: 'ID do ingresso' },
            quantity: { type: 'number', description: 'Quantidade' },
            size: { type: 'string', description: 'Tamanho do produto' },
          },
          required: ['user_id', 'quantity'],
        },
      },
      {
        name: 'update_cart_item',
        description: 'Atualiza quantidade de um item no carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do item no carrinho' },
            quantity: { type: 'number', description: 'Nova quantidade' },
          },
          required: ['id', 'quantity'],
        },
      },
      {
        name: 'remove_from_cart',
        description: 'Remove um item do carrinho',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do item no carrinho' },
          },
          required: ['id'],
        },
      },
      
      // Pedidos
      {
        name: 'list_orders',
        description: 'Lista pedidos com filtros opcionais',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'Filtrar por cliente' },
            status: { type: 'string', description: 'Filtrar por status' },
            limit: { type: 'number', description: 'Limite de resultados', default: 50 },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Busca um pedido específico por ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do pedido' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_order',
        description: 'Cria um novo pedido',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'ID do cliente' },
            user_id: { type: 'string', description: 'ID do usuário' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'string' },
                  ticket_id: { type: 'string' },
                  quantity: { type: 'number' },
                  size: { type: 'string' },
                  unit_price: { type: 'number' },
                },
                required: ['quantity'],
              },
              description: 'Itens do pedido',
            },
            payment_method: { type: 'string', description: 'Método de pagamento' },
            shipping_address: { type: 'object', description: 'Endereço de entrega' },
          },
          required: ['customer_id', 'items'],
        },
      },
      {
        name: 'update_order_status',
        description: 'Atualiza o status de um pedido',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do pedido' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
              description: 'Novo status do pedido',
            },
          },
          required: ['id', 'status'],
        },
      },
      
      // Clientes
      {
        name: 'list_customers',
        description: 'Lista clientes cadastrados',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filtrar por email' },
            limit: { type: 'number', description: 'Limite de resultados', default: 50 },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Busca um cliente específico por ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do cliente' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Cria um novo cliente',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do cliente' },
            email: { type: 'string', description: 'Email do cliente' },
            phone: { type: 'string', description: 'Telefone do cliente' },
            cpf: { type: 'string', description: 'CPF do cliente' },
            address: { type: 'object', description: 'Endereço do cliente' },
          },
          required: ['name', 'email'],
        },
      },
      {
        name: 'update_customer',
        description: 'Atualiza dados de um cliente',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do cliente' },
            name: { type: 'string', description: 'Nome do cliente' },
            email: { type: 'string', description: 'Email do cliente' },
            phone: { type: 'string', description: 'Telefone do cliente' },
            cpf: { type: 'string', description: 'CPF do cliente' },
            address: { type: 'object', description: 'Endereço do cliente' },
          },
          required: ['id'],
        },
      },
      
      // Eventos e Ingressos
      {
        name: 'list_events',
        description: 'Lista eventos disponíveis',
        inputSchema: {
          type: 'object',
          properties: {
            upcoming: { type: 'boolean', description: 'Apenas eventos futuros' },
            limit: { type: 'number', description: 'Limite de resultados', default: 50 },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Busca um evento específico por ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do evento' },
          },
          required: ['id'],
        },
      },
      
      // Relatórios e Analytics
      {
        name: 'get_sales_report',
        description: 'Gera relatório de vendas',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'Data final (YYYY-MM-DD)' },
            group_by: { type: 'string', enum: ['day', 'week', 'month'], description: 'Agrupar por período' },
          },
        },
      },
      {
        name: 'get_inventory_status',
        description: 'Verifica status do estoque',
        inputSchema: {
          type: 'object',
          properties: {
            low_stock_threshold: { type: 'number', description: 'Limite para estoque baixo', default: 10 },
          },
        },
      },
    ],
  };
});

// Implementação das ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as any;
  
  try {
    log(`Executando ferramenta: ${name}`, args);
    
    switch (name) {
      // === PRODUTOS ===
      case 'list_products': {
        let query = supabase.from('products').select('*');
        
        if (args.category) {
          query = query.eq('category', args.category);
        }
        if (args.in_stock !== undefined) {
          query = query.eq('in_stock', args.in_stock);
        }
        
        const limit = args.limit || 50;
        query = query.limit(limit as number);
        
        const { data, error } = await query;
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Encontrados ${data.length} produtos:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'get_product': {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', args.id)
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Produto encontrado:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'create_product': {
        const validatedData = ProductSchema.parse(args);
        
        const { data, error } = await supabase
          .from('products')
          .insert(validatedData)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Produto criado com sucesso:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'update_product': {
        const { id, ...updateData } = args;
        const validatedData = ProductSchema.partial().parse(updateData);
        
        const { data, error } = await supabase
          .from('products')
          .update(validatedData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Produto atualizado com sucesso:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      // === CARRINHO ===
      case 'get_cart': {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            *,
            products(*),
            tickets(*)
          `)
          .eq('user_id', args.user_id);
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Carrinho do usuário ${args.user_id}:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'add_to_cart': {
        // Validar que pelo menos product_id ou ticket_id foi fornecido
        if (!args.product_id && !args.ticket_id) {
          throw new Error('É necessário fornecer product_id ou ticket_id');
        }
        
        // Buscar preço do produto ou ingresso
        let unit_price = args.unit_price;
        if (!unit_price) {
          if (args.product_id) {
            const { data: product } = await supabase
              .from('products')
              .select('price')
              .eq('id', args.product_id)
              .single();
            unit_price = product?.price;
          } else if (args.ticket_id) {
            const { data: ticket } = await supabase
              .from('tickets')
              .select('price')
              .eq('id', args.ticket_id)
              .single();
            unit_price = ticket?.price;
          }
        }
        
        const cartData = {
          user_id: args.user_id,
          product_id: args.product_id || null,
          ticket_id: args.ticket_id || null,
          quantity: args.quantity,
          size: args.size || null,
          unit_price: unit_price,
          total_price: unit_price ? unit_price * args.quantity : null,
        };
        
        const { data, error } = await supabase
          .from('cart_items')
          .insert(cartData)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Item adicionado ao carrinho:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'update_cart_item': {
        // Primeiro buscar o preço unitário
        const { data: cartData, error: fetchError } = await supabase
          .from('cart_items')
          .select('unit_price')
          .eq('id', args.id)
          .single();
          
        if (fetchError) {
          throw new Error(`Erro ao buscar item do carrinho: ${fetchError.message}`);
        }
        
        const updateData = {
          quantity: args.quantity as number,
          total_price: (cartData.unit_price as number) * (args.quantity as number),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('cart_items')
          .update(updateData)
          .eq('id', args.id)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Item do carrinho atualizado:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'remove_from_cart': {
        const { data, error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', args.id)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Item removido do carrinho:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      // === PEDIDOS ===
      case 'list_orders': {
        let query = supabase.from('orders').select(`
          *,
          customers(*),
          order_items(*, products(*), tickets(*))
        `);
        
        if (args.customer_id) {
          query = query.eq('customer_id', args.customer_id);
        }
        if (args.status) {
          query = query.eq('status', args.status);
        }
        
        const limit = args.limit || 50;
        query = query.limit(limit as number).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Encontrados ${data.length} pedidos:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'get_order': {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            customers(*),
            order_items(*, products(*), tickets(*))
          `)
          .eq('id', args.id)
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Pedido encontrado:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'create_order': {
        // Validar dados do pedido
        const orderData = OrderSchema.parse(args);
        
        // Calcular totais
        let subtotal = 0;
        for (const item of args.items as any[]) {
          const itemTotal = (item.unit_price as number) * (item.quantity as number);
          subtotal += itemTotal;
        }
        
        orderData.subtotal = subtotal;
        orderData.total_amount = subtotal + orderData.tax_amount + orderData.shipping_amount - orderData.discount_amount;
        
        // Criar pedido
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();
          
        if (orderError) throw orderError;
        
        // Criar itens do pedido
        const orderItems = (args.items as any[]).map(item => ({
          order_id: order.id,
          product_id: item.product_id || null,
          ticket_id: item.ticket_id || null,
          quantity: item.quantity as number,
          size: item.size || null,
          unit_price: item.unit_price as number,
          total_price: (item.unit_price as number) * (item.quantity as number),
        }));
        
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)
          .select();
          
        if (itemsError) throw itemsError;
        
        return {
          content: [{
            type: 'text',
            text: `Pedido criado com sucesso:\nPedido: ${JSON.stringify(order, null, 2)}\nItens: ${JSON.stringify(items, null, 2)}`,
          }],
        };
      }
      
      case 'update_order_status': {
        const { data, error } = await supabase
          .from('orders')
          .update({ status: args.status })
          .eq('id', args.id)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Status do pedido atualizado:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      // === CLIENTES ===
      case 'list_customers': {
        let query = supabase.from('customers').select('*');
        
        if (args.email) {
          query = query.ilike('email', `%${args.email}%`);
        }
        
        const limit = args.limit || 50;
        query = query.limit(limit as number).order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Encontrados ${data.length} clientes:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'get_customer': {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', args.id)
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Cliente encontrado:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'create_customer': {
        const validatedData = CustomerSchema.parse(args);
        
        const { data, error } = await supabase
          .from('customers')
          .insert(validatedData)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Cliente criado com sucesso:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'update_customer': {
        const { id, ...updateData } = args;
        const validatedData = CustomerSchema.partial().parse(updateData);
        
        const { data, error } = await supabase
          .from('customers')
          .update(validatedData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Cliente atualizado com sucesso:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      // === EVENTOS ===
      case 'list_events': {
        let query = supabase.from('events').select('*');
        
        if (args.upcoming) {
          query = query.gte('date', new Date().toISOString());
        }
        
        const limit = args.limit || 50;
        query = query.limit(limit as number).order('date', { ascending: true });
        
        const { data, error } = await query;
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Encontrados ${data.length} eventos:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'get_event': {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', args.id)
          .single();
          
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `Evento encontrado:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      // === RELATÓRIOS ===
      case 'get_sales_report': {
        let query = supabase
          .from('orders')
          .select('created_at, total_amount, status')
          .eq('status', 'delivered');
          
        if (args.start_date) {
          query = query.gte('created_at', args.start_date);
        }
        if (args.end_date) {
          query = query.lte('created_at', args.end_date);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Calcular estatísticas
        const totalSales = data.reduce((sum, order) => sum + order.total_amount, 0);
        const totalOrders = data.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        
        return {
          content: [{
            type: 'text',
            text: `Relatório de Vendas:\nTotal de Vendas: R$ ${totalSales.toFixed(2)}\nTotal de Pedidos: ${totalOrders}\nTicket Médio: R$ ${averageOrderValue.toFixed(2)}\n\nDetalhes:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      }
      
      case 'get_inventory_status': {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, stock_quantity, in_stock')
          .eq('in_stock', true);
          
        if (error) throw error;
        
        const threshold = args.low_stock_threshold || 10;
        const lowStockItems = data.filter(product => 
          product.stock_quantity !== null && product.stock_quantity <= threshold
        );
        
        return {
          content: [{
            type: 'text',
            text: `Status do Estoque:\nTotal de Produtos Ativos: ${data.length}\nProdutos com Estoque Baixo (≤${threshold}): ${lowStockItems.length}\n\nProdutos com Estoque Baixo:\n${JSON.stringify(lowStockItems, null, 2)}`,
          }],
        };
      }
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Ferramenta desconhecida: ${name}`
        );
    }
  } catch (error) {
    handleError(error, name);
  }
});

// Inicializar servidor
async function main() {
  try {
    log('🚀 Iniciando servidor MCP E-commerce...');
    log('📋 Variáveis de ambiente:', {
      SUPABASE_URL: SUPABASE_URL,
      SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY ? '***DEFINIDA***' : '***NÃO DEFINIDA***'
    });
    
    // Testar conexão com Supabase
    log('🔄 Testando conexão com Supabase...');
    const { data, error } = await supabase.from('products').select('count').limit(1);
    
    if (error) {
      log('❌ Erro ao conectar com Supabase:', error);
      process.exit(1);
    }
    
    log('✅ Conexão com Supabase estabelecida com sucesso!');
    log('🚀 Servidor MCP E-commerce iniciado e pronto para receber requisições');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (error) {
    log('❌ Erro ao inicializar servidor MCP:', error);
    process.exit(1);
  }
}

// Tratamento de sinais para encerramento gracioso
process.on('SIGINT', () => {
  log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

// Teste de execução
console.log('🔍 TESTE: Arquivo MCP sendo executado...');
console.error('🔍 TESTE: Arquivo MCP sendo executado via stderr...');

// Iniciar servidor
const currentFileUrl = import.meta.url;
const executedFileUrl = `file:///${process.argv[1].replace(/\\/g, '/')}`;
console.log('🔍 TESTE: currentFileUrl =', currentFileUrl);
console.log('🔍 TESTE: executedFileUrl =', executedFileUrl);

if (currentFileUrl === executedFileUrl) {
  console.log('🔍 TESTE: Condição de execução atendida, iniciando main()...');
  main().catch((error) => {
    log('❌ Erro fatal:', error);
    process.exit(1);
  });
} else {
  console.log('🔍 TESTE: Condição de execução NÃO atendida');
}

export { server };