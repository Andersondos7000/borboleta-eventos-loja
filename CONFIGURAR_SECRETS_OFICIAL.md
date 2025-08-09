# 🔐 Configuração de Secrets - Documentação Oficial Supabase

## 📚 **Baseado na Documentação Oficial:**
`https://supabase.com/docs/guides/functions/secrets`

## 🎯 **Para o Projeto Borboleta Eventos**

### ✅ **Desenvolvimento Local (Já Configurado)**
Arquivo `.env.local` criado com:
```env
ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
```

### 🚀 **Produção - 2 Métodos Oficiais**

## **Método 1: Via Dashboard (Recomendado)**

### 🌐 **Link Direto:**
https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/settings/functions

### 📋 **Passos:**
1. **Acesse** o link acima (já aberto no Chrome)
2. **Vá para** "Edge Function Secrets Management"
3. **Adicione**:
   - **Key**: `ABACATE_PAY_API_KEY`
   - **Value**: `abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`
4. **Clique** em "Save"

## **Método 2: Via CLI**

### 🔧 **Comando Individual:**
```bash
supabase secrets set ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
```

### 📁 **Via Arquivo .env:**
1. **Crie** `supabase/functions/.env`:
```env
ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
```

2. **Execute**:
```bash
supabase secrets set --env-file supabase/functions/.env
```

### 🔍 **Verificar Secrets:**
```bash
supabase secrets list
```

## ✅ **Vantagens de Cada Método**

### 🌐 **Dashboard:**
- ✅ Interface visual
- ✅ Fácil de usar
- ✅ Não precisa de CLI
- ✅ Pode adicionar múltiplos secrets

### 💻 **CLI:**
- ✅ Automação
- ✅ Controle de versão (com cuidado)
- ✅ Batch operations
- ✅ Integração CI/CD

## 🔄 **Como as Funções Edge Acessam**

```typescript
// Nas funções edge (já implementado)
const apiKey = Deno.env.get("ABACATE_PAY_API_KEY");

// Exemplo de uso
const response = await fetch("https://api.abacatepay.com/v1/pixQrCode/create", {
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  }
});
```

## ⚡ **Importante da Documentação:**

### ✅ **Secrets Padrão Disponíveis:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### ⚠️ **Segurança:**
- ❌ **NUNCA** commite arquivos .env
- ✅ **SEMPRE** adicione ao .gitignore
- ✅ **USE** service_role apenas em funções edge
- ❌ **NUNCA** exponha service_role no frontend

### 🚀 **Deploy:**
- ✅ **Não precisa** re-deploy após configurar secrets
- ✅ **Disponível imediatamente** nas funções
- ✅ **Visível** no dashboard após configurar

## 🎯 **Próximo Passo:**
1. **Acesse** o dashboard no Chrome
2. **Configure** o secret via interface
3. **Teste** o sistema de pagamento

**Link direto já aberto:** https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/settings/functions
