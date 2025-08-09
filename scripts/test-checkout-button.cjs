const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCheckoutButton() {
  console.log('🧪 Iniciando teste do botão de checkout...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // 1 segundo entre ações para visualização
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capturar erros de console
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
    console.log('🌐 Navegando para a página de checkout...');
    await page.goto('http://localhost:3002/checkout', { waitUntil: 'networkidle' });
    
    // Aguardar a página carregar completamente
    await page.waitForTimeout(3000);
    
    console.log('📸 Capturando screenshot inicial...');
    await page.screenshot({ path: 'tests/screenshots/checkout-initial.png', fullPage: true });
    
    // Verificar se o formulário está presente
    console.log('🔍 Verificando presença do formulário...');
    const form = await page.locator('form').first();
    const formExists = await form.count() > 0;
    console.log(`📋 Formulário encontrado: ${formExists}`);
    
    if (formExists) {
      // Preencher campos obrigatórios
      console.log('✏️ Preenchendo campos obrigatórios...');
      
      // Nome
      const firstNameField = page.locator('input[name="firstName"], input[placeholder*="nome"]').first();
      if (await firstNameField.count() > 0) {
        await firstNameField.fill('João');
        console.log('✅ Campo nome preenchido');
      }
      
      // Sobrenome
      const lastNameField = page.locator('input[name="lastName"], input[placeholder*="sobrenome"]').first();
      if (await lastNameField.count() > 0) {
        await lastNameField.fill('Silva');
        console.log('✅ Campo sobrenome preenchido');
      }
      
      // CPF
      const cpfField = page.locator('input[name="cpf"], input[placeholder*="CPF"]').first();
      if (await cpfField.count() > 0) {
        await cpfField.fill('123.456.789-00');
        console.log('✅ Campo CPF preenchido');
      }
      
      // CEP
      const zipField = page.locator('input[name="zipCode"], input[placeholder*="CEP"]').first();
      if (await zipField.count() > 0) {
        await zipField.fill('01234-567');
        console.log('✅ Campo CEP preenchido');
      }
      
      // Endereço
      const addressField = page.locator('input[name="address"], input[placeholder*="endereço"], input[placeholder*="Rua"]').first();
      if (await addressField.count() > 0) {
        await addressField.fill('Rua das Flores, 123');
        console.log('✅ Campo endereço preenchido');
      }
      
      // Número
      const numberField = page.locator('input[name="number"], input[placeholder*="123"]').first();
      if (await numberField.count() > 0) {
        await numberField.fill('123');
        console.log('✅ Campo número preenchido');
      }
      
      // Cidade
      const cityField = page.locator('input[name="city"], input[placeholder*="cidade"]').first();
      if (await cityField.count() > 0) {
        await cityField.fill('São Paulo');
        console.log('✅ Campo cidade preenchido');
      }
      
      // Estado
      const stateField = page.locator('select[name="state"], [role="combobox"]').first();
      if (await stateField.count() > 0) {
        await stateField.click();
        await page.waitForTimeout(1000);
        const spOption = page.locator('text="SP"').first();
        if (await spOption.count() > 0) {
          await spOption.click();
          console.log('✅ Campo estado preenchido');
        }
      }
      
      // Telefone
      const phoneField = page.locator('input[name="phone"], input[placeholder*="telefone"], input[placeholder*="celular"]').first();
      if (await phoneField.count() > 0) {
        await phoneField.fill('(11) 99999-9999');
        console.log('✅ Campo telefone preenchido');
      }
      
      // Termos
      const termsCheckbox = page.locator('input[name="terms"], input[type="checkbox"]').last();
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
        console.log('✅ Termos aceitos');
      }
      
      await page.waitForTimeout(2000);
      
      console.log('📸 Capturando screenshot com formulário preenchido...');
      await page.screenshot({ path: 'tests/screenshots/checkout-filled.png', fullPage: true });
      
      // Procurar botão de submit
      console.log('🔍 Procurando botão de submit...');
      const submitButtons = [
        'button[type="submit"]',
        'button:has-text("Fazer Pedido")',
        'button:has-text("Finalizar")',
        'button:has-text("Pagar")',
        'input[type="submit"]'
      ];
      
      let submitButton = null;
      for (const selector of submitButtons) {
        const button = page.locator(selector).first();
        if (await button.count() > 0) {
          submitButton = button;
          console.log(`✅ Botão encontrado com seletor: ${selector}`);
          break;
        }
      }
      
      if (submitButton) {
        // Verificar se o botão está habilitado
        const isEnabled = await submitButton.isEnabled();
        console.log(`🔘 Botão habilitado: ${isEnabled}`);
        
        if (isEnabled) {
          console.log('🖱️ Clicando no botão de submit...');
          
          // Aguardar por mudanças na página após o clique
          const responsePromise = page.waitForResponse(response => 
            response.url().includes('create-abacate-payment') || 
            response.url().includes('checkout') ||
            response.status() !== 200
          ).catch(() => null);
          
          await submitButton.click();
          
          console.log('⏳ Aguardando resposta...');
          await page.waitForTimeout(5000);
          
          const response = await responsePromise;
          if (response) {
            console.log(`📡 Resposta recebida: ${response.status()} - ${response.url()}`);
          } else {
            console.log('⚠️ Nenhuma resposta de rede detectada');
          }
          
          console.log('📸 Capturando screenshot após clique...');
          await page.screenshot({ path: 'tests/screenshots/checkout-after-click.png', fullPage: true });
          
        } else {
          console.log('❌ Botão está desabilitado');
        }
      } else {
        console.log('❌ Botão de submit não encontrado');
      }
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
    
    const reportPath = path.join('tests', 'reports', `checkout-button-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 RESUMO DO TESTE:');
    console.log(`📄 Relatório salvo: ${reportPath}`);
    console.log(`🚨 Erros de console: ${consoleErrors.length}`);
    console.log(`🌐 Erros de rede: ${networkErrors.length}`);
    console.log(`📊 Total de erros: ${report.summary.totalErrors}`);
    
    if (report.summary.totalErrors === 0) {
      console.log('✅ Teste concluído sem erros!');
    } else {
      console.log('❌ Teste concluído com erros - verifique o relatório');
    }
  }
}

testCheckoutButton().catch(console.error);