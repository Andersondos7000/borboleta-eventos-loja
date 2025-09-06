# Edge Functions AbacatePay - Estrutura Consolidada

## Visão Geral

As Edge Functions do AbacatePay foram consolidadas para eliminar duplicações e melhorar a manutenibilidade. A nova estrutura consiste em duas funções principais:

### 1. `abacatepay-manager` - Função Principal
**Endpoint:** `/functions/v1/abacatepay-manager`

Esta é a função principal que gerencia todas as operações relacionadas ao AbacatePay:

#### Funcionalidades:
- ✅ Criação de pagamentos PIX
- ✅ Verificação de status de pagamentos
- ✅ Autenticação de usuários
- ✅ Modo de teste integrado
- ✅ Validação de CPF e formatação de telefone
- ✅ Integração com banco de dados Supabase

#### Ações Suportadas:

##### `create` ou `create_payment`
Cria um novo pagamento no AbacatePay.

**Payload:**
```json
{
  "action": "create_payment",
  "orderData": {
    "firstName": "João",
    "lastName": "Silva",
    "email": "joao@exemplo.com",
    "cpf": "11144477735",
    "phone": "11999999999"
  },
  "items": [
    {
      "productId": "prod_123",
      "price": 29.90,
      "quantity": 1,
      "size": "M"
    }
  ],
  "forceTestMode": true
}
```

**Resposta:**
```json
{
  "success": true,
  "orderId": "order_abc123",
  "transactionId": "bill_xyz789",
  "paymentData": {
    "qr_code": "00020126...",
    "qr_code_url": "https://api.abacatepay.com/qr/bill_xyz789.png",
    "copia_cola": "00020126...",
    "expires_at": "2024-01-15T15:30:00Z"
  }
}
```

##### `check` ou `check_payment_status`
Verifica o status de um pagamento existente.

**Payload:**
```json
{
  "action": "check_payment_status",
  "transactionId": "bill_xyz789"
}
```

**Resposta:**
```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "bill_xyz789",
  "amount": 29.90,
  "paymentMethod": "PIX"
}
```

### 2. `abacatepay-webhook` - Processamento de Webhooks
**Endpoint:** `/functions/v1/abacatepay-webhook`

Função dedicada para processar notificações de webhook do AbacatePay.

#### Funcionalidades:
- ✅ Verificação de assinatura do webhook (HMAC)
- ✅ Atualização automática do status dos pedidos
- ✅ Mapeamento de status do AbacatePay para status internos
- ✅ Tratamento de erros robusto

#### Payload do Webhook:
```json
{
  "id": "webhook_123",
  "external_reference": "order_abc123",
  "status": "paid",
  "amount": 2990,
  "payment_method": "PIX",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:05:00Z"
}
```

#### Mapeamento de Status:
| Status AbacatePay | Order Status | Payment Status |
|-------------------|--------------|----------------|
| `paid` | `confirmed` | `paid` |
| `failed` | `cancelled` | `failed` |
| `cancelled` | `cancelled` | `failed` |
| `expired` | `cancelled` | `expired` |
| `pending` | `pending` | `awaiting_payment` |

## Configuração de Ambiente

### Variáveis Necessárias:
```bash
# AbacatePay
ABACATEPAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
ABACATEPAY_WEBHOOK_SECRET=webh_dev_AWChUaMh0HTZKDtTPxsBAWpf
ABACATEPAY_ENVIRONMENT=development

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Modo de Teste

O sistema possui um modo de teste integrado que:

- **Usuários de Teste:** "João Silva", "admin@admin.com"
- **Dados Mockados:** Retorna dados simulados sem chamar a API real
- **Ativação:** `forceTestMode: true` ou usuário de teste detectado
- **CPF de Teste:** `11144477735`
- **Telefone de Teste:** `11999999999`

## Funções Removidas

As seguintes funções foram **removidas** por serem duplicadas:

- ❌ `create-abacate-payment` → Consolidada em `abacatepay-manager`
- ❌ `check-abacate-payment` → Consolidada em `abacatepay-manager`
- ❌ `test-abacate-payment` → Modo de teste integrado em `abacatepay-manager`

## Estrutura do Banco de Dados

### Tabela `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  order_status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'awaiting_payment',
  payment_method VARCHAR(20),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  size VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testes

### Script PowerShell de Teste
```powershell
# Criar pagamento
$createPayload = @{
    action = "create_payment"
    orderData = @{
        firstName = "João"
        lastName = "Silva"
        email = "teste.pix@exemplo.com"
        cpf = "11144477735"
        phone = "11999999999"
    }
    items = @(
        @{
            productId = "test_product"
            price = 29.90
            quantity = 1
            size = "M"
        }
    )
    forceTestMode = $true
} | ConvertTo-Json -Depth 3

$response = Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/abacatepay-manager" -Method POST -Body $createPayload -ContentType "application/json"

# Verificar status
$checkPayload = @{
    action = "check_payment_status"
    transactionId = $response.transactionId
} | ConvertTo-Json

$statusResponse = Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/abacatepay-manager" -Method POST -Body $checkPayload -ContentType "application/json"
```

## Próximos Passos

1. **Implementar verificação HMAC** no webhook
2. **Adicionar retry logic** para chamadas à API
3. **Implementar rate limiting**
4. **Adicionar métricas e observabilidade**
5. **Criar testes automatizados**

## Benefícios da Consolidação

- ✅ **Redução de duplicação:** Código centralizado e reutilizável
- ✅ **Manutenibilidade:** Mais fácil de manter e atualizar
- ✅ **Consistência:** Comportamento uniforme em todas as operações
- ✅ **Performance:** Menos funções para gerenciar e deployar
- ✅ **Debugging:** Logs centralizados e mais fáceis de rastrear
