# 🌐 Guia de Configuração via Chrome - Supabase Dashboard

## ✅ **Chrome Aberto Automaticamente**
O Chrome foi aberto com a URL: 
`https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/settings/environment-variables`

## 📋 **Passos para Configurar a API Key**

### 1. **Login no Supabase** (se necessário)
- Se não estiver logado, faça login com suas credenciais
- Aguarde carregar o dashboard

### 2. **Navegar para Environment Variables**
- Você já deve estar na página correta
- Se não, vá para: **Settings** → **Environment Variables**

### 3. **Adicionar Nova Variável**
Clique em **"Add Variable"** ou **"New Environment Variable"** e configure:

```
Name: ABACATE_PAY_API_KEY
Value: abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
```

### 4. **Salvar**
- Clique em **"Save"** ou **"Add"**
- Aguarde a confirmação de que foi salvo

### 5. **Verificar**
- A variável deve aparecer na lista
- Status deve estar como "Active"

## 🔄 **Após Configurar**

### Reiniciar Funções Edge (Opcional)
As funções edge podem precisar ser reiniciadas para pegar a nova variável:
- Vá para **Edge Functions** no dashboard
- Clique em cada função e depois em **"Restart"** se disponível

### Testar o Sistema
1. Volte para a aplicação: http://localhost:8083/
2. Faça um teste de checkout completo
3. Verifique se o PIX é gerado corretamente
4. Teste a verificação de pagamento

## ⚠️ **Importante**
- **Nome da variável**: Deve ser exatamente `ABACATE_PAY_API_KEY`
- **Valor**: `abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`
- **Não adicione aspas** no valor
- **Case-sensitive**: Respeite maiúsculas e minúsculas

## 🎯 **Resultado Esperado**
Após configurar, o sistema de pagamento PIX funcionará tanto em:
- ✅ **Desenvolvimento local** (já configurado via .env.local)
- ✅ **Produção** (configurado via dashboard)

## 🆘 **Se Tiver Problemas**
- Verifique se o nome da variável está correto
- Confirme se o valor foi colado sem espaços extras
- Aguarde alguns minutos para propagação
- Teste novamente o sistema de checkout
