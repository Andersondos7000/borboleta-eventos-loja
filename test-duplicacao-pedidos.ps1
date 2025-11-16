# Script PowerShell para testar duplicação de pedidos
# Este script simula múltiplas tentativas de criar pedidos

$ErrorActionPreference = "Stop"

# Configuração
$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:VITE_SUPABASE_ANON_KEY
$EDGE_FUNCTION_URL = "$SUPABASE_URL/functions/v1/criar-cobranca-optimized"

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "❌ Erro: Variáveis de ambiente não configuradas" -ForegroundColor Red
    Write-Host "   Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Iniciando testes de duplicação de pedidos..." -ForegroundColor Green
Write-Host "=" * 60

# Função para criar um pedido
function Create-Order {
    param(
        [int]$AttemptNumber,
        [string]$ExternalId
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $idempotencyKey = "test_key_$(Get-Date -UFormat %s)_$AttemptNumber"
    
    $body = @{
        customer = @{
            name = "Teste Duplicação"
            email = "teste.duplicacao.$(Get-Date -UFormat %s)@teste.com"
            phone = "11999999999"
            document = "12345678901"
        }
        amount = 90000
        description = "Teste de duplicação de pedidos"
        items = @(
            @{
                nome = "Ingresso Teste"
                quantidade = 10
                preco = 9000
            }
        )
        external_id = $ExternalId
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $EDGE_FUNCTION_URL -Method POST -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "x-idempotency-key" = $idempotencyKey
        } -Body $body
        
        return @{
            Attempt = $AttemptNumber
            Success = $true
            ExternalId = $response.data.external_id
            PaymentId = $response.data.pix.id
            OrderId = $response.data.id
            Timestamp = $timestamp
        }
    } catch {
        return @{
            Attempt = $AttemptNumber
            Success = $false
            Error = $_.Exception.Message
            Timestamp = $timestamp
        }
    }
}

# Teste 1: Criar múltiplos pedidos com o mesmo external_id
Write-Host "`n🧪 TESTE 1: Criar múltiplos pedidos com o mesmo external_id" -ForegroundColor Cyan
Write-Host "=" * 60

$externalId = "teste_same_external_$(Get-Date -UFormat %s)"
$results = @()

for ($i = 1; $i -le 3; $i++) {
    Write-Host "`n📝 Tentativa $i/3..." -ForegroundColor Yellow
    $result = Create-Order -AttemptNumber $i -ExternalId $externalId
    $results += $result
    
    if ($result.Success) {
        Write-Host "✅ Pedido criado: $($result.ExternalId)" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro: $($result.Error)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 1
}

# Verificar duplicatas (requer acesso ao Supabase)
Write-Host "`n🔍 Verificando duplicatas..." -ForegroundColor Cyan
Write-Host "   (Execute a query SQL em verificar-duplicatas-pedido.sql para verificar)" -ForegroundColor Yellow

# Teste 2: Criar pedidos simultâneos
Write-Host "`n🧪 TESTE 2: Criar pedidos simultâneos (condição de corrida)" -ForegroundColor Cyan
Write-Host "=" * 60

$concurrentExternalId = "teste_concurrent_$(Get-Date -UFormat %s)"
$jobs = @()

Write-Host "`n🚀 Criando 5 pedidos simultaneamente..." -ForegroundColor Yellow

for ($i = 1; $i -le 5; $i++) {
    $job = Start-Job -ScriptBlock {
        param($url, $key, $externalId, $attempt)
        
        $body = @{
            customer = @{
                name = "Teste Duplicação"
                email = "teste.duplicacao.$attempt@teste.com"
                phone = "11999999999"
                document = "12345678901"
            }
            amount = 90000
            description = "Teste de duplicação de pedidos"
            items = @(
                @{
                    nome = "Ingresso Teste"
                    quantidade = 10
                    preco = 9000
                }
            )
            external_id = $externalId
        } | ConvertTo-Json -Depth 10
        
        try {
            $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer $key"
                "x-idempotency-key" = "test_key_$attempt"
            } -Body $body
            
            return @{
                Success = $true
                ExternalId = $response.data.external_id
                PaymentId = $response.data.pix.id
            }
        } catch {
            return @{
                Success = $false
                Error = $_.Exception.Message
            }
        }
    } -ArgumentList $EDGE_FUNCTION_URL, $SUPABASE_ANON_KEY, $concurrentExternalId, $i
    
    $jobs += $job
}

# Aguardar conclusão de todos os jobs
$concurrentResults = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$successCount = ($concurrentResults | Where-Object { $_.Success }).Count
Write-Host "`n✅ Pedidos criados com sucesso: $successCount/5" -ForegroundColor $(if ($successCount -eq 5) { "Green" } else { "Yellow" })

Write-Host "`n✅ Testes concluídos!" -ForegroundColor Green
Write-Host "   Execute a query SQL em verificar-duplicatas-pedido.sql para verificar duplicatas no banco" -ForegroundColor Yellow

