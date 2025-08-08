# Configuração do Webhook Abacate Pay

## Informações do Webhook

- **ID do Endpoint**: `webh_dev_AWChUaMh0HTZKDtTPxsBAWpf`
- **URL**: `https://borboletaeventos-stripe.ultrahook.com/webhook/abacatepay?webhookSecret=cust_WXZjN2KjwbqtkUbnufkyPHLL`
- **Descrição**: borboletaeventos
- **Webhook Secret**: `cust_WXZjN2KjwbqtkUbnufkyPHLL`

## Configuração das Variáveis de Ambiente

As seguintes variáveis foram configuradas no arquivo `.env.local`:

```env
# Abacate Pay
ABACATEPAY_API_KEY="abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n"
ABACATEPAY_WEBHOOK_SECRET="cust_WXZjN2KjwbqtkUbnufkyPHLL"
```

## Funcionalidades Implementadas

### 1. Validação de Assinatura HMAC
- A função webhook valida a assinatura `X-Abacate-Signature` usando HMAC SHA256
- Garante que apenas requisições autênticas do Abacate Pay sejam processadas
- Formato esperado: `sha256=<hash>`

### 2. Processamento Robusto do Payload
- Suporte para diferentes estruturas de payload do Abacate Pay
- Busca por `id` (charge ID) ou `transaction_id` no payload
- Validação de campos obrigatórios (`status`)
- Logs detalhados para facilitar debugging

### 3. Atualização de Pedidos
- Atualiza o status do pedido na tabela `orders`
- Busca por `abacate_charge_id` (preferencial) ou `id`
- Tratamento de casos onde o pedido não é encontrado
- Logs de sucesso e erro detalhados

## Estrutura Esperada do Payload

```json
{
  "id": "charge_id_from_abacate",
  "status": "paid|pending|failed|cancelled",
  "transaction_id": "optional_transaction_id",
  "amount": 1000,
  "customer": {
    "name": "Nome do Cliente",
    "email": "cliente@email.com"
  }
}
```

## Deploy da Função

Para aplicar as alterações na função webhook:

```bash
supabase functions deploy abacate-webhook
```

## Testando o Webhook

### 1. Usando UltraHook (Desenvolvimento)
O UltraHook está configurado para redirecionar webhooks para o ambiente local:
- URL pública: `https://borboletaeventos-stripe.ultrahook.com/webhook/abacatepay`
- Redirecionamento: Para sua função Supabase local

### 2. Logs de Debug
Monitore os logs da função para verificar:
- Validação de assinatura
- Payload recebido
- Atualizações no banco de dados
- Erros e avisos

### 3. Teste Manual
Você pode testar enviando uma requisição POST para a função:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/abacate-webhook \
  -H "Content-Type: application/json" \
  -H "X-Abacate-Signature: sha256=<calculated_hmac>" \
  -d '{
    "id": "test_charge_id",
    "status": "paid"
  }'
```

## Próximos Passos

1. **Deploy das Funções**: Execute `supabase functions deploy` para aplicar todas as alterações
2. **Teste End-to-End**: Faça um pedido completo e verifique se o webhook atualiza o status
3. **Monitoramento**: Configure alertas para falhas de webhook
4. **Produção**: Substitua a URL do UltraHook pela URL real da função em produção

## Troubleshooting

### Webhook não está sendo chamado
- Verifique se a URL está correta no painel do Abacate Pay
- Confirme se o UltraHook está rodando (desenvolvimento)
- Verifique os logs do Abacate Pay para erros de entrega

### Erro de assinatura inválida
- Confirme se o `ABACATEPAY_WEBHOOK_SECRET` está correto
- Verifique se o formato da assinatura está como esperado
- Compare a assinatura recebida com a calculada nos logs

### Pedido não encontrado
- Verifique se o `abacate_charge_id` foi salvo corretamente na criação do pedido
- Confirme se o payload contém o ID correto
- Verifique os logs para ver qual campo está sendo usado na busca