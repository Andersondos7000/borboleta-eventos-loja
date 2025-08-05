# ⚡ Configuração Imediata da API Key do Abacate Pay

## 🔑 **API Key Fornecida**
```
abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
```

## 🚀 **Configuração para Desenvolvimento Local**

### Opção 1: Criar arquivo .env.local manualmente
1. Crie um arquivo `.env.local` na raiz do projeto
2. Adicione o conteúdo:
```env
ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
```

### Opção 2: Via linha de comando
```bash
# Windows (PowerShell)
echo "ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n" > .env.local

# Linux/Mac
echo "ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n" > .env.local
```

## 🌐 **Configuração para Produção (Supabase Dashboard)**

### Via Dashboard Web:
1. Acesse: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped
2. Vá para **Settings** → **Environment Variables**
3. Clique em **Add Variable**
4. Configure:
   - **Name**: `ABACATE_PAY_API_KEY`
   - **Value**: `abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`
5. Clique em **Save**

### Via CLI (se instalado):
```bash
# Instalar CLI do Supabase (se necessário)
npm install -g supabase

# Fazer login
supabase login

# Configurar a API key
supabase secrets set ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n --project-ref pxcvoiffnandpdyotped

# Verificar se foi configurado
supabase secrets list --project-ref pxcvoiffnandpdyotped
```

## ✅ **Verificação**

Após configurar, teste fazendo um pedido no checkout. Se tudo estiver correto:
- O QR Code PIX será gerado
- A verificação de pagamento funcionará
- Não haverá erros de autenticação na API

## ⚠️ **Importante**
- Esta é uma API key de **desenvolvimento/teste**
- Para produção, solicite uma API key de produção (prefixo `abacate_live_`)
- Nunca exponha a API key publicamente

## 🔄 **Reiniciar Serviços**
Após configurar, reinicie:
- Servidor de desenvolvimento local
- Funções Edge do Supabase (se aplicável)
