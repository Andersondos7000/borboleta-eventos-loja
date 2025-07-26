# 🔐 Configurar Autenticação para Localhost

## 🎯 **Problema Identificado**
A autenticação está redirecionando para:
- ❌ **Atual**: `https://preview--borboleta-eventos-loja.lovable.app/#`
- ✅ **Necessário**: `http://localhost:8083` (ou porta que está rodando)

## 🌐 **Chrome Aberto em:**
`https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/auth/url-configuration`

## 📋 **Configurações Necessárias**

### 1. **Site URL**
```
http://localhost:8083
```

### 2. **Additional Redirect URLs**
Adicione todas as portas que você pode usar:
```
http://localhost:3000
http://localhost:8080
http://localhost:8081
http://localhost:8082
http://localhost:8083
http://127.0.0.1:8083
```

### 3. **Configuração Atual no config.toml**
No arquivo `supabase/config.toml` já está configurado:
```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
```

## 🔧 **Passos no Dashboard**

### No Chrome (URL de configuração já aberta):

1. **Site URL**:
   - Altere para: `http://localhost:8083`
   - Ou use a porta que sua aplicação está rodando

2. **Additional Redirect URLs**:
   - Clique em "Add URL"
   - Adicione: `http://localhost:8083`
   - Adicione: `http://127.0.0.1:8083`
   - Adicione outras portas se necessário

3. **Salvar**:
   - Clique em "Save" ou "Update"

## 🔍 **Verificar Porta Atual**
Sua aplicação está rodando em: **http://localhost:8083/**
(Conforme visto no terminal anterior)

## ⚙️ **Configuração Alternativa via MCP**

Posso tentar atualizar via MCP do Supabase se necessário, mas o dashboard é mais direto.

## 🧪 **Testar Após Configurar**

1. **Acesse**: http://localhost:8083/
2. **Tente fazer login** com Google
3. **Verifique** se redireciona corretamente para localhost
4. **Teste** o checkout completo

## 📱 **URLs Importantes**
- **App Local**: http://localhost:8083/
- **Config Auth**: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/auth/url-configuration
- **Dashboard**: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped

## ⚠️ **Importante**
Após alterar as URLs:
- Aguarde 1-2 minutos para propagação
- Limpe o cache do navegador se necessário
- Teste o login novamente
