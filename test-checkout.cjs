const { chromium } = require('playwright');

async function testCheckout() {
  console.log('🚀 Iniciando teste do checkout via browser...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para a página de checkout
    console.log('📍 Navegando para http://localhost:8081/checkout');
    await page.goto('http://localhost:8081/checkout', { waitUntil: 'networkidle' });
    
    // Aguardar a página carregar completamente
    await page.waitForTimeout(3000);
    
    // Capturar screenshot da página inicial
    await page.screenshot({ path: 'checkout-inicial.png', fullPage: true });
    console.log('📸 Screenshot inicial capturado: checkout-inicial.png');
    
    // Verificar se existem elementos de pagamento
    const paymentElements = await page.$$('[data-testid*="payment"], [class*="payment"], [id*="payment"]');
    console.log(`🔍 Encontrados ${paymentElements.length} elementos relacionados ao pagamento`);
    
    // Procurar por botões de pagamento
    const paymentButtons = await page.$$('button[type="submit"], button[class*="pay"], button[class*="checkout"]');
    console.log(`💳 Encontrados ${paymentButtons.length} botões de pagamento`);
    
    // Verificar se há formulários de pagamento
    const forms = await page.$$('form');
    console.log(`📝 Encontrados ${forms.length} formulários na página`);
    
    // Procurar especificamente por elementos PIX
    const pixElements = await page.$$('[data-testid*="pix"], [class*="pix"], [id*="pix"]');
    console.log(`🏦 Encontrados ${pixElements.length} elementos relacionados ao PIX`);
    
    // Tentar encontrar e clicar no botão PIX se existir
    const pixButton = await page.$('button:has-text("PIX"), [data-payment="pix"], [class*="pix-button"]');
    if (pixButton) {
      console.log('🎯 Botão PIX encontrado! Clicando...');
      await pixButton.click();
      await page.waitForTimeout(2000);
      
      // Capturar screenshot após clicar no PIX
      await page.screenshot({ path: 'checkout-pix-modal.png', fullPage: true });
      console.log('📸 Screenshot do modal PIX capturado: checkout-pix-modal.png');
      
      // Verificar se o modal PIX apareceu
      const modal = await page.$('[class*="modal"], [class*="popup"], [role="dialog"]');
      if (modal) {
        console.log('✅ Modal PIX detectado!');
        
        // Procurar por QR Code
        const qrCode = await page.$('[class*="qr"], [id*="qr"], img[alt*="qr"]');
        if (qrCode) {
          console.log('📱 QR Code PIX encontrado!');
        }
        
        // Procurar por código PIX
        const pixCode = await page.$('[class*="pix-code"], [data-testid*="pix-code"]');
        if (pixCode) {
          const code = await pixCode.textContent();
          console.log('🔢 Código PIX encontrado:', code?.substring(0, 50) + '...');
        }
      }
    } else {
      console.log('❌ Botão PIX não encontrado');
    }
    
    // Aguardar um pouco para observar
    await page.waitForTimeout(5000);
    
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    await page.screenshot({ path: 'checkout-erro.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Executar o teste
testCheckout().catch(console.error);