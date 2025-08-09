# ⚡ Solução Rápida - Configurar Auth para Localhost

## 🎯 **Problema**: Login redirecionando para produção em vez de localhost

## 🔧 **Solução Manual (2 minutos)**

### 📱 **No Chrome (já aberto):**
`https://supabase.com/dashboard/project/pxcvoiffnandpdyotped/auth/url-configuration`

### 1. **Site URL** - Altere para:
```
http://localhost:8083
```

### 2. **Additional Redirect URLs** - Adicione:
```
http://localhost:8083
http://127.0.0.1:8083
http://localhost:8080
http://localhost:8081
http://localhost:8082
```

### 3. **Salvar** - Clique em "Save"

## 🚀 **Teste Imediato**

1. **Acesse**: http://localhost:8083/
2. **Faça login** com Google
3. **Deve redirecionar** para localhost agora
4. **Teste o checkout** completo

## ⚠️ **Se Ainda Não Funcionar**

### Alternativa: Editar config.toml local
```toml
[auth]
site_url = "http://localhost:8083"
additional_redirect_urls = ["http://localhost:8083", "http://127.0.0.1:8083"]
```

### Reiniciar Supabase local:
```bash
supabase stop
supabase start
```

## ✅ **Resultado Esperado**
Após configurar, o login com Google deve redirecionar para `http://localhost:8083` em vez da URL de produção.

**Configure agora no dashboard e teste!** 🎯
