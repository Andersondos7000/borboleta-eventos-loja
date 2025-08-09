const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configurações do teste
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3002',
  headless: false, // MODO VISUAL - navegador será visível
  slowMo: 2000, // Atraso de 2 segundos entre ações para visualização
  timeout: 60000,
  screenshotDir: '/app/tests/screenshots'
};

// Dados de teste
const testData = {
  cliente: {
    nome: 'João Silva Teste',
    email: 'joao.teste@email.com',
    telefone: '(11) 99999-9999',
    documento: '123.456.789-00'
  },
  participantes: [
    {
      nome: 'Maria Santos',
      email: 'maria@email.com',
      telefone: '(11) 88888-8888',
      documento: '987.654.321-00'
    },
    {
      nome: 'Pedro Costa',
      email: 'pedro@email.com', 
      telefone: '(11) 77777-7777',
      documento: '456.789.123-00'
    }
  ]
};

class VisualPurchaseTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      duration: 0,
      testData,
      tests: [],
      errors: [],
      screenshots: [],
      success: false
    };
    this.startTime = Date.now();
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    
    if (level === 'error') {
      this.results.errors.push({ timestamp, message });
    }
  }

  async takeScreenshot(name) {
    try {
      if (!fs.existsSync(config.screenshotDir)) {
        fs.mkdirSync(config.screenshotDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const filename = `${timestamp}-${name}.png`;
      const filepath = path.join(config.screenshotDir, filename);
      
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      this.results.screenshots.push(filename);
      this.log('info', `📸 Screenshot salvo: ${filename}`);
      
      return filepath;
    } catch (error) {
      this.log('error', `Erro ao capturar screenshot: ${error.message}`);
    }
  }

  async initBrowser() {
    try {
      this.log('info', '🚀 Iniciando navegador em modo VISUAL...');
      
      this.browser = await chromium.launch({
        headless: config.headless,
        slowMo: config.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Configurar viewport
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      // Configurar timeouts
      this.page.setDefaultTimeout(config.timeout);
      
      // Capturar erros de console
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.log('error', `Console Error: ${msg.text()}`);
        }
      });
      
      // Capturar erros de rede
      this.page.on('response', response => {
        if (response.status() >= 400) {
          this.log('error', `Network Error: ${response.status()} - ${response.url()}`);
        }
      });
      
      this.log('info', '✅ Navegador inicializado em modo VISUAL');
      this.log('info', '👀 VOCÊ DEVE VER O NAVEGADOR ABRINDO AGORA!');
      
      return true;
    } catch (error) {
      this.log('error', `Erro ao inicializar navegador: ${error.message}`);
      return false;
    }
  }

  async testAppAccess() {
    const testName = 'Acesso à Aplicação';
    this.log('info', `\n🧪 Executando: ${testName}`);
    this.log('info', '🌐 Testando acesso à aplicação...');
    
    try {
      await this.page.goto(config.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: config.timeout 
      });
      
      await this.takeScreenshot('01-app-access');
      
      // Aguardar um pouco para visualização
      await this.page.waitForTimeout(3000);
      
      const title = await this.page.title();
      this.log('info', `✅ Aplicação acessível: ${title}`);
      
      // Verificar se há conteúdo na página
      const bodyContent = await this.page.textContent('body');
      if (bodyContent && bodyContent.trim().length > 0) {
        this.log('info', '✅ Conteúdo da página carregado');
      }
      
      this.results.tests.push({ name: testName, status: 'PASSOU', details: { title } });
      this.log('info', `✅ ${testName}: PASSOU`);
      
      return true;
    } catch (error) {
      this.log('error', `❌ Erro no ${testName}: ${error.message}`);
      this.results.tests.push({ name: testName, status: 'FALHOU', error: error.message });
      return false;
    }
  }

  async testCheckoutNavigation() {
    const testName = 'Navegação para Checkout';
    this.log('info', `\n🧪 Executando: ${testName}`);
    this.log('info', '🛒 Testando navegação para checkout...');
    
    try {
      await this.page.goto(`${config.baseUrl}/checkout`, { 
        waitUntil: 'networkidle',
        timeout: config.timeout 
      });
      
      await this.takeScreenshot('02-checkout-navigation');
      
      // Aguardar um pouco para visualização
      await this.page.waitForTimeout(3000);
      
      this.log('info', '✅ Navegação para checkout bem-sucedida');
      this.results.tests.push({ name: testName, status: 'PASSOU' });
      this.log('info', `✅ ${testName}: PASSOU`);
      
      return true;
    } catch (error) {
      this.log('error', `❌ Erro na ${testName}: ${error.message}`);
      this.results.tests.push({ name: testName, status: 'FALHOU', error: error.message });
      return false;
    }
  }

  async testFormElements() {
    const testName = 'Elementos do Formulário';
    this.log('info', `\n🧪 Executando: ${testName}`);
    this.log('info', '📝 Testando elementos do formulário...');
    
    try {
      // Aguardar um pouco para a página carregar completamente
      await this.page.waitForTimeout(3000);
      
      await this.takeScreenshot('03-form-elements');
      
      // Seletores mais amplos para encontrar campos
      const selectors = {
        nome: ['input[name*="nome"]', 'input[placeholder*="nome"]', 'input[id*="nome"]', 'input[type="text"]'],
        email: ['input[name*="email"]', 'input[placeholder*="email"]', 'input[id*="email"]', 'input[type="email"]'],
        telefone: ['input[name*="telefone"]', 'input[name*="phone"]', 'input[placeholder*="telefone"]', 'input[type="tel"]'],
        documento: ['input[name*="documento"]', 'input[name*="cpf"]', 'input[placeholder*="cpf"]', 'input[placeholder*="documento"]'],
        submit: ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Enviar")', 'button:has-text("Finalizar")']
      };
      
      const found = {};
      
      for (const [field, selectorList] of Object.entries(selectors)) {
        found[field] = 0;
        for (const selector of selectorList) {
          try {
            const elements = await this.page.$$(selector);
            found[field] += elements.length;
          } catch (e) {
            // Ignorar erros de seletor
          }
        }
      }
      
      this.log('info', '📊 Elementos encontrados:');
      this.log('info', `   - Campos de nome: ${found.nome}`);
      this.log('info', `   - Campos de email: ${found.email}`);
      this.log('info', `   - Campos de telefone: ${found.telefone}`);
      this.log('info', `   - Campos de documento: ${found.documento}`);
      this.log('info', `   - Botões de submit: ${found.submit}`);
      
      const hasBasicElements = found.nome > 0 || found.email > 0 || found.telefone > 0;
      
      if (hasBasicElements) {
        this.log('info', '✅ Elementos básicos do formulário encontrados');
        this.results.tests.push({ name: testName, status: 'PASSOU', details: found });
        this.log('info', `✅ ${testName}: PASSOU`);
        return true;
      } else {
        this.log('error', '❌ Elementos básicos do formulário não encontrados');
        this.results.tests.push({ name: testName, status: 'FALHOU', details: found });
        this.log('info', `❌ ${testName}: FALHOU`);
        return false;
      }
    } catch (error) {
      this.log('error', `❌ Erro no ${testName}: ${error.message}`);
      this.results.tests.push({ name: testName, status: 'FALHOU', error: error.message });
      return false;
    }
  }

  async testFormFilling() {
    const testName = 'Preenchimento do Formulário';
    this.log('info', `\n🧪 Executando: ${testName}`);
    this.log('info', '✏️  Testando preenchimento do formulário...');
    
    try {
      const cliente = testData.cliente;
      let filledFields = 0;
      
      // Tentar preencher nome
      try {
        const nomeSelectors = ['input[name*="nome"]', 'input[placeholder*="nome"]', 'input[type="text"]:first-of-type'];
        for (const selector of nomeSelectors) {
          const element = await this.page.$(selector);
          if (element) {
            await element.fill(cliente.nome);
            await this.page.waitForTimeout(1000); // Pausa para visualização
            this.log('info', '✅ Nome preenchido');
            filledFields++;
            break;
          }
        }
      } catch (error) {
        this.log('error', '❌ Erro ao preencher nome');
      }
      
      // Tentar preencher email
      try {
        const emailSelectors = ['input[name*="email"]', 'input[type="email"]', 'input[placeholder*="email"]'];
        for (const selector of emailSelectors) {
          const element = await this.page.$(selector);
          if (element) {
            await element.fill(cliente.email);
            await this.page.waitForTimeout(1000); // Pausa para visualização
            this.log('info', '✅ Email preenchido');
            filledFields++;
            break;
          }
        }
      } catch (error) {
        this.log('error', '❌ Erro ao preencher email');
      }
      
      // Tentar preencher telefone
      try {
        const telefoneSelectors = ['input[name*="telefone"]', 'input[type="tel"]', 'input[placeholder*="telefone"]'];
        for (const selector of telefoneSelectors) {
          const element = await this.page.$(selector);
          if (element) {
            await element.fill(cliente.telefone);
            await this.page.waitForTimeout(1000); // Pausa para visualização
            this.log('info', '✅ Telefone preenchido');
            filledFields++;
            break;
          }
        }
      } catch (error) {
        this.log('error', '❌ Erro ao preencher telefone');
      }
      
      await this.takeScreenshot('04-form-filled');
      
      if (filledFields > 0) {
        this.log('info', `✅ ${filledFields} campos preenchidos com sucesso`);
        this.results.tests.push({ name: testName, status: 'PASSOU', details: { filledFields } });
        this.log('info', `✅ ${testName}: PASSOU`);
        return true;
      } else {
        this.log('error', '❌ Nenhum campo foi preenchido');
        this.results.tests.push({ name: testName, status: 'FALHOU', details: { filledFields } });
        this.log('info', `❌ ${testName}: FALHOU`);
        return false;
      }
    } catch (error) {
      this.log('error', `❌ Erro no ${testName}: ${error.message}`);
      this.results.tests.push({ name: testName, status: 'FALHOU', error: error.message });
      return false;
    }
  }

  async testFormSubmission() {
    const testName = 'Submissão do Formulário';
    this.log('info', `\n🧪 Executando: ${testName}`);
    this.log('info', '🚀 Testando submissão do formulário...');
    
    try {
      // Tentar encontrar e clicar no botão de submit
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Enviar")',
        'button:has-text("Finalizar")',
        'button:has-text("Confirmar")'
      ];
      
      let submitted = false;
      
      for (const selector of submitSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(3000); // Aguardar resposta
            this.log('info', '✅ Formulário submetido');
            submitted = true;
            break;
          }
        } catch (error) {
          // Continuar tentando outros seletores
        }
      }
      
      await this.takeScreenshot('05-form-submitted');
      
      if (submitted) {
        this.results.tests.push({ name: testName, status: 'PASSOU' });
        this.log('info', `✅ ${testName}: PASSOU`);
        return true;
      } else {
        this.log('error', '❌ Botão de submit não encontrado');
        this.results.tests.push({ name: testName, status: 'FALHOU', error: 'Botão não encontrado' });
        this.log('info', `❌ ${testName}: FALHOU`);
        return false;
      }
    } catch (error) {
      this.log('error', `❌ Erro na ${testName}: ${error.message}`);
      this.results.tests.push({ name: testName, status: 'FALHOU', error: error.message });
      return false;
    }
  }

  async generateReport() {
    this.results.duration = Date.now() - this.startTime;
    this.results.success = this.results.tests.every(test => test.status === 'PASSOU');
    
    const reportFile = path.join('/app/tests/reports', `visual-purchase-test-${Date.now()}.json`);
    
    try {
      if (!fs.existsSync('/app/tests/reports')) {
        fs.mkdirSync('/app/tests/reports', { recursive: true });
      }
      
      fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
      this.log('info', `📄 Relatório salvo: ${reportFile}`);
    } catch (error) {
      this.log('error', `Erro ao salvar relatório: ${error.message}`);
    }
    
    // Resumo final
    this.log('info', '\n📊 RESUMO DO TESTE VISUAL:');
    this.log('info', `⏱️  Duração: ${this.results.duration}ms`);
    this.log('info', `📋 Testes executados: ${this.results.tests.length}`);
    this.log('info', `✅ Sucessos: ${this.results.tests.filter(t => t.status === 'PASSOU').length}`);
    this.log('info', `❌ Falhas: ${this.results.tests.filter(t => t.status === 'FALHOU').length}`);
    this.log('info', `🖼️  Screenshots: ${this.results.screenshots.length}`);
    this.log('info', `🚨 Erros: ${this.results.errors.length}`);
    this.log('info', `🎯 Status final: ${this.results.success ? 'SUCESSO' : 'FALHA'}`);
    
    return this.results;
  }

  async cleanup() {
    try {
      if (this.browser) {
        this.log('info', '🧹 Fechando navegador...');
        await this.browser.close();
      }
    } catch (error) {
      this.log('error', `Erro ao fechar navegador: ${error.message}`);
    }
  }

  async run() {
    try {
      this.log('info', '🚀 Iniciando teste VISUAL de compras...');
      this.log('info', '👀 ATENÇÃO: O navegador será aberto em modo VISUAL!');
      this.log('info', '🐌 Ações serão executadas com atraso para visualização');
      
      // Inicializar navegador
      const browserReady = await this.initBrowser();
      if (!browserReady) {
        throw new Error('Falha ao inicializar navegador');
      }
      
      // Aguardar um pouco para o usuário ver o navegador
      await this.page.waitForTimeout(5000);
      
      // Executar testes
      await this.testAppAccess();
      await this.testCheckoutNavigation();
      await this.testFormElements();
      await this.testFormFilling();
      await this.testFormSubmission();
      
      // Aguardar antes de fechar para visualização final
      this.log('info', '⏳ Aguardando 10 segundos antes de fechar...');
      await this.page.waitForTimeout(10000);
      
    } catch (error) {
      this.log('error', `❌ Erro geral no teste: ${error.message}`);
    } finally {
      await this.generateReport();
      await this.cleanup();
    }
  }
}

// Executar teste
if (require.main === module) {
  const test = new VisualPurchaseTest();
  test.run().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = VisualPurchaseTest;