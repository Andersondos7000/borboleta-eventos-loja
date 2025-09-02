# Integração AbacatePay - Documentação Completa

## 📋 Visão Geral

Este documento descreve a implementação completa da integração com o gateway de pagamento AbacatePay no projeto Queren.

## 🚀 Configuração

### Credenciais de Desenvolvimento

```env
ABACATEPAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
ABACATEPAY_WEBHOOK_SECRET=webh_dev_AWChUaMh0HTZKDtTPxsBAWpf
ABACATEPAY_ENVIRONMENT=development
```

### Edge Function

A integração é realizada através da Edge Function `abacatepay-manager` localizada em:
```
supabase/functions/abacatepay-manager/index.ts
```

## 🏗️ Arquitetura

### Estrutura de Banco de Dados

#### Tabela `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  size TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Funcionalidades Implementadas

### 1. Criação de Pagamentos

**Endpoint:** `POST /functions/v1/abacatepay-manager`

**Payload:**
```json
{
  "action": "create_payment",
  "total_amount": 100,
  "items": [
    {
      "product_id": "1",
      "quantity": 2,
      "price": 50,
      "size": "M"
    }
  ],
  "returnUrl": "https://exemplo.com/sucesso"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "orderId": "test-order-1756500580384",
  "paymentData": {
    "data": {
      "id": "bill_tefmbFAdWT0Mc6uPFfBHRcx1",
      "url": "https://checkout.abacatepay.com/...",
      "customer": {
        "name": "João Silva",
        "cellphone": "11999999999",
        "taxId": "11144477735",
        "email": "teste.pix@exemplo.com"
      }
    }
  }
}
```

### 2. Verificação de Status

**Endpoint:** `POST /functions/v1/abacatepay-manager`

**Payload:**
```json
{
  "action": "check_status",
  "transactionId": "bill_tefmbFAdWT0Mc6uPFfBHRcx1"
}
```

## 🧪 Testes

### Script de Teste PowerShell

O arquivo `test-abacatepay-manager.ps1` contém testes automatizados para:
- Criação de pagamentos
- Verificação de status
- Validação de respostas

**Executar testes:**
```powershell
./test-abacatepay-manager.ps1
```

### Dados de Teste

**Cliente de Teste:**
- Nome: João Silva
- Email: teste.pix@exemplo.com
- CPF: 11144477735 (válido)
- Telefone: 11999999999

## 🔐 Segurança

### Validação de CPF

O sistema valida CPFs usando um formato válido para evitar erros da API:
```typescript
taxId: orderData.cpf.replace(/[^0-9]/g, '') // Remove formatação
```

### Modo de Teste

Atualmente, a função está configurada com `forceTestMode = true` para evitar inserções no banco até que as migrações sejam aplicadas:

```typescript
const forceTestMode = true;
if (isTestUser(orderData, isTestFlag) || forceTestMode) {
  // Usa dados mock
}
```

## 📊 Status da Implementação

### ✅ Funcionalidades Completas

- [x] Edge Function `abacatepay-manager`
- [x] Criação de pagamentos via API
- [x] Validação de dados de entrada
- [x] Tratamento de erros
- [x] Logs estruturados
- [x] Testes automatizados
- [x] CPF válido para testes

### 🔄 Em Desenvolvimento

- [ ] Aplicação de migrações no banco remoto
- [ ] Webhooks para notificações
- [ ] Interface de usuário para checkout
- [ ] Modo de produção

### ⚠️ Problemas Resolvidos

1. **Erro da coluna 'total'** → Corrigido para `total_amount`
2. **CPF inválido** → Substituído por CPF válido `11144477735`
3. **Tabela orders inexistente** → Modo de teste implementado

## 🚀 Próximos Passos

1. **Aplicar Migrações:**
   ```bash
   supabase db push
   ```

2. **Remover Modo de Teste:**
   ```typescript
   const forceTestMode = false; // Alterar para false
   ```

3. **Implementar Webhooks:**
   - Endpoint para receber notificações
   - Validação HMAC
   - Atualização de status de pedidos

4. **Interface de Checkout:**
   - Componente React para pagamentos
   - Integração com carrinho
   - Redirecionamento pós-pagamento

## 📞 Suporte

### Recursos Oficiais
- **Documentação:** https://docs.abacatepay.com
- **Dashboard:** https://dashboard.abacatepay.com
- **Suporte:** suporte@abacatepay.com

### Logs e Debug

**Verificar logs da Edge Function:**
```bash
supabase functions logs abacatepay-manager
```

**Testar API diretamente:**
```bash
curl -X POST https://api.abacatepay.com/v1/billing \
  -H "Authorization: Bearer abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "description": "Teste"}'
```

---

**Última atualização:** 28/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ Funcional para desenvolvimento