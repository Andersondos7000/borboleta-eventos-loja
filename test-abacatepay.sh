#!/bin/bash

curl -X POST "https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/abacatepay-manager" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NTI5NzEsImV4cCI6MjA1MDEyODk3MX0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8" \
  -H "Content-Type: application/json" \
  -d '{
    "orderData": {
      "firstName": "João Silva",
      "lastName": "Santos",
      "phone": "+5511999999999",
      "cpf": "123.456.789-00"
    },
    "total": 29.90,
    "items": [
      {
        "productId": "test-product",
        "price": 29.90,
        "quantity": 1
      }
    ],
    "isTestUser": true
  }'

echo ""
echo "Teste concluído!"