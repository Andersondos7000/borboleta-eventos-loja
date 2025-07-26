# ✅ Configuração da API Key via MCP do Supabase

## 🎯 **Status Atual**
- ✅ Função `check-abacate-payment` atualizada via MCP
- ✅ Parâmetro corrigido de `transactionId` para `id` conforme documentação
- ✅ API Key local configurada: `abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`

## 🔧 **Configuração da Variável de Ambiente**

### Via Dashboard do Supabase (Recomendado):
1. **Acesse**: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped
2. **Navegue**: Settings → Environment Variables
3. **Adicione**:
   - **Name**: `ABACATE_PAY_API_KEY`
   - **Value**: `abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`
4. **Salve** e aguarde a propagação

### Via CLI (Alternativo):
```bash
# Instalar CLI se necessário
npm install -g supabase

# Login
supabase login

# Configurar secret
supabase secrets set ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n --project-ref pxcvoiffnandpdyotped
```

## 📋 **Funções Edge Atualizadas**

### ✅ check-abacate-payment
- Atualizada via MCP
- Usando parâmetro correto `?id=` na URL
- Versão: 3 (mais recente)

### ✅ create-abacate-payment  
- Já configurada localmente
- Gerando PIX corretamente

## 🧪 **Teste do Sistema**

1. **Desenvolvimento Local**: ✅ Funcionando
   - Arquivo `.env.local` criado
   - API key configurada

2. **Produção**: ⏳ Pendente
   - Configurar variável no dashboard do Supabase

## 🚀 **Próximos Passos**

1. Configure a variável no dashboard do Supabase
2. Teste o sistema completo:
   - Gerar PIX no checkout
   - Verificar status do pagamento
   - Confirmar funcionamento end-to-end

## 📱 **Links Úteis**
- **Dashboard do Projeto**: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped
- **Environment Variables**: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/settings/environment-variables
- **Edge Functions**: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/functions
