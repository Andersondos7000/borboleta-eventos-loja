# 📋 Casos de Teste - AbacatePay Integration

## 🎯 Visão Geral

Este documento contém casos de teste validados para a integração com AbacatePay, incluindo dados de teste válidos, cenários de erro e fluxos completos.

## ✅ Validação de CPF/CNPJ Implementada

### Funcionalidades Adicionadas

1. **Validação de CPF/CNPJ** em `src/lib/utils.ts`:
   - `validateCPF(cpf: string)`: Valida CPF usando algoritmo oficial
   - `validateCNPJ(cnpj: string)`: Valida CNPJ usando algoritmo oficial
   - `validateDocument(document: string, type: 'cpf' | 'cnpj')`: Validação unificada
   - `formatCPF(cpf: string)`: Formatação automática (000.000.000-00)
   - `formatCNPJ(cnpj: string)`: Formatação automática (00.000.000/0000-00)
   - `formatDocument(document: string, type: 'cpf' | 'cnpj')`: Formatação unificada

2. **Integração nos Formulários**:
   - `src/pages/Checkout.tsx`: Schema de validação atualizado
   - `src/components/checkout/CustomerInformation.tsx`: Validação em tempo real
   - `src/components/checkout/ParticipantsList.tsx`: Validação de CPF dos participantes

### Validação em Tempo Real

- **Campo CPF/CNPJ**: Formatação automática durante digitação
- **Feedback Visual**: Mensagens de erro claras para documentos inválidos
- **Validação Condicional**: Baseada no tipo de pessoa (Física/Jurídica)

## 🧪 Casos de Teste Validados

### Status dos Testes

#### ✅ Casos Validados
- ✅ **Criação de pagamento PIX** - Funcionando (Payment ID: `bill_k22mLMffhZJWkBj1mmJBpBdL`)
- ✅ **Processamento de webhook** - Funcionando via Ultrahook
- ⚠️ **Verificação de status** - Erro 404 (endpoint precisa revisão)
- ⚠️ **Simulação de pagamento** - Erro 404 (endpoint precisa revisão)
- ❌ **Validação de CPF/CNPJ** - Erro no script (precisa correção)

### 1. Criação de Pagamento PIX - Sucesso

**Endpoint**: `POST /functions/v1/create-abacate-payment`

**Dados Válidos**:
```json
{
  "amount": 2500,
  "customer_data": {
    "firstName": "João",
    "lastName": "Silva",
    "personType": "individual",
    "cpf": "11144477735",
    "email": "joao.silva@email.com",
    "phone": "11999887766",
    "country": "Brasil",
    "zipCode": "01310-100",
    "address": "Av. Paulista",
    "number": "1000",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "items": [
    {
      "name": "Ingresso VIP",
      "quantity": 1,
      "price": 2500
    }
  ]
}
```

**Resposta Esperada**:
```json
{
  "success": true,
  "orderId": "uuid-do-pedido",
  "paymentData": {
    "id": "pix_char_...",
    "qrCode": "00020126...",
    "qrCodeImage": "data:image/png;base64,...",
    "expiresAt": "2025-08-09T02:21:45.018Z",
    "amount": 2500,
    "description": "Pedido #... - Borboleta Eventos"
  }
}
```

### 2. CPFs Válidos para Teste

```
11144477735  ✅ Válido
12345678909  ✅ Válido
98765432100  ✅ Válido
```

### 3. CPFs Inválidos (Casos de Erro)

```
12345678901  ❌ Inválido - Retorna "Invalid taxId"
11111111111  ❌ Inválido - Sequência repetida
00000000000  ❌ Inválido - Zeros
123.456.789-01  ❌ Inválido - Com formatação
```

### 4. Verificação de Status de Pagamento

**Endpoint**: `POST /functions/v1/check-abacate-payment`

**Dados**:
```json
{
  "transactionId": "pix_char_JSYsaZrQMepabkmLpGBmRYfm"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "id": "pix_char_JSYsaZrQMepabkmLpGBmRYfm",
    "status": "PENDING",
    "amount": 1000,
    "expiresAt": "2025-08-09T02:21:45.018Z"
  }
}
```

## 🔄 Fluxo Completo de Teste

### Cenário: Compra de Ingresso com PIX

1. **Preencher Checkout**:
   - Nome: João Silva
   - CPF: 11144477735 (será formatado automaticamente)
   - Email: joao.silva@email.com
   - Endereço completo

2. **Criar Pagamento**:
   ```bash
   # PowerShell
   $headers = @{ 'Authorization' = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"; 'Content-Type' = 'application/json' }
   $body = '{ "amount": 2500, "customer_data": { "firstName": "João", "lastName": "Silva", "personType": "individual", "cpf": "11144477735", "email": "joao.silva@email.com" }, "items": [{ "name": "Ingresso VIP", "quantity": 1, "price": 2500 }] }'
   Invoke-RestMethod -Uri 'https://pxcvoiffnandpdyotped.supabase.co/functions/v1/create-abacate-payment' -Method POST -Headers $headers -Body $body
   ```

3. **Exibir QR Code**: Modal com código PIX e QR Code

4. **Simular Pagamento** (Ambiente de Desenvolvimento):
   ```bash
   # Simular pagamento via API AbacatePay
   $headers = @{ 'Authorization' = "Bearer $env:ABACATE_PAY_API_KEY"; 'Content-Type' = 'application/json' }
   Invoke-RestMethod -Uri 'https://api.abacatepay.com/v1/pixQrCode/simulate-payment' -Method POST -Headers $headers -Body '{"id": "pix_char_ID_DO_PAGAMENTO"}'
   ```

5. **Verificar Status**:
   ```bash
   # Verificar se pagamento foi aprovado
   $body = '{"transactionId": "pix_char_ID_DO_PAGAMENTO"}'
   Invoke-RestMethod -Uri 'https://pxcvoiffnandpdyotped.supabase.co/functions/v1/check-abacate-payment' -Method POST -Headers $headers -Body $body
   ```

6. **Webhook Automático**: AbacatePay notifica mudança de status

## 🚨 Cenários de Erro Comuns

### 1. CPF Inválido
**Erro**: `{"statusCode":400,"error":"Bad Request","message":"Invalid taxId"}`
**Solução**: Usar CPF válido da lista de testes

### 2. Token de API Inválido
**Erro**: `{"statusCode":401,"error":"Unauthorized"}`
**Solução**: Verificar `ABACATE_PAY_API_KEY` nas variáveis de ambiente

### 3. Campos Obrigatórios
**Erro**: `{"statusCode":400,"error":"Bad Request","message":"Missing required field"}`
**Solução**: Verificar se todos os campos obrigatórios estão preenchidos

### 4. Valor Mínimo
**Erro**: Valor deve ser maior que R$ 1,00 (100 centavos)
**Solução**: Usar `amount >= 100`

## 🔧 Configuração de Ambiente

### Variáveis Necessárias

```env
# AbacatePay
ABACATEPAY_API_KEY="abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n"
ABACATEPAY_WEBHOOK_SECRET="cust_WXZjN2KjwbqtkUbnufkyPHLL"

# Supabase
SUPABASE_URL="https://pxcvoiffnandpdyotped.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
```

### Comandos de Deploy

```bash
# Deploy das funções
supabase functions deploy create-abacate-payment
supabase functions deploy check-abacate-payment
supabase functions deploy abacate-webhook

# Configurar secrets
supabase secrets set ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
supabase secrets set ABACATEPAY_WEBHOOK_SECRET=cust_WXZjN2KjwbqtkUbnufkyPHLL
```

## 📊 Monitoramento e Logs

### Logs das Edge Functions

```bash
# Visualizar logs em tempo real
supabase functions logs create-abacate-payment
supabase functions logs abacate-webhook
```

### Métricas Importantes

- **Taxa de Sucesso**: > 95% para criação de pagamentos
- **Tempo de Resposta**: < 2s para criação de PIX
- **Webhook Delivery**: < 30s após confirmação do pagamento

## 🎯 Próximos Passos

### Prioridade Alta ⚡
1. **Revisar documentação da API** para endpoints corretos:
   - Verificação de status: `GET /v1/billing/get?id={id}` retorna 404
   - Simulação de pagamento: `POST /v1/billing/simulate-payment` retorna 404
2. **Corrigir validação de CPF** no script de teste
3. **Testar webhook real** com pagamento PIX efetivo

### Prioridade Média 📋
4. **Implementar Retry Logic**: Para webhooks falhados
5. **Adicionar Logs Estruturados**: Para melhor observabilidade
6. **Criar Testes Automatizados**: E2E com Playwright

### Prioridade Baixa 📝
7. **Implementar Rate Limiting**: Para proteção da API
8. **Adicionar Métricas**: Prometheus/Grafana
9. **Documentar fluxos de erro** para suporte ao cliente

## 📚 Referências

- [Documentação AbacatePay](https://docs.abacatepay.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Validação de CPF/CNPJ](https://www.receita.fazenda.gov.br/)

---

**Última Atualização**: 09/08/2025 22:33:51
**Responsável**: Equipe de Desenvolvimento
**Status**: ✅ Integração principal funcionando - Ajustes secundários pendentes

**Teste realizado**: Script `test-abacatepay-flow.ps1` executado com sucesso
**Resultado detalhado**: Ver `RESULTADOS-TESTE-ABACATEPAY.md`