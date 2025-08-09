# Configuração do Google OAuth para Supabase Local

## 🚨 Erro Atual
```
Erro 401: invalid_client
The OAuth client was not found.
```

## 📋 Causa do Problema
As credenciais do Google OAuth no arquivo `.env.local` estão com valores placeholder em vez das credenciais reais do Google Cloud Console.

## ✅ Solução Passo a Passo

### 1. Configurar no Google Cloud Console

1. **Acesse o Google Cloud Console**: https://console.cloud.google.com/

2. **Crie ou selecione um projeto**:
   - Se não tiver um projeto, clique em "Novo Projeto"
   - Dê um nome ao projeto (ex: "Borboleta Eventos")

3. **Habilite a Google+ API**:
   - Vá para "APIs e Serviços" > "Biblioteca"
   - Procure por "Google+ API" e habilite

4. **Crie credenciais OAuth 2.0**:
   - Vá para "APIs e Serviços" > "Credenciais"
   - Clique em "+ CRIAR CREDENCIAIS" > "ID do cliente OAuth"
   - Escolha "Aplicativo da Web"

5. **Configure as URLs de redirecionamento**:
   ```
   URLs de redirecionamento autorizadas:
   http://localhost:54321/auth/v1/callback
   http://localhost:3000
   ```

6. **Copie as credenciais**:
   - Após criar, você receberá:
     - **Client ID**: algo como `123456789-abcdef.apps.googleusercontent.com`
     - **Client Secret**: algo como `GOCSPX-abcdef123456`

### 2. Atualizar o arquivo .env.local

Substitua as linhas no arquivo `.env.local`:

```env
# Antes (valores placeholder)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Depois (valores reais do Google Cloud Console)
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456
SUPABASE_AUTH_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
```

### 3. Reiniciar os Serviços

Após atualizar as credenciais:

```bash
# Parar o Supabase
supabase stop

# Iniciar o Supabase
supabase start

# Reiniciar o servidor React (Ctrl+C e depois npm run dev)
```

### 4. Testar a Autenticação

1. Acesse `http://localhost:3000`
2. Clique em "Login com Google"
3. Deve abrir a tela de autenticação do Google
4. Após autorizar, deve redirecionar de volta para a aplicação

## 🔧 Configuração Atual do Supabase

O arquivo `supabase/config.toml` já está configurado com:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

## 📝 URLs Importantes

- **Aplicação**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323
- **Callback URL**: http://localhost:54321/auth/v1/callback

## ⚠️ Importante

- **Nunca commite** as credenciais reais no Git
- Use apenas para desenvolvimento local
- Para produção, configure credenciais separadas
- Mantenha o `.env.local` no `.gitignore`

## 🆘 Troubleshooting

Se ainda houver problemas:

1. **Verifique se as URLs estão corretas** no Google Cloud Console
2. **Confirme que a Google+ API está habilitada**
3. **Reinicie todos os serviços** após alterar credenciais
4. **Verifique os logs** do Supabase: `supabase logs`