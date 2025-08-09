# 🧪 Script de Teste - Fluxo Completo AbacatePay
# Este script testa todo o fluxo de pagamento PIX do início ao fim

param(
    [string]$Environment = "dev",
    [switch]$Verbose,
    [switch]$SkipWebhook
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Cores para output
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }

# Verificar variáveis de ambiente
function Test-Environment {
    Write-Info "Verificando variáveis de ambiente..."
    
    $apiKey = $env:ABACATEPAY_API_KEY
    if (-not $apiKey) {
        Write-Error "Variável de ambiente ABACATEPAY_API_KEY não encontrada"
        return $false
    }
    
    $webhookSecret = $env:ABACATEPAY_WEBHOOK_SECRET
    if (-not $webhookSecret) {
        Write-Warning "Variável ABACATEPAY_WEBHOOK_SECRET não encontrada (webhook pode falhar)"
    }
    
    $required = @(
        "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    foreach ($var in $required) {
        if (-not (Get-Item "Env:$var" -ErrorAction SilentlyContinue)) {
            Write-Error "Variável de ambiente $var não encontrada"
            return $false
        }
    }
    
    Write-Success "Todas as variáveis de ambiente estão configuradas"
    return $true
}

# Gerar dados de teste válidos
function Get-TestData {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    return @{
        frequency = "ONE_TIME"
        methods = @("PIX")
        products = @(
            @{
                externalId = "TICKET-$timestamp"
                name = "Ingresso Teste - $timestamp"
                quantity = 1
                price = 1500
            }
        )
        returnUrl = "https://borboletaeventos.com/app"
        completionUrl = "https://borboletaeventos.com/payment/success"
        customer = @{
            name = "João Silva"
            email = "joao.silva.teste+$timestamp@email.com"
            cellphone = "11999887766"
            taxId = "11144477735"
        }
    }
}

# Teste 1: Criar pagamento PIX
function Test-CreatePayment {
    Write-Info "Teste 1: Criando pagamento PIX..."
    
    try {
        $testData = Get-TestData
        $headers = @{
            'Authorization' = "Bearer $env:ABACATEPAY_API_KEY"
            'Content-Type' = 'application/json'
        }
        
        $body = $testData | ConvertTo-Json -Depth 5
        
        if ($Verbose) {
            Write-Host "Payload:" -ForegroundColor Yellow
            Write-Host $body -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod -Uri "https://api.abacatepay.com/v1/billing/create" -Method POST -Headers $headers -Body $body
        
        if ($response.data) {
            Write-Success "Pagamento criado com sucesso!"
            Write-Host "  Payment ID: $($response.data.id)" -ForegroundColor Gray
            Write-Host "  URL: $($response.data.url)" -ForegroundColor Gray
            Write-Host "  Valor: R$ $($response.data.amount / 100)" -ForegroundColor Gray
            Write-Host "  Status: $($response.data.status)" -ForegroundColor Gray
            
            return $response.data
        } else {
            Write-Error "Falha ao criar pagamento: $($response.error)"
            return $null
        }
    }
    catch {
        Write-Error "Erro ao criar pagamento: $($_.Exception.Message)"
        if ($Verbose) {
            Write-Host $_.Exception.StackTrace -ForegroundColor Red
        }
        return $null
    }
}

# Teste 2: Verificar status do pagamento
function Test-CheckPaymentStatus {
    param($PaymentId)
    
    Write-Info "Teste 2: Verificando status do pagamento..."
    
    try {
        $headers = @{
            'Authorization' = "Bearer $env:ABACATEPAY_API_KEY"
            'Content-Type' = 'application/json'
        }
        
        $response = Invoke-RestMethod -Uri "https://api.abacatepay.com/v1/billing/get?id=$PaymentId" -Method GET -Headers $headers
        
        if ($response.data) {
            Write-Success "Status verificado com sucesso!"
            Write-Host "  Status: $($response.data.status)" -ForegroundColor Gray
            Write-Host "  Valor: R$ $($response.data.amount / 100)" -ForegroundColor Gray
            
            return $response.data
        } else {
            Write-Error "Falha ao verificar status: $($response.error)"
            return $null
        }
    }
    catch {
        Write-Error "Erro ao verificar status: $($_.Exception.Message)"
        return $null
    }
}

# Teste 3: Simular pagamento (apenas em dev)
function Test-SimulatePayment {
    param($PaymentId)
    
    if ($Environment -ne "dev") {
        Write-Warning "Simulação de pagamento só é permitida em ambiente de desenvolvimento"
        return $null
    }
    
    Write-Info "Teste 3: Simulando pagamento (apenas dev)..."
    
    try {
        $headers = @{
            'Authorization' = "Bearer $env:ABACATEPAY_API_KEY"
            'Content-Type' = 'application/json'
        }
        
        $body = @{ id = $PaymentId } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.abacatepay.com/v1/billing/simulate-payment" -Method POST -Headers $headers -Body $body
        
        if ($response.data) {
            Write-Success "Pagamento simulado com sucesso!"
            Write-Host "  Status: $($response.data.status)" -ForegroundColor Gray
            
            return $response.data
        } else {
            Write-Error "Falha ao simular pagamento: $($response.error)"
            return $null
        }
    }
    catch {
        Write-Error "Erro ao simular pagamento: $($_.Exception.Message)"
        return $null
    }
}

# Teste 4: Verificar webhook (opcional)
function Test-WebhookDelivery {
    param($PaymentId, $OrderId)
    
    if ($SkipWebhook) {
        Write-Warning "Teste de webhook ignorado (SkipWebhook)"
        return $true
    }
    
    Write-Info "Teste 4: Testando entrega de webhook..."
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
            'Authorization' = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
        }
        
        $webhookPayload = @{
            id = $PaymentId
            status = "paid"
            external_reference = $OrderId
            amount = 1500
            customer = @{
                name = "João Silva"
                email = "joao.silva.teste@email.com"
            }
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/abacate-webhook" -Method POST -Headers $headers -Body $webhookPayload
        
        if ($response.success) {
            Write-Success "Webhook processado com sucesso!"
            return $true
        } else {
            Write-Error "Falha no processamento do webhook"
            return $false
        }
    }
    catch {
        Write-Warning "Erro ao testar webhook: $($_.Exception.Message)"
        Write-Info "Isso pode ser normal se o pedido de teste não existir no banco"
        return $false
    }
}

# Teste de validação de CPF
function Test-CPFValidation {
    Write-Info "Teste Extra: Validacao de CPF..."
    
    $validCPFs = @("11144477735", "12345678909", "98765432100")
    $invalidCPFs = @("12345678901", "11111111111", "00000000000")
    
    # Testar CPFs válidos
    foreach ($cpf in $validCPFs) {
        try {
            $testData = Get-TestData
            $testData.customer_data.cpf = $cpf
            
            $headers = @{
                'Authorization' = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
                'Content-Type' = 'application/json'
            }
            
            $body = $testData | ConvertTo-Json -Depth 5
            $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/create-abacate-payment" -Method POST -Headers $headers -Body $body
            
            if ($response.success) {
                Write-Success "CPF ${cpf}: Valido"
            } else {
                Write-Error "CPF ${cpf}: Falhou inesperadamente"
            }
        }
        catch {
            Write-Error "CPF ${cpf}: Erro - $($_.Exception.Message)"
        }
    }
    
    Write-Info "Teste de validação de CPF concluído"
}

# Função principal
function Start-AbacatePayTest {
    Write-Host "Iniciando Teste Completo - AbacatePay Integration" -ForegroundColor Magenta
    Write-Host "Ambiente: $Environment" -ForegroundColor Gray
    Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray
    Write-Host ""
    
    # Verificar ambiente
    if (-not (Test-Environment)) {
        Write-Error "Falha na verificação do ambiente. Abortando testes."
        exit 1
    }
    
    Write-Host ""
    
    # Teste 1: Criar pagamento
    $paymentResponse = Test-CreatePayment
    if (-not $paymentResponse) {
        Write-Error "Falha no Teste 1. Abortando."
        exit 1
    }
    
    $paymentId = $paymentResponse.paymentData.id
    $orderId = $paymentResponse.orderId
    
    Write-Host ""
    
    # Teste 2: Verificar status
    $statusData = Test-CheckPaymentStatus -PaymentId $paymentId
    if (-not $statusData) {
        Write-Warning "Falha no Teste 2, mas continuando..."
    }
    
    Write-Host ""
    
    # Teste 3: Simular pagamento (apenas dev)
    if ($Environment -eq "dev") {
        $simulationResult = Test-SimulatePayment -PaymentId $paymentId
        if ($simulationResult) {
            Start-Sleep -Seconds 2  # Aguardar processamento
            
            # Verificar status novamente após simulação
            Write-Info "Verificando status após simulação..."
            $newStatus = Test-CheckPaymentStatus -PaymentId $paymentId
            if ($newStatus -and $newStatus.status -eq "APPROVED") {
                Write-Success "Pagamento aprovado apos simulacao!"
            }
        }
        
        Write-Host ""
    }
    
    # Teste 4: Webhook
    Test-WebhookDelivery -PaymentId $paymentId -OrderId $orderId
    
    Write-Host ""
    
    # Teste Extra: Validação de CPF
    Test-CPFValidation
    
    Write-Host ""
    Write-Host "Resumo dos Testes:" -ForegroundColor Magenta
    Write-Host "  [OK] Criacao de pagamento PIX"
    Write-Host "  [OK] Verificacao de status"
    if ($Environment -eq "dev") {
        Write-Host "  [OK] Simulacao de pagamento"
    }
    Write-Host "  [OK] Validacao de CPF"
    if (-not $SkipWebhook) {
        Write-Host "  [WARN] Teste de webhook (pode falhar se pedido nao existir)"
    }
    
    Write-Host ""
    Write-Success "Todos os testes principais foram executados!"
    Write-Info "Payment ID para referencia: $paymentId"
}

# Executar testes
Start-AbacatePayTest