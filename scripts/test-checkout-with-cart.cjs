const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCheckoutWithCart() {
  console.log('🧪 Iniciando teste completo: carrinho + checkout...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleErrors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: 'console',
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        type: 'network',
        url: response.url(),
        status: response.status(),
        timestamp: new Date().toISOString()
      });
      console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
    }
  });
  
  try {
    // Passo 1: Ir para a página inicial
    console.log('🏠 Navegando para a página inicial...');
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Passo 2: Ir para a loja
    console.log('🛍️ Navegando para a loja...');
    await page.goto('http://localhost:3002/loja', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Passo 3: Adicionar um produto ao carrinho
    console.log('🛒 Procurando produtos para adicionar ao carrinho...');
    
    // Procurar botões "Adicionar ao Carrinho" ou "Comprar"
    const addToCartSelectors = [
      'button:has-text("Adicionar ao Carrinho")',
      'button:has-text("Comprar")',
      'button:has-text("Adicionar")',
      '[data-testid="add-to-cart"]',
      '.add-to-cart'
    ];
    
    let productAdded = false;
    for (const selector of addToCartSelectors) {
      const buttons = page.locator(selector);
      const count = await buttons.count();
      
      if (count > 0) {
        console.log(`✅ Encontrados ${count} botões com seletor: ${selector}`);
        await buttons.first().click();
        await page.waitForTimeout(2000);
        productAdded = true;
        console.log('✅ Produto adicionado ao carrinho');
        break;
      }
    }
    
    if (!productAdded) {
      // Tentar clicar em qualquer produto primeiro
      console.log('🔍 Procurando produtos na página...');
      const productCards = page.locator('.product-card, [data-testid="product-card"], .card');
      const productCount = await productCards.count();
      
      if (productCount > 0) {
        console.log(`📦 Encontrados ${productCount} produtos`);
        await productCards.first().click();
        await page.waitForTimeout(2000);
        
        // Tentar adicionar ao carrinho no modal/página do produto
        for (const selector of addToCartSelectors) {
          const button = page.locator(selector).first();
          if (await button.count() > 0) {
            await button.click();
            await page.waitForTimeout(2000);
            productAdded = true;
            console.log('✅ Produto adicionado ao carrinho via modal');
            break;
          }
        }
      }
    }
    
    if (!productAdded) {
      console.log('⚠️ Não foi possível adicionar produto ao carrinho. Tentando ir direto para ingressos...');
      
      // Tentar ir para página de ingressos
      await page.goto('http://localhost:3002/ingressos', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Procurar botões de compra de ingresso
      const ticketSelectors = [
        'button:has-text("Comprar Ingresso")',
        'button:has-text("Comprar")',
        'button:has-text("Adquirir")',
        '[data-testid="buy-ticket"]'
      ];
      
      for (const selector of ticketSelectors) {
        const button = page.locator(selector).first();
        if (await button.count() > 0) {
          await button.click();
          await page.waitForTimeout(2000);
          productAdded = true;
          console.log('✅ Ingresso adicionado ao carrinho');
          break;
        }
      }
    }
    
    // Passo 4: Verificar carrinho
    console.log('🛒 Verificando carrinho...');
    await page.goto('http://localhost:3002/carrinho', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'tests/screenshots/cart-check.png', fullPage: true });
    
    // Procurar botão de checkout no carrinho
    const checkoutSelectors = [
      'button:has-text("Finalizar Compra")',
      'button:has-text("Checkout")',
      'button:has-text("Continuar")',
      'a[href*="checkout"]',
      '[data-testid="checkout-button"]'
    ];
    
    let checkoutButton = null;
    for (const selector of checkoutSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        checkoutButton = button;
        console.log(`✅ Botão de checkout encontrado: ${selector}`);
        break;
      }
    }
    
    if (checkoutButton) {
      console.log('🚀 Clicando no botão de checkout...');
      await checkoutButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️ Botão de checkout não encontrado, navegando diretamente...');
      await page.goto('http://localhost:3002/checkout', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    
    // Passo 5: Testar página de checkout
    console.log('📋 Testando página de checkout...');
    
    await page.screenshot({ path: 'tests/screenshots/checkout-with-items.png', fullPage: true });
    
    // Verificar se o formulário está presente agora
    const form = await page.locator('form').first();
    const formExists = await form.count() > 0;
    console.log(`📋 Formulário encontrado: ${formExists}`);
    
    if (formExists) {
      console.log('✅ Formulário encontrado! Testando preenchimento...');
      
      // Preencher campos básicos
      const fields = [
        { selector: 'input[name="firstName"]', value: 'João', name: 'Nome' },
        { selector: 'input[name="lastName"]', value: 'Silva', name: 'Sobrenome' },
        { selector: 'input[name="cpf"]', value: '123.456.789-00', name: 'CPF' },
        { selector: 'input[name="zipCode"]', value: '01234-567', name: 'CEP' },
        { selector: 'input[name="address"]', value: 'Rua das Flores', name: 'Endereço' },
        { selector: 'input[name="number"]', value: '123', name: 'Número' },
        { selector: 'input[name="city"]', value: 'São Paulo', name: 'Cidade' },
        { selector: 'input[name="phone"]', value: '(11) 99999-9999', name: 'Telefone' }
      ];
      
      for (const field of fields) {
        const element = page.locator(field.selector).first();
        if (await element.count() > 0) {
          await element.fill(field.value);
          console.log(`✅ ${field.name} preenchido`);
          await page.waitForTimeout(500);
        } else {
          console.log(`⚠️ Campo ${field.name} não encontrado`);
        }
      }
      
      // Estado (select)
      const stateSelect = page.locator('select[name="state"]').first();
      if (await stateSelect.count() > 0) {
        await stateSelect.selectOption('SP');
        console.log('✅ Estado selecionado');
      }
      
      // Termos
      const termsCheckbox = page.locator('input[name="terms"]').first();
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
        console.log('✅ Termos aceitos');
      }
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/checkout-filled-complete.png', fullPage: true });
      
      // Procurar e testar botão de submit
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        const isEnabled = await submitButton.isEnabled();
        console.log(`🔘 Botão de submit encontrado e habilitado: ${isEnabled}`);
        
        if (isEnabled) {
          console.log('🖱️ Clicando no botão de submit...');
          
          // Aguardar por resposta
          const responsePromise = page.waitForResponse(response => 
            response.url().includes('create-abacate-payment') ||
            response.url().includes('supabase') ||
            response.status() >= 400
          ).catch(() => null);
          
          await submitButton.click();
          console.log('✅ Botão clicado!');
          
          await page.waitForTimeout(5000);
          
          const response = await responsePromise;
          if (response) {
            console.log(`📡 Resposta: ${response.status()} - ${response.url()}`);
          }
          
          await page.screenshot({ path: 'tests/screenshots/checkout-after-submit.png', fullPage: true });
          
        } else {
          console.log('❌ Botão está desabilitado');
        }
      } else {
        console.log('❌ Botão de submit não encontrado');
      }
      
    } else {
      console.log('❌ Formulário ainda não encontrado mesmo com itens no carrinho');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    console.log('⏳ Aguardando 10 segundos para observação...');
    await page.waitForTimeout(10000);
    
    await browser.close();
    
    // Gerar relatório
    const report = {
      timestamp: new Date().toISOString(),
      consoleErrors,
      networkErrors,
      summary: {
        totalErrors: consoleErrors.length + networkErrors.length,
        consoleErrorCount: consoleErrors.length,
        networkErrorCount: networkErrors.length
      }
    };
    
    const reportPath = path.join('tests', 'reports', `checkout-with-cart-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 RESUMO DO TESTE COMPLETO:');
    console.log(`📄 Relatório salvo: ${reportPath}`);
    console.log(`🚨 Erros de console: ${consoleErrors.length}`);
    console.log(`🌐 Erros de rede: ${networkErrors.length}`);
    console.log(`📊 Total de erros: ${report.summary.totalErrors}`);
  }
}

testCheckoutWithCart().catch(console.error);