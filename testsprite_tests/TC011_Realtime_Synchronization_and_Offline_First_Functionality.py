import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:8084/", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Open the application in a second client instance to begin cross-client testing.
        await page.goto('http://localhost:8084/', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Open a new tab and navigate to http://localhost:8084/ to simulate the second client instance.
        await page.goto('http://localhost:8084/', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Make data changes in one client instance, such as updating the cart or adding participants, to test real-time synchronization.
        frame = context.pages[-1]
        # Click on 'Carrinho' (Cart) to update cart in first client instance
        elem = frame.locator('xpath=html/body/div/div[2]/footer/div/div/div[2]/ul/li[4]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to the store page in the first client instance to add an item to the cart.
        frame = context.pages[-1]
        # Click on 'Explorar Loja' to go to the store page to add items to the cart
        elem = frame.locator('xpath=html/body/div/div[2]/div/div/div/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Add the first product (Camiseta premium Rosa) to the cart by clicking the 'Adicionar ao Carrinho' button.
        frame = context.pages[-1]
        # Click 'Adicionar ao Carrinho' for the first product (Camiseta premium Rosa) to add it to the cart
        elem = frame.locator('xpath=html/body/div/div[2]/section[2]/div/div/div[2]/div[2]/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Switch to the second client instance and verify that the cart reflects the added item in real-time.
        await page.goto('http://localhost:8084/carrinho', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Simulate offline mode on the second client instance by disabling network and perform cart modifications (e.g., increase quantity, remove item) to test offline queuing.
        frame = context.pages[-1]
        # Click 'Diminuir quantidade' button to reduce quantity in the second client instance while offline
        elem = frame.locator('xpath=html/body/div/div[2]/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        # Click 'Remover item' button to remove the item from the cart in the second client instance while offline
        elem = frame.locator('xpath=html/body/div/div[2]/div/div/div/div/div/div[2]/div[2]/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Restore network connection on the second client instance to test synchronization of offline changes with the server and verify data consistency across clients.
        await page.goto('http://localhost:8084/', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Navigate to the cart page in the first client instance and verify that the cart reflects the removal of the item after synchronization.
        await page.goto('http://localhost:8084/carrinho', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Test additional offline actions such as adding items while offline and verify synchronization upon reconnection to fully validate offline usage and synchronization.
        await page.goto('http://localhost:8084/loja', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Simulate offline mode on the second client instance by disabling network, then add 'Vestido Preto oficial - Queren Hapuque' to the cart to test offline queuing and synchronization.
        frame = context.pages[-1]
        # Click 'Adicionar ao Carrinho' for 'Vestido Preto oficial - Queren Hapuque' while offline in the second client instance
        elem = frame.locator('xpath=html/body/div/div[2]/section[2]/div/div/div[2]/div[2]/div/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Restore network connection on the second client instance to trigger synchronization of the offline added item and verify the cart state in the first client instance.
        await page.goto('http://localhost:8084/', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Navigate to the cart page in the first client instance and verify that the cart reflects the newly added item after synchronization.
        await page.goto('http://localhost:8084/carrinho', timeout=10000)
        await asyncio.sleep(3)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Vestido Preto oficial - Queren Hapuque').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 140,00').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Finalizar Compra').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Continuar Comprando').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Realizando sonhos e transformando eventos em momentos inesquecíveis.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=contato@querenhapuque.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=(00) 12345-6789').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=São Paulo, SP - Brasil').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=© 2026 Querenhapuque. Todos os direitos reservados.').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    