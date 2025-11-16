# Script PowerShell para testar AbacatePay API

$API_KEY = "abc_dev_fhb5Dh0s24wHQ6XWgFAGdzjc"
$BASE_URL = "https://api.abacatepay.com/v1"

Write-Host "=== TESTE ABACATEPAY API ===" -ForegroundColor Green
Write-Host ""

# Headers para autenticação
$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

# Charges encontrados no Supabase
$chargeIds = @(
    "pix_char_bzG4rN3Q6gDcTYdbt2wcuhmB",  # Do pedido ca7fc474-da12-48f0-ac05-cedf84bc2f37
    "pix_char_qa0tuHAts3ZZ",              # Mencionado pelo usuário
    "pix_char_bzG4rN3Q6qD"                # Mencionado pelo usuário
)

foreach ($chargeId in $chargeIds) {
    Write-Host "--- Consultando charge: $chargeId ---" -ForegroundColor Yellow
    
    # Tentar diferentes endpoints
    $endpoints = @(
        "/billing/get/$chargeId",
        "/billing/$chargeId", 
        "/charge/$chargeId",
        "/charges/$chargeId",
        "/payment/$chargeId",
        "/payments/$chargeId"
    )
    
    foreach ($endpoint in $endpoints) {
        $url = "$BASE_URL$endpoint"
        Write-Host "Tentando: $url"
        
        try {
            $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
            Write-Host "✅ SUCESSO! Dados encontrados:" -ForegroundColor Green
            $response | ConvertTo-Json -Depth 10
            
            # Verificar valor
            if ($response.valor) {
                $valorReais = $response.valor / 100
                Write-Host "💰 Valor: R$ $($valorReais.ToString('F2'))" -ForegroundColor Cyan
            }
            break
        }
        catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "❌ Status $statusCode - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Tentar listar todas as cobranças
Write-Host "--- Tentando listar todas as cobranças ---" -ForegroundColor Yellow
$listEndpoints = @(
    "/billing/list",
    "/billing",
    "/billings", 
    "/charges",
    "/payments"
)

foreach ($endpoint in $listEndpoints) {
    $url = "$BASE_URL$endpoint"
    Write-Host "Tentando listar: $url"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "✅ SUCESSO! Lista de cobranças:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
        break
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ Status $statusCode - $($_.Exception.Message)" -ForegroundColor Red
    }
}