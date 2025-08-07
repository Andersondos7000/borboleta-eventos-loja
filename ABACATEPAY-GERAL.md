# 📖 Documentação Geral de Integração AbacatePay

## 1. Configuração de API Key

- **Arquivo `.env.local`**:
  - `ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`
  - `VITE_ABACATE_PAY_TOKEN=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`
- **Configuração via Dashboard Supabase**:
  - Adicionar variável `ABACATE_PAY_API_KEY` em Settings → Environment Variables.
- **Configuração via CLI Supabase**:
  - `supabase secrets set ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n --project-ref <ref>`
  - `supabase secrets list --project-ref <ref>`

## 2. Fluxo de Pagamento PIX

- Geração de QR Code PIX via endpoint `/pixQrCode`
- Verificação de status via endpoint `/pixQrCode/check?id={transactionId}`
- Popup de pagamento exibe:
  - Nome do cliente
  - Valor formatado
  - QR Code e código PIX
  - Status do pagamento
  - ID da transação
  - Data de expiração

## 3. Segurança

- Tokens nunca ficam hardcoded no código.
- `.env.local` está no `.gitignore`.
- Validação automática do token antes de requisições.
- Mensagem clara se o token não estiver configurado.

## 4. Docker

- Variáveis de ambiente passadas no `docker-compose.yml`:
  - `VITE_ABACATE_PAY_TOKEN=${VITE_ABACATE_PAY_TOKEN}`
- Comandos principais:
  - `docker-compose up --build`
  - `docker-compose up -d`
  - `docker-compose down`

## 5. Componentes React

- `PaymentPopup.tsx`: Modal de pagamento PIX
- `TermsSection.tsx`: Seção de checkout
- Hooks customizados para criar pagamento e verificar status

## 6. Exemplos de Uso

- Criar pagamento:
  ```typescript
  const payment = await createPixPayment({ amount, description, externalId, customer });
  ```
- Verificar status:
  ```typescript
  const status = await checkPaymentStatus(payment.id);
  if (status?.status === 'APPROVED') { /* sucesso */ }
  ```

## 7. Troubleshooting

- Token não configurado: configure `VITE_ABACATE_PAY_TOKEN`
- Erro de CORS: verifique ambiente e token
- QR Code não carrega: verifique conexão e permissões

## 8. Links Úteis

- [Documentação Oficial AbacatePay](https://docs.abacatepay.com/pages/introduction)
- [Painel AbacatePay](https://app.abacatepay.com)
- [Status da API](https://status.abacatepay.com)

---

**Este arquivo resume todas as configurações e integrações já utilizadas para AbacatePay na aplicação Borboleta Eventos.**
