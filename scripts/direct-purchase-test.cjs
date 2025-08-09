/**
 * Teste Direto de Compras - Execução Simplificada
 * Executa diretamente no container sem nested docker calls
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://host.docker.internal:3002',
  timeout: 30000,
  screenshotPath: './tests/screenshots',
  reportPath: './tests/reports'
};

// Dados de teste
const TEST_DATA = {
  customer: {
    name: 'João Silva Teste',
    email: 'joao.teste@email.com',
    phone: '(11) 99999-9999',
    document: '123.456.789-00'
  },
  participants: [
    {
      name: 'João Silva',
      email: 'joao@email.com',
      document: '123.456.789-00'
    },
    {
      name: 'Maria Santos',
      email: 'maria@email.com', 
      document: '987.654.321-00'
    }
  ]
};

class DirectPurchaseTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.screenshots = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async init() {
    this.log('🚀 Iniciando teste direto de compras...');
    
    // Criar diretórios se não existirem
    if (!fs.existsSync(CONFIG.screenshotPath)) {
      fs.mkdirSync(CONFIG.screenshotPath, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.reportPath)) {
      fs.mkdirSync(CONFIG.reportPath, { recursive: true });
    }

    try {
      this.browser = await chromium.launch({ 
        headless: true, // Headless para container
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Configurar viewport
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      // Interceptar erros
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.errors.push({
            type: 'console_error',
            message: msg.text(),
            timestamp: new Date().toISOString()
          });
          this.log(`Console Error: ${msg.text()}`, 'error');
        }
      });
      
      this.page.on('response', response => {
        if (response.status() >= 400) {
          this.errors.push({
            type: 'network_error',
            url: response.url(),
            status: response.status(),
            timestamp: new Date().toISOString()
          });
          this.log(`Network Error: ${response.status()} - ${response.url()}`, 'error');
        }
      });
      
      this.log('✅ Browser inicializado com sucesso');
      return true;
    } catch (error) {
      this.log(`❌ Erro ao inicializar browser: ${error.message}`, 'error');
      this.errors.push({
        type: 'init_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async takeScreenshot(name) {
    try {
      const filename = `${Date.now()}-${name}.png`;
      const filepath = path.join(CONFIG.screenshotPath, filename);
      await this.page.screenshot({ path: filepath, fullPage: true });
      this.screenshots.push({ name, filepath, timestamp: new Date().toISOString() });
      this.log(`📸 Screenshot salvo: ${filename}`);
    } catch (error) {
      this.log(`❌ Erro ao salvar screenshot: ${error.message}`, 'error');
    }
  }

  async testApplicationAccess() {
    this.log('🌐 Testando acesso à aplicação...');
    try {
      // Primeiro, verificar se a aplicação está rodando
      await this.page.goto(CONFIG.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: CONFIG.timeout 
      });
      
      await this.takeScreenshot('01-app-access');
      
      const title = await this.page.title();
      this.log(`✅ Aplicação acessível: ${title}`);
      
      // Verificar se há elementos básicos
      const bodyText = await this.page.textContent('body');
      if (bodyText && bodyText.length > 0) {
        this.log('✅ Conteúdo da página carregado');
        return true;
      } else {
        this.log('⚠️  Página carregou mas sem conteúdo visível', 'warn');
        return false;
      }
    } catch (error) {
      this.errors.push({
        type: 'access_error',
        message: error.message,
        step: 'test_application_access',
        timestamp: new Date().toISOString()
      });
      this.log(`❌ Erro ao acessar aplicação: ${error.message}`, 'error');
      return false;
    }
  }

  async testCheckoutNavigation() {
    this.log('🛒 Testando navegação para checkout...');
    try {
      // Tentar navegar diretamente para checkout
      await this.page.goto(`${CONFIG.baseUrl}/checkout`, { 
        waitUntil: 'networkidle',
        timeout: CONFIG.timeout 
      });
      
      await this.takeScreenshot('02-checkout-navigation');
      
      // Verificar se chegou na página de checkout
      const url = this.page.url();
      if (url.includes('/checkout')) {
        this.log('✅ Navegação para checkout bem-sucedida');
        return true;
      } else {
        this.log(`⚠️  URL inesperada: ${url}`, 'warn');
        return false;
      }
    } catch (error) {
      this.errors.push({
        type: 'navigation_error',
        message: error.message,
        step: 'test_checkout_navigation',
        timestamp: new Date().toISOString()
      });
      this.log(`❌ Erro na navegação para checkout: ${error.message}`, 'error');
      return false;
    }
  }

  async testFormElements() {
    this.log('📝 Testando elementos do formulário...');
    try {
      // Aguardar carregamento da página
      await this.page.waitForTimeout(3000);
      
      // Verificar presença de campos de formulário
      const formElements = {
        nameField: await this.page.locator('input[name*="name"], input[placeholder*="nome"]').count(),
        emailField: await this.page.locator('input[type="email"], input[name*="email"]').count(),
        phoneField: await this.page.locator('input[name*="phone"], input[placeholder*="telefone"]').count(),
        documentField: await this.page.locator('input[name*="document"], input[placeholder*="CPF"]').count(),
        submitButton: await this.page.locator('button[type="submit"], button:has-text("Finalizar"), button:has-text("Pagar")').count()
      };
      
      await this.takeScreenshot('03-form-elements');
      
      this.log(`📊 Elementos encontrados:`);
      this.log(`   - Campos de nome: ${formElements.nameField}`);
      this.log(`   - Campos de email: ${formElements.emailField}`);
      this.log(`   - Campos de telefone: ${formElements.phoneField}`);
      this.log(`   - Campos de documento: ${formElements.documentField}`);
      this.log(`   - Botões de submit: ${formElements.submitButton}`);
      
      const hasBasicElements = formElements.nameField > 0 && 
                              formElements.emailField > 0 && 
                              formElements.submitButton > 0;
      
      if (hasBasicElements) {
        this.log('✅ Elementos básicos do formulário encontrados');
        return true;
      } else {
        this.log('❌ Elementos básicos do formulário não encontrados', 'error');
        return false;
      }
    } catch (error) {
      this.errors.push({
        type: 'form_test_error',
        message: error.message,
        step: 'test_form_elements',
        timestamp: new Date().toISOString()
      });
      this.log(`❌ Erro ao testar elementos do formulário: ${error.message}`, 'error');
      return false;
    }
  }

  async testFormFilling() {
    this.log('✏️  Testando preenchimento do formulário...');
    try {
      // Tentar preencher campos básicos
      const fillAttempts = [];
      
      // Nome
      try {
        await this.page.fill('input[name*="name"]:first-of-type, input[placeholder*="nome"]:first-of-type', TEST_DATA.customer.name);
        fillAttempts.push({ field: 'name', success: true });
        this.log('✅ Campo nome preenchido');
      } catch (error) {
        fillAttempts.push({ field: 'name', success: false, error: error.message });
        this.log('❌ Erro ao preencher nome', 'error');
      }
      
      // Email
      try {
        await this.page.fill('input[type="email"]:first-of-type, input[name*="email"]:first-of-type', TEST_DATA.customer.email);
        fillAttempts.push({ field: 'email', success: true });
        this.log('✅ Campo email preenchido');
      } catch (error) {
        fillAttempts.push({ field: 'email', success: false, error: error.message });
        this.log('❌ Erro ao preencher email', 'error');
      }
      
      // Telefone
      try {
        await this.page.fill('input[name*="phone"]:first-of-type, input[placeholder*="telefone"]:first-of-type', TEST_DATA.customer.phone);
        fillAttempts.push({ field: 'phone', success: true });
        this.log('✅ Campo telefone preenchido');
      } catch (error) {
        fillAttempts.push({ field: 'phone', success: false, error: error.message });
        this.log('❌ Erro ao preencher telefone', 'error');
      }
      
      await this.takeScreenshot('04-form-filled');
      
      const successfulFills = fillAttempts.filter(a => a.success).length;
      this.log(`📊 Campos preenchidos com sucesso: ${successfulFills}/${fillAttempts.length}`);
      
      return successfulFills > 0;
    } catch (error) {
      this.errors.push({
        type: 'form_fill_error',
        message: error.message,
        step: 'test_form_filling',
        timestamp: new Date().toISOString()
      });
      this.log(`❌ Erro geral no preenchimento: ${error.message}`, 'error');
      return false;
    }
  }

  async testSubmission() {
    this.log('🚀 Testando submissão do formulário...');
    try {
      // Procurar botão de submit
      const submitButton = this.page.locator('button[type="submit"]:first-of-type, button:has-text("Finalizar"):first-of-type, button:has-text("Pagar"):first-of-type');
      
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        this.log('✅ Botão de submit clicado');
        
        // Aguardar resposta
        await this.page.waitForTimeout(5000);
        
        await this.takeScreenshot('05-form-submitted');
        
        // Verificar se houve mudança na página ou resposta
        const currentUrl = this.page.url();
        this.log(`📍 URL após submissão: ${currentUrl}`);
        
        return true;
      } else {
        this.log('❌ Botão de submit não encontrado', 'error');
        return false;
      }
    } catch (error) {
      this.errors.push({
        type: 'submission_error',
        message: error.message,
        step: 'test_submission',
        timestamp: new Date().toISOString()
      });
      this.log(`❌ Erro na submissão: ${error.message}`, 'error');
      return false;
    }
  }

  async generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      testData: TEST_DATA,
      errors: this.errors,
      screenshots: this.screenshots,
      summary: {
        totalErrors: this.errors.length,
        errorTypes: [...new Set(this.errors.map(e => e.type))],
        success: this.errors.length === 0
      }
    };
    
    const reportFile = path.join(CONFIG.reportPath, `direct-purchase-test-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('\n📊 RELATÓRIO DE TESTE DIRETO:');
    this.log('==============================');
    this.log(`⏱️  Duração: ${duration}ms`);
    this.log(`📸 Screenshots: ${this.screenshots.length}`);
    this.log(`❌ Erros encontrados: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      this.log('\n🔍 DETALHES DOS ERROS:');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. [${error.type}] ${error.message}`);
      });
    }
    
    this.log(`\n📄 Relatório salvo em: ${reportFile}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('🧹 Browser fechado');
    }
  }

  async run() {
    try {
      const initSuccess = await this.init();
      if (!initSuccess) {
        throw new Error('Falha na inicialização');
      }
      
      // Executar testes sequenciais
      const tests = [
        { name: 'Acesso à Aplicação', fn: () => this.testApplicationAccess() },
        { name: 'Navegação para Checkout', fn: () => this.testCheckoutNavigation() },
        { name: 'Elementos do Formulário', fn: () => this.testFormElements() },
        { name: 'Preenchimento do Formulário', fn: () => this.testFormFilling() },
        { name: 'Submissão do Formulário', fn: () => this.testSubmission() }
      ];
      
      for (const test of tests) {
        this.log(`\n🧪 Executando: ${test.name}`);
        const success = await test.fn();
        this.log(`${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASSOU' : 'FALHOU'}`);
        
        // Pausa entre testes
        await this.page.waitForTimeout(2000);
      }
      
    } catch (error) {
      this.log(`💥 Erro crítico no teste: ${error.message}`, 'error');
      this.errors.push({
        type: 'critical_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      const report = await this.generateReport();
      await this.cleanup();
      return report;
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  (async () => {
    const test = new DirectPurchaseTest();
    const report = await test.run();
    
    process.exit(report.summary.success ? 0 : 1);
  })();
}

module.exports = DirectPurchaseTest;