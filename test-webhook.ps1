$headers = @{
    "Content-Type" = "application/json"
}

$body = '{
    "event": "payment_received",
    "data": {
        "id": "pay_curl_test_123",
        "status": "paid",
        "amount": 5000,
        "payment_method": "pix",
        "customer": {
            "name": "Cliente Teste Curl",
            "email": "cliente.teste.curl@example.com",
            "tax_id": "12345678901"
        },
        "billing": {
            "id": "bill_curl_test_456"
        },
        "external_reference": "ref_curl_test_789"
    }
}'

Invoke-WebRequest -Uri "https://recebimento-webh-dev-abacatepay.ultrahook.com" -Method POST -Headers $headers -Body $body