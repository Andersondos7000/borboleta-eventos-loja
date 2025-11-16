# Script para testar o endpoint de webhook manualmente
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🧪 TESTE DE WEBHOOK - ENDPOINT ABACATEPAY" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$webhookUrl = "https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/webhook-abacatepay"
$testPayload = @{
    event = "billing.paid"
    data = @{
        pixQrCode = @{
            id = "pix_char_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
            status = "PAID"
            amount = 10000
            external_reference = "test-order-$(Get-Date -Format 'yyyyMMddHHmmss')"
            customer = @{
                metadata = @{
                    name = "Teste Webhook"
                    email = "teste@example.com"
                    cellphone = "11999999999"
                    taxId = "12345678901"
                }
            }
        }
        payment = @{
            amount = 10000
            fee = 80
            method = "PIX"
        }
    }
    devMode = $true
} | ConvertTo-Json -Depth 10

Write-Host "📡 Enviando webhook de teste..." -ForegroundColor Yellow
Write-Host "URL: $webhookUrl" -ForegroundColor Gray
Write-Host "Payload:" -ForegroundColor Gray
Write-Host $testPayload -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $testPayload -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Webhook enviado com sucesso!" -ForegroundColor Green
    Write-Host "Resposta:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📊 Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Verifique os logs do Supabase:" -ForegroundColor White
    Write-Host "   npx supabase functions logs webhook-abacatepay --project-ref ojxmfxbflbfinodkhixk" -ForegroundColor Gray
    Write-Host "2. Verifique o dashboard: http://localhost:8082/admin/webhooks" -ForegroundColor White
    Write-Host "3. Verifique os webhooks no banco de dados" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erro ao enviar webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Teste concluído!" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

