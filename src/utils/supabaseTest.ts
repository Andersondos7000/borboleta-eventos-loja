// Teste de integração do Supabase
import { supabase } from '@/integrations/supabase/client';

export interface TestResult {
  test: string;
  status: 'success' | 'error';
  message: string;
  data?: unknown;
}

export class SupabaseIntegrationTest {
  private results: TestResult[] = [];

  private addResult(test: string, status: 'success' | 'error', message: string, data?: unknown) {
    this.results.push({ test, status, message, data });
    console.log(`[${status.toUpperCase()}] ${test}: ${message}`, data || '');
  }

  // Teste 1: Verificar conexão básica
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('products').select('count').limit(1);
      
      if (error) {
        this.addResult('Conexão', 'error', `Erro na conexão: ${error.message}`);
        return false;
      }

      this.addResult('Conexão', 'success', 'Conexão com Supabase estabelecida com sucesso');
      return true;
    } catch (error) {
      this.addResult('Conexão', 'error', `Erro inesperado: ${error}`);
      return false;
    }
  }

  // Teste 2: Verificar tabelas principais
  async testTablesExist(): Promise<boolean> {
    const tables = ['products', 'events', 'orders', 'cart_items', 'tickets'] as const;
    let allTablesExist = true;

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          this.addResult(`Tabela ${table}`, 'error', `Tabela não encontrada: ${error.message}`);
          allTablesExist = false;
        } else {
          this.addResult(`Tabela ${table}`, 'success', 'Tabela existe e é acessível');
        }
      } catch (error) {
        this.addResult(`Tabela ${table}`, 'error', `Erro ao acessar: ${error}`);
        allTablesExist = false;
      }
    }

    return allTablesExist;
  }

  // Teste 3: Verificar dados de produtos
  async testProductsData(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, in_stock')
        .limit(5);

      if (error) {
        this.addResult('Dados de Produtos', 'error', `Erro ao buscar produtos: ${error.message}`);
        return false;
      }

      if (!data || data.length === 0) {
        this.addResult('Dados de Produtos', 'error', 'Nenhum produto encontrado na base de dados');
        return false;
      }

      this.addResult('Dados de Produtos', 'success', `${data.length} produtos encontrados`, 
        data.map(p => ({ id: p.id, name: p.name, price: p.price }))
      );
      return true;
    } catch (error) {
      this.addResult('Dados de Produtos', 'error', `Erro inesperado: ${error}`);
      return false;
    }
  }

  // Teste 4: Verificar dados de eventos
  async testEventsData(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, date, location, price, available_tickets')
        .limit(5);

      if (error) {
        this.addResult('Dados de Eventos', 'error', `Erro ao buscar eventos: ${error.message}`);
        return false;
      }

      if (!data || data.length === 0) {
        this.addResult('Dados de Eventos', 'error', 'Nenhum evento encontrado na base de dados');
        return false;
      }

      this.addResult('Dados de Eventos', 'success', `${data.length} eventos encontrados`,
        data.map(e => ({ id: e.id, name: e.name, date: e.date }))
      );
      return true;
    } catch (error) {
      this.addResult('Dados de Eventos', 'error', `Erro inesperado: ${error}`);
      return false;
    }
  }

  // Teste 5: Verificar autenticação
  async testAuthentication(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        this.addResult('Autenticação', 'error', `Erro na autenticação: ${error.message}`);
        return false;
      }

      if (session) {
        this.addResult('Autenticação', 'success', `Usuário autenticado: ${session.user.email}`);
      } else {
        this.addResult('Autenticação', 'success', 'Sistema de autenticação funcionando (sem usuário logado)');
      }
      
      return true;
    } catch (error) {
      this.addResult('Autenticação', 'error', `Erro inesperado: ${error}`);
      return false;
    }
  }

  // Teste 6: Verificar RLS (Row Level Security)
  async testRLS(): Promise<boolean> {
    try {
      // Tentar inserir um item no carrinho sem estar logado
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: 'test-user',
          product_id: 'test-product',
          quantity: 1
        });

      if (error && error.message.includes('row-level security')) {
        this.addResult('RLS', 'success', 'Row Level Security está ativo e funcionando');
        return true;
      } else if (error) {
        this.addResult('RLS', 'error', `Erro inesperado no RLS: ${error.message}`);
        return false;
      } else {
        this.addResult('RLS', 'error', 'RLS pode não estar configurado corretamente (inserção permitida sem auth)');
        return false;
      }
    } catch (error) {
      this.addResult('RLS', 'error', `Erro inesperado: ${error}`);
      return false;
    }
  }

  // Teste 7: Verificar Edge Functions
  async testEdgeFunctions(): Promise<boolean> {
    const functions = ['create-abacate-payment', 'check-abacate-payment', 'abacate-webhook'];
    let allFunctionsWork = true;

    for (const functionName of functions) {
      try {
        // Teste básico de existência da função
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { test: true }
        });

        if (error && error.message.includes('Function not found')) {
          this.addResult(`Edge Function ${functionName}`, 'error', 'Função não encontrada');
          allFunctionsWork = false;
        } else {
          this.addResult(`Edge Function ${functionName}`, 'success', 'Função existe e é acessível');
        }
      } catch (error) {
        this.addResult(`Edge Function ${functionName}`, 'error', `Erro ao testar: ${error}`);
        allFunctionsWork = false;
      }
    }

    return allFunctionsWork;
  }

  // Executar todos os testes
  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Iniciando testes de integração do Supabase...\n');

    this.results = [];

    await this.testConnection();
    await this.testTablesExist();
    await this.testProductsData();
    await this.testEventsData();
    await this.testAuthentication();
    await this.testRLS();
    await this.testEdgeFunctions();

    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    console.log('\n📊 Resumo dos testes:');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📈 Taxa de sucesso: ${((successCount / this.results.length) * 100).toFixed(1)}%`);

    return this.results;
  }

  // Obter resultados
  getResults(): TestResult[] {
    return this.results;
  }

  // Gerar relatório
  generateReport(): string {
    let report = '# Relatório de Teste de Integração Supabase\n\n';
    
    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    report += `## Resumo\n`;
    report += `- **Total de testes**: ${this.results.length}\n`;
    report += `- **Sucessos**: ${successCount}\n`;
    report += `- **Erros**: ${errorCount}\n`;
    report += `- **Taxa de sucesso**: ${((successCount / this.results.length) * 100).toFixed(1)}%\n\n`;

    report += `## Detalhes dos Testes\n\n`;

    this.results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : '❌';
      report += `${icon} **${result.test}**: ${result.message}\n`;
      if (result.data) {
        report += `   - Dados: ${JSON.stringify(result.data, null, 2)}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

// Função utilitária para executar os testes
export const runSupabaseTests = async (): Promise<TestResult[]> => {
  const tester = new SupabaseIntegrationTest();
  return await tester.runAllTests();
};
