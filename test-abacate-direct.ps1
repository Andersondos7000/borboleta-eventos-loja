# Teste direto da API AbacatePay

$headers = @{
    "Authorization" = "Bearer abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n"
    "Content-Type" = "application/json"
}

$body = @{
    frequency = "ONE_TIME"
    methods = @("PIX")
    products = @(
        @{
            externalId = "prod-1234"
            name = "Mensalidade - Plano Básico"
            description = "Acesso ao plano básico por 1 mês"
            quantity = 1
            price = 2990
        }
    )
    returnUrl = "https://example.com/return"
    completionUrl = "https://example.com/completion"
    customer = @{
        name = "Ana Silva"
        cellphone = "(11) 99999-9999"
        email = "ana@email.com"
        taxId = "123.456.789-01"
    }
    allowCoupons = $false
}

$jsonBody = $body | ConvertTo-Json -Depth 10
Write-Host "Body JSON: $jsonBody"
Write-Host "Content-Length: $($jsonBody.Length)"

try {
    $response = Invoke-RestMethod -Uri "https://api.abacatepay.com/v1/billing/create" -Method POST -Headers $headers -Body $jsonBody
    Write-Host "Sucesso!"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Erro: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}