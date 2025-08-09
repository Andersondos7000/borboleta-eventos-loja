# Documentação AbacatePay

Esta pasta contém toda a documentação relacionada à integração com o sistema de pagamentos AbacatePay.

## Arquivos Disponíveis

### 🚀 Guias de Início
- **[ABACATEPAY-QUICK-START.md](./ABACATEPAY-QUICK-START.md)** - Guia rápido para começar a usar o AbacatePay
- **[ABACATEPAY-TECHNICAL-GUIDE.md](./ABACATEPAY-TECHNICAL-GUIDE.md)** - Guia técnico completo com detalhes de implementação

### 🛠️ SDK e Ferramentas
- **[ABACATEPAY-SDK-ENHANCED.md](./ABACATEPAY-SDK-ENHANCED.md)** - Documentação do SDK aprimorado do AbacatePay

### 🧪 Testes e Validação
- **[CASOS-DE-TESTE-ABACATEPAY.md](./CASOS-DE-TESTE-ABACATEPAY.md)** - Casos de teste para validação da integração
- **[RESULTADOS-TESTE-ABACATEPAY.md](./RESULTADOS-TESTE-ABACATEPAY.md)** - Resultados e relatórios dos testes executados

## Fluxo de Leitura Recomendado

### Para Desenvolvedores Iniciantes
1. 📖 Comece com **ABACATEPAY-QUICK-START.md**
2. 🔧 Prossiga para **ABACATEPAY-TECHNICAL-GUIDE.md**
3. 🛠️ Consulte **ABACATEPAY-SDK-ENHANCED.md** para funcionalidades avançadas

### Para Testes e QA
1. 🧪 Revise **CASOS-DE-TESTE-ABACATEPAY.md**
2. 📊 Consulte **RESULTADOS-TESTE-ABACATEPAY.md** para histórico

## Funcionalidades Cobertas

### Métodos de Pagamento
- ✅ PIX (QR Code e Copia e Cola)
- ✅ Cartão de Crédito
- ✅ Cartão de Débito
- ✅ Boleto Bancário

### Recursos Técnicos
- ✅ Webhooks para notificações
- ✅ Ambiente de sandbox para testes
- ✅ SDK JavaScript/TypeScript
- ✅ Validação de pagamentos
- ✅ Gestão de status de pedidos

## Configuração Básica

### Variáveis de Ambiente Necessárias
```bash
# AbacatePay Configuration
ABACATEPAY_API_KEY=your_api_key_here
ABACATEPAY_ENVIRONMENT=sandbox # ou production
ABACATEPAY_WEBHOOK_URL=https://your-domain.com/webhook
```

### Exemplo de Uso Básico
```typescript
import { AbacatePaySDK } from 'abacatepay-nodejs-sdk';

const abacatePay = new AbacatePaySDK({
  apiKey: process.env.ABACATEPAY_API_KEY,
  environment: 'sandbox'
});

// Criar pagamento PIX
const payment = await abacatePay.createPixPayment({
  amount: 100.00,
  description: 'Pagamento de teste'
});
```

## Troubleshooting

### Problemas Comuns
1. **QR Code não aparece**: Verifique se o `brCodeBase64` está sendo retornado corretamente
2. **Webhook não funciona**: Confirme se a URL está acessível e retorna status 200
3. **Pagamento não confirma**: Verifique os logs do webhook e status na API

### Links Úteis
- 🌐 [Portal do Desenvolvedor AbacatePay](https://abacatepay.com/developers)
- 📚 [API Reference](https://docs.abacatepay.com)
- 🐛 [Reportar Bugs](https://github.com/abacatepay/issues)

## Contribuindo

Para contribuir com a documentação:
1. Mantenha a consistência com o formato existente
2. Inclua exemplos práticos sempre que possível
3. Atualize este README quando adicionar novos arquivos
4. Teste todos os exemplos de código antes de documentar

---

**Última atualização**: Janeiro 2025  
**Versão do SDK**: 2.x  
**Status**: ✅ Produção