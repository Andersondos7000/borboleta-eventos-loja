import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Simulação de como as ferramentas MCP seriam usadas
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🎯 Exemplos práticos de uso do servidor MCP

/**
 * Exemplo 1: Fluxo completo de criação de produto
 */
async function exemploFluxoProduto() {
  console.log('\n📦 Exemplo 1: Criando um produto completo...');
  
  try {
    // Simula chamada MCP: create_product
    const novoProduto = {
      name: 'Smartphone Galaxy Pro',
      description: 'Smartphone com 128GB, câmera tripla e tela AMOLED',
      price: 89990, // R$ 899,90 em centavos
      category: 'eletrônicos',
      stock_quantity: 25,
      image_url: 'https://exemplo.com/galaxy-pro.jpg'
    };
    
    const { data: produto, error } = await supabase
      .from('products')
      .insert([novoProduto])
      .select()
      .single();
    
    if (error) {
      console.log('❌ Erro ao criar produto:', error.message);
      return null;
    }
    
    console.log('✅ Produto criado com sucesso!');
    console.log('   ID:', produto.id);
    console.log('   Nome:', produto.name);
    console.log('   Preço: R$', (produto.price / 100).toFixed(2));
    
    return produto;
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
    return null;
  }
}

/**
 * Exemplo 2: Fluxo de carrinho de compras
 */
async function exemploFluxoCarrinho() {
  console.log('\n🛒 Exemplo 2: Simulando carrinho de compras...');
  
  try {
    // Simula um usuário
    const userId = 'user-123-example';
    
    // Primeiro, vamos buscar produtos disponíveis
    const { data: produtos } = await supabase
      .from('products')
      .select('*')
      .limit(2);
    
    if (!produtos || produtos.length === 0) {
      console.log('⚠️ Nenhum produto encontrado para adicionar ao carrinho');
      return;
    }
    
    // Simula chamada MCP: add_to_cart
    for (const produto of produtos) {
      const itemCarrinho = {
        user_id: userId,
        product_id: produto.id,
        quantity: Math.floor(Math.random() * 3) + 1, // 1-3 itens
        unit_price: produto.price
      };
      
      const { error } = await supabase
        .from('cart_items')
        .upsert([itemCarrinho], {
          onConflict: 'user_id,product_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.log('❌ Erro ao adicionar ao carrinho:', error.message);
      } else {
        console.log(`✅ Adicionado ao carrinho: ${produto.name} (${itemCarrinho.quantity}x)`);
      }
    }
    
    // Simula chamada MCP: list_cart_items
    const { data: itensCarrinho } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (name, price)
      `)
      .eq('user_id', userId);
    
    if (itensCarrinho && itensCarrinho.length > 0) {
      console.log('\n📋 Itens no carrinho:');
      let total = 0;
      
      itensCarrinho.forEach(item => {
        const subtotal = item.quantity * item.unit_price;
        total += subtotal;
        console.log(`   - ${item.products.name}: ${item.quantity}x R$ ${(item.unit_price / 100).toFixed(2)} = R$ ${(subtotal / 100).toFixed(2)}`);
      });
      
      console.log(`\n💰 Total do carrinho: R$ ${(total / 100).toFixed(2)}`);
    }
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

/**
 * Exemplo 3: Criação de pedido
 */
async function exemploFluxoPedido() {
  console.log('\n📋 Exemplo 3: Criando um pedido...');
  
  try {
    const userId = 'user-123-example';
    
    // Busca itens do carrinho
    const { data: itensCarrinho } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId);
    
    if (!itensCarrinho || itensCarrinho.length === 0) {
      console.log('⚠️ Carrinho vazio, não é possível criar pedido');
      return;
    }
    
    // Calcula total
    const totalAmount = itensCarrinho.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    
    // Simula chamada MCP: create_order
    const novoPedido = {
      user_id: userId,
      total_amount: totalAmount,
      status: 'pending',
      shipping_address: 'Rua das Flores, 123 - São Paulo, SP',
      payment_method: 'credit_card',
      created_at: new Date().toISOString()
    };
    
    const { data: pedido, error: orderError } = await supabase
      .from('orders')
      .insert([novoPedido])
      .select()
      .single();
    
    if (orderError) {
      console.log('❌ Erro ao criar pedido:', orderError.message);
      return;
    }
    
    console.log('✅ Pedido criado com sucesso!');
    console.log('   ID do pedido:', pedido.id);
    console.log('   Total: R$', (pedido.total_amount / 100).toFixed(2));
    console.log('   Status:', pedido.status);
    
    // Cria itens do pedido
    const itensOrderPromises = itensCarrinho.map(item => {
      return supabase
        .from('order_items')
        .insert([{
          order_id: pedido.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }]);
    });
    
    await Promise.all(itensOrderPromises);
    console.log('✅ Itens do pedido criados');
    
    // Limpa carrinho (simula chamada MCP: clear_cart)
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    
    console.log('✅ Carrinho limpo');
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

/**
 * Exemplo 4: Relatório de vendas
 */
async function exemploRelatorioVendas() {
  console.log('\n📊 Exemplo 4: Gerando relatório de vendas...');
  
  try {
    // Simula chamada MCP: sales_report
    const { data: pedidos } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          unit_price,
          products (name, category)
        )
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 30 dias
    
    if (!pedidos || pedidos.length === 0) {
      console.log('📈 Nenhuma venda encontrada nos últimos 30 dias');
      return;
    }
    
    const totalVendas = pedidos.reduce((sum, pedido) => sum + pedido.total_amount, 0);
    const totalPedidos = pedidos.length;
    
    console.log('📈 Relatório de Vendas (últimos 30 dias):');
    console.log(`   Total de pedidos: ${totalPedidos}`);
    console.log(`   Receita total: R$ ${(totalVendas / 100).toFixed(2)}`);
    console.log(`   Ticket médio: R$ ${(totalVendas / totalPedidos / 100).toFixed(2)}`);
    
    // Análise por status
    const statusCount = pedidos.reduce((acc, pedido) => {
      acc[pedido.status] = (acc[pedido.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Pedidos por status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

/**
 * Exemplo 5: Gestão de estoque
 */
async function exemploGestaoEstoque() {
  console.log('\n📦 Exemplo 5: Verificando estoque...');
  
  try {
    // Simula chamada MCP: inventory_report
    const { data: produtos } = await supabase
      .from('products')
      .select('*')
      .order('stock_quantity', { ascending: true });
    
    if (!produtos || produtos.length === 0) {
      console.log('📦 Nenhum produto encontrado');
      return;
    }
    
    const lowStockThreshold = 10;
    const produtosBaixoEstoque = produtos.filter(p => p.stock_quantity <= lowStockThreshold);
    
    console.log('📦 Relatório de Estoque:');
    console.log(`   Total de produtos: ${produtos.length}`);
    console.log(`   Produtos com estoque baixo (≤${lowStockThreshold}): ${produtosBaixoEstoque.length}`);
    
    if (produtosBaixoEstoque.length > 0) {
      console.log('\n⚠️ Produtos com estoque baixo:');
      produtosBaixoEstoque.forEach(produto => {
        console.log(`   - ${produto.name}: ${produto.stock_quantity} unidades`);
      });
    }
    
    // Valor total do estoque
    const valorTotalEstoque = produtos.reduce((sum, produto) => {
      return sum + (produto.stock_quantity * produto.price);
    }, 0);
    
    console.log(`\n💰 Valor total do estoque: R$ ${(valorTotalEstoque / 100).toFixed(2)}`);
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

// Executa todos os exemplos
async function executarExemplos() {
  console.log('🚀 Iniciando exemplos do servidor MCP E-commerce...');
  
  await exemploFluxoProduto();
  await exemploFluxoCarrinho();
  await exemploFluxoPedido();
  await exemploRelatorioVendas();
  await exemploGestaoEstoque();
  
  console.log('\n🎉 Todos os exemplos executados com sucesso!');
  console.log('\n📚 Para mais informações, consulte: MCP_SERVER_DOCUMENTATION.md');
}

// Executa apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarExemplos().catch(console.error);
}

export {
  exemploFluxoProduto,
  exemploFluxoCarrinho,
  exemploFluxoPedido,
  exemploRelatorioVendas,
  exemploGestaoEstoque
};