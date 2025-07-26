# Configuração da API do Abacate Pay

## Como configurar o token da API

1. **Obtenha seu token da API do Abacate Pay:**
   - Acesse o painel do Abacate Pay
   - Vá para a seção de API/Integrações
   - Copie seu token de acesso

2. **Configure o token usando variáveis de ambiente (SEGURO):**
   - Copie o arquivo `.env.example` para `.env.local`
   - Substitua o valor da variável `VITE_ABACATE_PAY_TOKEN`

```bash
# .env.local
VITE_ABACATE_PAY_TOKEN=seu_token_real_aqui
```

3. **Configuração automática:**
   - O sistema carrega automaticamente o token das variáveis de ambiente
   - Não é necessário modificar código fonte
   - Token fica seguro e não é commitado no Git

## Funcionalidades Implementadas

### PaymentPopup
- ✅ Nome do cliente
- ✅ Valor do pagamento formatado em reais
- ✅ Código PIX copiável para área de transferência
- ✅ ID da transação (código identificador)
- ✅ Dados da empresa recebedora (Borboleta Eventos, CNPJ)
- ✅ QR Code gerado pela API do Abacate Pay
- ✅ Data de expiração do PIX
- ✅ Botões "Cancelar" e "Já efetuei o pagamento"

### Verificação de Pagamento
- ✅ Requisição GET para `https://api.abacatepay.com/v1/pixQrCode/check?id={transactionId}`
- ✅ Verifica status APPROVED, PENDING ou outros
- ✅ Mostra "Seu pedido foi efetuado com sucesso" quando aprovado
- ✅ Usa o parâmetro correto 'id' conforme documentação

## Como Usar

1. O usuário preenche o formulário de checkout
2. Clica em "Fazer o pedido" (botão no TermsSection)
3. O sistema gera o PIX via API do Abacate Pay
4. Abre o popup com todas as informações de pagamento
5. Usuário pode escanear QR Code ou copiar código PIX
6. Após pagar, clica em "Já efetuei o pagamento"
7. Sistema verifica automaticamente se o pagamento foi aprovado
8. Mostra mensagem de sucesso quando confirmado

## Segurança

✅ **IMPLEMENTADO**: O sistema já usa variáveis de ambiente para armazenar o token da API de forma segura.

- Token não fica hardcoded no código
- Arquivo `.env.local` é ignorado pelo Git (não é commitado)
- Sistema valida se o token está configurado antes de fazer requisições
- Mensagem de erro clara se o token não estiver configurado

**Estrutura segura implementada:**
```typescript
// Token carregado das variáveis de ambiente
token: import.meta.env.VITE_ABACATE_PAY_TOKEN || ''

// Validação antes do uso
if (!token) {
  throw new Error('Token da API do Abacate Pay não configurado');
}
```
