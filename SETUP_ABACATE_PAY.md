# Configuração da API do Abacate Pay

## 📋 **Pré-requisitos**
1. Conta no [Abacate Pay](https://abacatepay.com)
2. API Key gerada no painel do Abacate Pay

## 🔧 **Configuração para Desenvolvimento Local**

### 1. Criar arquivo de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env.local
```

### 2. Configurar a API Key
Edite o arquivo `.env.local` e substitua pela sua API key:
```env
ABACATE_PAY_API_KEY=sua_api_key_real_aqui
```

### 3. Para ambiente de teste
Use a API key de desenvolvimento:
```env
ABACATE_PAY_API_KEY=abacate_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Para ambiente de produção
Use a API key de produção:
```env
ABACATE_PAY_API_KEY=abacate_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🚀 **Configuração para Produção (Supabase)**

### Via Dashboard do Supabase:
1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Vá para seu projeto
3. Navegue até **Settings** → **Environment Variables**
4. Adicione a variável:
   - **Name**: `ABACATE_PAY_API_KEY`
   - **Value**: sua API key de produção

### Via CLI do Supabase:
```bash
# Configurar secret para produção
supabase secrets set ABACATE_PAY_API_KEY=sua_api_key_de_producao

# Verificar se foi configurado
supabase secrets list
```

## 🔍 **Como Obter a API Key**

1. Acesse o [painel do Abacate Pay](https://abacatepay.com/dashboard)
2. Vá para **Configurações** → **API Keys**
3. Copie a API Key correspondente ao ambiente:
   - **Desenvolvimento**: `abacate_test_...`
   - **Produção**: `abacate_live_...`

## ⚠️ **Importante**
- **NUNCA** commite a API key no código
- Use sempre variáveis de ambiente
- Mantenha as keys de teste e produção separadas
- A API key é sensível e deve ser tratada como senha

## 🧪 **Testando a Configuração**

Após configurar, teste fazendo um pedido no checkout. Se aparecer erro relacionado à API key, verifique:

1. Se a variável `ABACATE_PAY_API_KEY` está definida
2. Se a API key está correta e ativa
3. Se você está usando a key do ambiente correto (test/live)

## 📚 **Documentação**
- [Documentação Abacate Pay](https://docs.abacatepay.com)
- [Como obter API Keys](https://docs.abacatepay.com/pages/introduction)
