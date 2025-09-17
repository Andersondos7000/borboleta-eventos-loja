const { chromium } = require('playwright');

async function testPaymentFlow() {
  console.log('🚀 Iniciando teste do fluxo de pagamento...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Navegar para a página inicial
    console.log('📍 Navegando para a página inicial...');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-home.png', fullPage: true });
    
    // 2. Adicionar produtos ao carrinho
    console.log('🛒 Adicionando produtos ao carrinho...');
    const addToCartButtons = await page.locator('button:has-text("Adicionar"), button:has-text("Comprar"), [data-testid="add-to-cart"]').all();
    
    if (addToCartButtons.length > 0) {
      await addToCartButtons[0].click();
      await page.waitForTimeout(1000);
      console.log('✅ Produto adicionado ao carrinho');
    } else {
      console.log('⚠️ Nenhum botão de adicionar ao carrinho encontrado');
    }
    
    // 3. Ir para o carrinho
    console.log('🛍️ Navegando para o carrinho...');
    const cartButton = page.locator('a[href*="carrinho"], a[href*="cart"], button:has-text("Carrinho")');
    if (await cartButton.count() > 0) {
      await cartButton.first().click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('http://localhost:8081/carrinho');
    }
    await page.screenshot({ path: 'test-cart.png', fullPage: true });
    
    // 4. Ir para o checkout
    console.log('💳 Navegando para o checkout...');
    const checkoutButton = page.locator('button:has-text("Finalizar"), button:has-text("Checkout"), a[href*="checkout"]');
    if (await checkoutButton.count() > 0) {
      await checkoutButton.first().click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('http://localhost:8081/checkout');
    }
    await page.screenshot({ path: 'test-checkout-page.png', fullPage: true });
    
    // 5. Testar elementos de pagamento
    console.log('🔍 Verificando elementos de pagamento...');
    
    // Verificar se há formulários de pagamento
    const paymentForms = await page.locator('form, [data-testid*="payment"], .payment-form').count();
    console.log(`📋 Formulários de pagamento encontrados: ${paymentForms}`);
    
    // Verificar botões de pagamento
        const paymentButtons = await page.locator('button:has-text("Pagar"), [data-testid*="payment"], .payment-button').count();
        console.log(`💰 Botões de pagamento encontrados: ${paymentButtons}`);
    
    // Verificar opções PIX
    const pixOptions = await page.locator('button:has-text("PIX"), [data-testid*="pix"], .pix').count();
    console.log(`🏦 Opções PIX encontradas: ${pixOptions}`);
    
    // 6. Testar clique em botão de pagamento (se existir)
    if (paymentButtons > 0) {
            console.log('🎯 Testando clique no botão de pagamento...');
            await page.locator('button:has-text("Pagar"), [data-testid*="payment"], .payment-button').first().click();
      await page.waitForTimeout(2000);
      
      // Verificar se modal abriu
      const modals = await page.locator('.modal, [role="dialog"], .popup').count();
      console.log(`🪟 Modais encontrados após clique: ${modals}`);
      
      await page.screenshot({ path: 'test-payment-modal.png', fullPage: true });
    }
    
    // 7. Testar PIX se disponível
    if (pixOptions > 0) {
      console.log('🎯 Testando opção PIX...');
      await page.locator('button:has-text("PIX"), [data-testid*="pix"], .pix').first().click();
      await page.waitForTimeout(2000);
      
      // Verificar QR Code
      const qrCodes = await page.locator('img[alt*="qr"], .qr-code, [data-testid*="qr"]').count();
      console.log(`📱 QR Codes encontrados: ${qrCodes}`);
      
      await page.screenshot({ path: 'test-pix-qr.png', fullPage: true });
    }
    
    // 8. Verificar informações da ordem
    console.log('📊 Verificando informações da ordem...');
    const orderInfo = await page.locator('.order-summary, .order-info, [data-testid*="order"]').count();
    console.log(`📋 Resumos de pedido encontrados: ${orderInfo}`);
    
    const totalPrices = await page.locator('.total, .price, [data-testid*="total"]').count();
    console.log(`💵 Elementos de preço encontrados: ${totalPrices}`);
    
    console.log('✅ Teste do fluxo de pagamento concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testPaymentFlow().catch(console.error);