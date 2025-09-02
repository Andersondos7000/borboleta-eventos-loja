# Teste da função consolidada abacatepay-manager

# Usar token anônimo diretamente
$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjUwODAsImV4cCI6MjA3MDUwMTA4MH0.CNziCYvVGA3EUXSJfigtSGuYYiOn7wGE9FfBxlLsE-o'
    'Content-Type' = 'application/json'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjUwODAsImV4cCI6MjA3MDUwMTA4MH0.CNziCYvVGA3EUXSJfigtSGuYYiOn7wGE9FfBxlLsE-o'
}

$url = 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/abacatepay-manager'

$body = @{
    action = 'create_payment'
    total_amount = 100
    items = @(
        @{
            product_id = '1'
            quantity = 2
            price = 50
            size = 'M'
        }
    )
    returnUrl = 'https://exemplo.com/sucesso'
} | ConvertTo-Json -Depth 3

Write-Host "Testando criação de pagamento..."
Write-Host "URL: $url"
Write-Host "Body: $body"

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body
    Write-Host "Sucesso!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}

# Teste de verificação de status
Write-Host "`n--- Testando verificação de status ---"
$checkUrl = 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/abacatepay-manager'

# Extrair o transactionId da resposta anterior
$transactionId = if ($response -and $response.paymentData -and $response.paymentData.id) {
    $response.paymentData.id
} elseif ($response -and $response.data -and $response.data.id) {
    # Tentar extrair do campo data.id
    $response.data.id
} elseif ($response -and $response.orderId) {
    # Se não tiver paymentData.id, usar o orderId como fallback
    $response.orderId
} else {
    Write-Host "Aviso: Não foi possível extrair transactionId da resposta. Usando fallback." -ForegroundColor Yellow
    "pix_char_test123"  # fallback para teste
}

Write-Host "Resposta completa da criação:" -ForegroundColor Cyan
Write-Host ($response | ConvertTo-Json -Depth 5)

# Debug: mostrar estrutura da resposta
Write-Host "\nDebug - Estrutura completa da resposta:" -ForegroundColor Yellow
Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Cyan

Write-Host "\nDebug - Campos disponíveis na resposta:" -ForegroundColor Yellow
if ($response.paymentData) {
    Write-Host "paymentData.id: $($response.paymentData.id)" -ForegroundColor Yellow
}
if ($response.data) {
    Write-Host "data existe: $($response.data -ne $null)" -ForegroundColor Yellow
    Write-Host "data.id: $($response.data.id)" -ForegroundColor Yellow
}
if ($response.orderId) {
    Write-Host "orderId: $($response.orderId)" -ForegroundColor Yellow
}

# Tentar extrair o ID correto da estrutura de resposta
if ($response.paymentData -and $response.paymentData.data -and $response.paymentData.data.id) {
    $transactionId = $response.paymentData.data.id
    Write-Host "Usando paymentData.data.id: $transactionId" -ForegroundColor Green
} elseif ($response.data -and $response.data.id) {
    $transactionId = $response.data.id
    Write-Host "Usando data.id: $transactionId" -ForegroundColor Green
} elseif ($response.paymentData -and $response.paymentData.id) {
    $transactionId = $response.paymentData.id
    Write-Host "Usando paymentData.id: $transactionId" -ForegroundColor Green
} else {
    Write-Host "ID da cobrança não encontrado, pulando teste de verificação de status" -ForegroundColor Yellow
    exit 0
}

$checkBody = @{
    action = 'check_payment_status'
    transaction_id = $transactionId
} | ConvertTo-Json

Write-Host "\nVerificando status para transactionId: $transactionId"

try {
    $checkResponse = Invoke-RestMethod -Uri $checkUrl -Method POST -Headers $headers -Body $checkBody
    Write-Host "Verificação de status - Sucesso!" -ForegroundColor Green
    Write-Host ($checkResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Verificação de status - Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}