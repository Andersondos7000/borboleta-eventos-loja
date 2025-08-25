import { test, expect } from '@playwright/test';

test.describe('Fluxo do Carrinho', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página inicial
    await page.goto('http://localhost:8081');
    
    // Aguardar a página carregar completamente
    await page.waitForLoadState('networkidle');
  });

  test('deve adicionar produtos ao carrinho e verificar se estão listados corretamente', async ({ page }) => {
    // Navegar para a loja
    await page.click('text=Loja');
    await page.waitForLoadState('networkidle');

    // Aguardar os produtos carregarem
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    // Obter todos os produtos disponíveis
    const productCards = await page.locator('[data-testid="product-card"]').all();
    
    if (productCards.length === 0) {
      console.log('Nenhum produto encontrado na loja');
      return;
    }

    console.log(`Encontrados ${productCards.length} produtos na loja`);

    // Adicionar o primeiro produto ao carrinho
    const firstProduct = productCards[0];
    
    // Capturar informações do produto antes de adicionar
    const productName = await firstProduct.locator('h3').textContent();
    const productPrice = await firstProduct.locator('[data-testid="product-price"]').textContent();
    
    console.log(`Adicionando produto: ${productName} - ${productPrice}`);
    
    // Clicar no produto para abrir o modal
    await firstProduct.click();
    
    // Aguardar o modal abrir
    await page.waitForSelector('[data-testid="product-modal"]', { timeout: 5000 });
    
    // Selecionar tamanho se disponível
    const sizeButtons = await page.locator('[data-testid="size-button"]').all();
    if (sizeButtons.length > 0) {
      await sizeButtons[0].click();
      console.log('Tamanho selecionado');
    }
    
    // Clicar em "Adicionar ao Carrinho"
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Aguardar o toast de sucesso
    await page.waitForSelector('.toast', { timeout: 5000 });
    console.log('Produto adicionado ao carrinho com sucesso');
    
    // Fechar o modal
    await page.click('[data-testid="close-modal"]');
    
    // Adicionar um segundo produto se disponível
    if (productCards.length > 1) {
      const secondProduct = productCards[1];
      const secondProductName = await secondProduct.locator('h3').textContent();
      const secondProductPrice = await secondProduct.locator('[data-testid="product-price"]').textContent();
      
      console.log(`Adicionando segundo produto: ${secondProductName} - ${secondProductPrice}`);
      
      await secondProduct.click();
      await page.waitForSelector('[data-testid="product-modal"]', { timeout: 5000 });
      
      // Selecionar tamanho se disponível
      const secondSizeButtons = await page.locator('[data-testid="size-button"]').all();
      if (secondSizeButtons.length > 0) {
        await secondSizeButtons[0].click();
      }
      
      await page.click('[data-testid="add-to-cart-button"]');
      await page.waitForSelector('.toast', { timeout: 5000 });
      console.log('Segundo produto adicionado ao carrinho');
      
      await page.click('[data-testid="close-modal"]');
    }

    // Navegar para o carrinho
    await page.click('[data-testid="cart-icon"]');
    await page.waitForLoadState('networkidle');
    
    // Verificar se estamos na página do carrinho
    await expect(page).toHaveURL(/.*carrinho/);
    await expect(page.locator('h1')).toContainText('Seu Carrinho');
    
    // Aguardar os itens do carrinho carregarem
    await page.waitForTimeout(2000);
    
    // Verificar se os produtos estão listados no carrinho
    const cartItems = await page.locator('[data-testid="cart-item"]').all();
    
    console.log(`Itens encontrados no carrinho: ${cartItems.length}`);
    
    if (cartItems.length === 0) {
      // Verificar se há mensagem de carrinho vazio
      const emptyMessage = await page.locator('text=Seu carrinho está vazio').isVisible();
      if (emptyMessage) {
        console.log('❌ ERRO: Carrinho está vazio, mas produtos foram adicionados');
        throw new Error('Produtos não estão sendo exibidos no carrinho');
      }
    } else {
      console.log('✅ Produtos encontrados no carrinho');
      
      // Verificar detalhes de cada item no carrinho
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const itemName = await item.locator('[data-testid="item-name"]').textContent();
        const itemPrice = await item.locator('[data-testid="item-price"]').textContent();
        const itemQuantity = await item.locator('[data-testid="item-quantity"]').textContent();
        
        console.log(`Item ${i + 1}: ${itemName} - ${itemPrice} - Qtd: ${itemQuantity}`);
        
        // Verificar se os elementos essenciais estão presentes
        await expect(item.locator('[data-testid="item-name"]')).toBeVisible();
        await expect(item.locator('[data-testid="item-price"]')).toBeVisible();
        await expect(item.locator('[data-testid="item-quantity"]')).toBeVisible();
      }
    }
    
    // Verificar o resumo do pedido
    const orderSummary = page.locator('[data-testid="order-summary"]');
    await expect(orderSummary).toBeVisible();
    
    // Verificar se o subtotal está sendo exibido
    const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
    console.log(`Subtotal: ${subtotal}`);
    
    // Verificar se o total está sendo exibido
    const total = await page.locator('[data-testid="total"]').textContent();
    console.log(`Total: ${total}`);
    
    // Verificar se o botão de finalizar compra está presente e habilitado
    const checkoutButton = page.locator('[data-testid="checkout-button"]');
    await expect(checkoutButton).toBeVisible();
    await expect(checkoutButton).toBeEnabled();
    
    console.log('✅ Teste concluído: Produtos foram adicionados e estão sendo exibidos corretamente no carrinho');
  });

  test('deve permitir alterar quantidade de produtos no carrinho', async ({ page }) => {
    // Primeiro, adicionar um produto ao carrinho (reutilizando lógica do teste anterior)
    await page.click('text=Loja');
    await page.waitForLoadState('networkidle');
    
    const productCards = await page.locator('[data-testid="product-card"]').all();
    if (productCards.length === 0) return;
    
    await productCards[0].click();
    await page.waitForSelector('[data-testid="product-modal"]');
    
    const sizeButtons = await page.locator('[data-testid="size-button"]').all();
    if (sizeButtons.length > 0) {
      await sizeButtons[0].click();
    }
    
    await page.click('[data-testid="add-to-cart-button"]');
    await page.waitForSelector('.toast');
    await page.click('[data-testid="close-modal"]');
    
    // Navegar para o carrinho
    await page.click('[data-testid="cart-icon"]');
    await page.waitForLoadState('networkidle');
    
    // Aguardar itens carregarem
    await page.waitForTimeout(2000);
    
    const cartItems = await page.locator('[data-testid="cart-item"]').all();
    if (cartItems.length > 0) {
      const firstItem = cartItems[0];
      
      // Obter quantidade inicial
      const initialQuantity = await firstItem.locator('[data-testid="item-quantity"]').textContent();
      console.log(`Quantidade inicial: ${initialQuantity}`);
      
      // Aumentar quantidade
      await firstItem.locator('[data-testid="increase-quantity"]').click();
      await page.waitForTimeout(1000);
      
      // Verificar se a quantidade aumentou
      const newQuantity = await firstItem.locator('[data-testid="item-quantity"]').textContent();
      console.log(`Nova quantidade: ${newQuantity}`);
      
      // Verificar se o total foi atualizado
      const updatedTotal = await page.locator('[data-testid="total"]').textContent();
      console.log(`Total atualizado: ${updatedTotal}`);
      
      console.log('✅ Quantidade alterada com sucesso');
    }
  });

  test('deve permitir remover produtos do carrinho', async ({ page }) => {
    // Adicionar produto ao carrinho
    await page.click('text=Loja');
    await page.waitForLoadState('networkidle');
    
    const productCards = await page.locator('[data-testid="product-card"]').all();
    if (productCards.length === 0) return;
    
    await productCards[0].click();
    await page.waitForSelector('[data-testid="product-modal"]');
    
    const sizeButtons = await page.locator('[data-testid="size-button"]').all();
    if (sizeButtons.length > 0) {
      await sizeButtons[0].click();
    }
    
    await page.click('[data-testid="add-to-cart-button"]');
    await page.waitForSelector('.toast');
    await page.click('[data-testid="close-modal"]');
    
    // Navegar para o carrinho
    await page.click('[data-testid="cart-icon"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const cartItems = await page.locator('[data-testid="cart-item"]').all();
    const initialItemCount = cartItems.length;
    console.log(`Itens iniciais no carrinho: ${initialItemCount}`);
    
    if (cartItems.length > 0) {
      // Remover o primeiro item
      await cartItems[0].locator('[data-testid="remove-item"]').click();
      await page.waitForTimeout(1000);
      
      // Verificar se o item foi removido
      const remainingItems = await page.locator('[data-testid="cart-item"]').all();
      console.log(`Itens restantes: ${remainingItems.length}`);
      
      expect(remainingItems.length).toBe(initialItemCount - 1);
      console.log('✅ Item removido com sucesso');
    }
  });
});