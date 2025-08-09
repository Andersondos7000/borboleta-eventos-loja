/**
 * Script de Simulação de Compras - MCP Playwright
 * Testa o fluxo completo de compra na aplicação Queren Hapuque
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  baseUrl: 'http://localhost:3002',
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
    document: '123.456.789-00' // CPF válido para teste
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

class PurchaseSimulator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.screenshots = [];
    this.startTime = Date.now();
  }

  async init() {
    console.log('🚀 Iniciando simulação de compras...');
    
    // Criar diretórios se não existirem
    if (!fs.existsSync(CONFIG.screenshotPath)) {
      fs.mkdirSync(CONFIG.screenshotPath, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.reportPath)) {
      fs.mkdirSync(CONFIG.reportPath, { recursive: true });
    }

    this.browser = await chromium.launch({ 
      headless: false, // Modo visual para debug
      slowMo: 1000 // Delay entre ações
    });
    
    this.page = await this.browser.newPage();
    
    // Configurar viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Interceptar erros de console
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push({
          type: 'console_error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Interceptar erros de rede
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.errors.push({
          type: 'network_error',
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async takeScreenshot(name) {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(CONFIG.screenshotPath, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.screenshots.push({ name, filepath, timestamp: new Date().toISOString() });
    console.log(`📸 Screenshot salvo: ${filename}`);
  }

  async navigateToHome() {
    console.log('🏠 Navegando para página inicial...');
    try {
      await this.page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
      await this.takeScreenshot('01-home-page');
      
      // Verificar se a página carregou corretamente
      const title = await this.page.title();
      console.log(`✅ Página carregada: ${title}`);
      
      return true;
    } catch (error) {
      this.errors.push({
        type: 'navigation_error',
        message: error.message,
        step: 'navigate_to_home',
        timestamp: new Date().toISOString()
      });
      console.error('❌ Erro ao navegar para home:', error.message);
      return false;
    }
  }

  async navigateToCheckout() {
    console.log('🛒 Navegando para checkout...');
    try {
      // Procurar botão de compra/checkout
      const checkoutButton = await this.page.locator('a[href*="checkout"], button:has-text("Comprar"), a:has-text("Checkout")');
      
      if (await checkoutButton.count() > 0) {
        await checkoutButton.first().click();
        await this.page.waitForURL('**/checkout**', { timeout: CONFIG.timeout });
      } else {
        // Navegar diretamente se não encontrar botão
        await this.page.goto(`${CONFIG.baseUrl}/checkout`);
      }
      
      await this.takeScreenshot('02-checkout-page');
      console.log('✅ Navegação para checkout bem-sucedida');
      return true;
    } catch (error) {
      this.errors.push({
        type: 'navigation_error',
        message: error.message,
        step: 'navigate_to_checkout',
        timestamp: new Date().toISOString()
      });
      console.error('❌ Erro ao navegar para checkout:', error.message);
      return false;
    }
  }

  async fillCustomerInformation() {
    console.log('👤 Preenchendo informações do cliente...');
    try {
      // Preencher dados do cliente
      await this.page.fill('input[name="customerName"], input[placeholder*="nome"], #customerName', TEST_DATA.customer.name);
      await this.page.fill('input[name="customerEmail"], input[type="email"], #customerEmail', TEST_DATA.customer.email);
      await this.page.fill('input[name="customerPhone"], input[placeholder*="telefone"], #customerPhone', TEST_DATA.customer.phone);
      await this.page.fill('input[name="customerDocument"], input[placeholder*="CPF"], #customerDocument', TEST_DATA.customer.document);
      
      await this.takeScreenshot('03-customer-info-filled');
      console.log('✅ Informações do cliente preenchidas');
      return true;
    } catch (error) {
      this.errors.push({
        type: 'form_error',
        message: error.message,
        step: 'fill_customer_information',
        timestamp: new Date().toISOString()
      });
      console.error('❌ Erro ao preencher informações do cliente:', error.message);
      return false;
    }
  }

  async fillParticipants() {
    console.log('👥 Preenchendo lista de participantes...');
    try {
      for (let i = 0; i < TEST_DATA.participants.length; i++) {
        const participant = TEST_DATA.participants[i];
        
        // Adicionar participante se necessário
        if (i > 0) {
          const addButton = await this.page.locator('button:has-text("Adicionar"), button:has-text("+")');
          if (await addButton.count() > 0) {
            await addButton.first().click();
            await this.page.waitForTimeout(1000);
          }
        }
        
        // Preencher dados do participante
        const participantSelector = `[data-participant="${i}"], .participant-${i}, .participant:nth-child(${i + 1})`;
        
        await this.page.fill(`${participantSelector} input[name*="name"], input[name="participants.${i}.name"]`, participant.name);
        await this.page.fill(`${participantSelector} input[name*="email"], input[name="participants.${i}.email"]`, participant.email);
        await this.page.fill(`${participantSelector} input[name*="document"], input[name="participants.${i}.document"]`, participant.document);
        
        console.log(`✅ Participante ${i + 1} adicionado: ${participant.name}`);
      }
      
      await this.takeScreenshot('04-participants-filled');
      return true;
    } catch (error) {
      this.errors.push({
        type: 'form_error',
        message: error.message,
        step: 'fill_participants',
        timestamp: new Date().toISOString()
      });
      console.error('❌ Erro ao preencher participantes:', error.message);
      return false;
    }
  }

  async submitForm() {
    console.log('📤 Enviando formulário...');
    try {
      // Procurar botão de submit
      const submitButton = await this.page.locator('button[type="submit"], button:has-text("Finalizar"), button:has-text("Pagar")');
      
      if (await submitButton.count() === 0) {
        throw new Error('Botão de submit não encontrado');
      }
      
      await submitButton.first().click();
      
      // Aguardar resposta (PIX ou erro)
      await this.page.waitForTimeout(5000);
      
      await this.takeScreenshot('05-form-submitted');
      console.log('✅ Formulário enviado');
      return true;
    } catch (error) {
      this.errors.push({
        type: 'submit_error',
        message: error.message,
        step: 'submit_form',
        timestamp: new Date().toISOString()
      });
      console.error('❌ Erro ao enviar formulário:', error.message);
      return false;
    }
  }

  async checkPaymentResponse() {
    console.log('💳 Verificando resposta de pagamento...');
    try {
      // Verificar se PIX foi gerado
      const pixCode = await this.page.locator('code, .pix-code, [data-pix-code]');
      const qrCode = await this.page.locator('img[alt*="QR"], .qr-code, [data-qr-code]');
      
      if (await pixCode.count() > 0) {
        const code = await pixCode.first().textContent();
        console.log('✅ Código PIX gerado:', code?.substring(0, 50) + '...');
      }
      
      if (await qrCode.count() > 0) {
        console.log('✅ QR Code PIX encontrado');
      }
      
      // Verificar erros na tela
      const errorMessages = await this.page.locator('.error, .alert-error, [role="alert"]');
      if (await errorMessages.count() > 0) {
        const errorText = await errorMessages.first().textContent();
        this.errors.push({
          type: 'payment_error',
          message: errorText,
          step: 'check_payment_response',
          timestamp: new Date().toISOString()
        });
        console.error('❌ Erro de pagamento:', errorText);
      }
      
      await this.takeScreenshot('06-payment-response');
      return true;
    } catch (error) {
      this.errors.push({
        type: 'payment_check_error',
        message: error.message,
        step: 'check_payment_response',
        timestamp: new Date().toISOString()
      });
      console.error('❌ Erro ao verificar resposta de pagamento:', error.message);
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
    
    const reportFile = path.join(CONFIG.reportPath, `purchase-simulation-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📊 RELATÓRIO DE SIMULAÇÃO:');
    console.log('================================');
    console.log(`⏱️  Duração: ${duration}ms`);
    console.log(`📸 Screenshots: ${this.screenshots.length}`);
    console.log(`❌ Erros encontrados: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n🔍 DETALHES DOS ERROS:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.message}`);
      });
    }
    
    console.log(`\n📄 Relatório salvo em: ${reportFile}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      // Executar fluxo de teste
      const steps = [
        () => this.navigateToHome(),
        () => this.navigateToCheckout(),
        () => this.fillCustomerInformation(),
        () => this.fillParticipants(),
        () => this.submitForm(),
        () => this.checkPaymentResponse()
      ];
      
      for (const step of steps) {
        const success = await step();
        if (!success) {
          console.log('⚠️  Continuando apesar do erro...');
        }
        await this.page.waitForTimeout(2000); // Pausa entre steps
      }
      
    } catch (error) {
      console.error('💥 Erro crítico na simulação:', error);
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

// Executar simulação se chamado diretamente
if (require.main === module) {
  (async () => {
    const simulator = new PurchaseSimulator();
    const report = await simulator.run();
    
    process.exit(report.summary.success ? 0 : 1);
  })();
}

module.exports = PurchaseSimulator;