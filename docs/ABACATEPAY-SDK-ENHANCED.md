# 📚 AbacatePay SDK - Documentação Enhanced

![AbacatePay](https://img.shields.io/badge/AbacatePay-SDK-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-4.0+-blue)
![React](https://img.shields.io/badge/React-18+-61dafb)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)

## 🚀 Visão Geral

Esta documentação apresenta uma implementação moderna e segura da API AbacatePay, desenvolvida especificamente para o projeto **Borboleta Eventos**. Nossa implementação oferece uma experiência de pagamento PIX otimizada com todas as melhores práticas de segurança.

## ✨ Funcionalidades Principais

- 🔐 **Segurança Avançada**: Gerenciamento de tokens via variáveis de ambiente
- 💳 **PIX Instantâneo**: Geração automática de QR Codes e códigos PIX
- 🔄 **Verificação em Tempo Real**: Monitoramento automático do status de pagamento
- 📱 **UI/UX Otimizada**: Interface responsiva e intuitiva
- 🐳 **Docker Ready**: Containerização completa para desenvolvimento e produção
- 🎯 **TypeScript**: Tipagem forte para maior confiabilidade

## 📖 Índice

- [Instalação e Configuração](#-instalação-e-configuração)
- [Configuração de Segurança](#-configuração-de-segurança)
- [Exemplos de Uso](#-exemplos-de-uso)
- [Componentes React](#-componentes-react)
- [API Reference](#-api-reference)
- [Desenvolvimento com Docker](#-desenvolvimento-com-docker)
- [Troubleshooting](#-troubleshooting)
- [Contribuição](#-contribuição)

---

## 🛠 Instalação e Configuração

### Pré-requisitos

```bash
Node.js >= 18.0.0
npm >= 8.0.0
Docker >= 20.0.0 (opcional)
```

### Setup Inicial

```bash
# Clone o repositório
git clone https://github.com/Andersondos7000/borboleta-eventos-loja.git
cd borboleta-eventos-loja

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
```

### Estrutura do Projeto

```
src/
├── config/
│   └── abacatePay.ts          # Configuração da API
├── components/
│   ├── checkout/
│   │   ├── PaymentPopup.tsx   # Modal de pagamento PIX
│   │   └── TermsSection.tsx   # Seção de termos e botão de checkout
└── types/
    └── abacatePay.ts          # Tipos TypeScript
```

---

## 🔐 Configuração de Segurança

### 1. Obtenha seu Token da API

1. Acesse o [painel do AbacatePay](https://app.abacatepay.com)
2. Navegue para **API/Integrações**
3. Copie seu token de acesso

### 2. Configure Variáveis de Ambiente

Edite o arquivo `.env.local`:

```bash
# AbacatePay API Configuration
VITE_ABACATE_PAY_TOKEN=seu_token_aqui
VITE_ABACATE_PAY_ENV=development  # ou 'production'
```

### 3. Verificação de Segurança

O sistema implementa validações automáticas:

```typescript
// Validação automática do token
if (!token) {
  throw new Error('Token da API do Abacate Pay não configurado. Configure a variável VITE_ABACATE_PAY_TOKEN');
}
```

### 4. Boas Práticas de Segurança ✅

- ✅ Token armazenado em variáveis de ambiente
- ✅ Arquivo `.env.local` no `.gitignore`
- ✅ Validação de token antes das requisições
- ✅ Headers de autenticação seguros
- ✅ Tratamento de erros robusto

---

## 🎯 Exemplos de Uso

### Configuração Básica

```typescript
// src/config/abacatePay.ts
export const ABACATE_PAY_CONFIG = {
  baseUrl: 'https://api.abacatepay.com/v1',
  token: import.meta.env.VITE_ABACATE_PAY_TOKEN || '',
  endpoints: {
    createPixQrCode: '/pixQrCode',
    checkPayment: '/pixQrCode/check'
  }
};
```

### Criando um Pagamento PIX

```typescript
// Exemplo de uso no componente
const createPixPayment = async () => {
  try {
    const response = await fetch(`${ABACATE_PAY_CONFIG.baseUrl}${ABACATE_PAY_CONFIG.endpoints.createPixQrCode}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        amount: 5000, // R$ 50,00 em centavos
        description: 'Ingresso Borboleta Eventos',
        externalId: `order_${Date.now()}`,
        customer: {
          name: customerData.name,
          email: customerData.email
        }
      })
    });
    
    const pixData = await response.json();
    setPixPayment(pixData);
    setShowPaymentPopup(true);
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
  }
};
```

### Verificação de Pagamento

```typescript
const checkPaymentStatus = async (transactionId: string) => {
  try {
    const response = await fetch(
      `${ABACATE_PAY_CONFIG.baseUrl}${ABACATE_PAY_CONFIG.endpoints.checkPayment}?id=${transactionId}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );
    
    const result = await response.json();
    
    if (result.status === 'APPROVED') {
      setPaymentStatus('success');
      setShowSuccessMessage(true);
    }
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
  }
};
```

---

## 🧩 Componentes React

### PaymentPopup Component

Modal responsivo com todas as informações de pagamento:

```tsx
interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  pixData: PixPaymentData;
  customerName: string;
  onPaymentConfirmed: () => void;
}

const PaymentPopup: React.FC<PaymentPopupProps> = ({
  isOpen,
  onClose,
  pixData,
  customerName,
  onPaymentConfirmed
}) => {
  // Implementação do componente
};
```

**Funcionalidades:**
- ✅ Nome do cliente
- ✅ Valor formatado em reais
- ✅ Código PIX copiável
- ✅ QR Code interativo
- ✅ ID da transação
- ✅ Data de expiração
- ✅ Dados da empresa
- ✅ Botões de ação

### TermsSection Component

Seção de checkout com termos e condições:

```tsx
const TermsSection: React.FC = () => {
  const handleCheckout = async () => {
    // Lógica de checkout
  };

  return (
    <section className="checkout-section">
      {/* Implementação */}
    </section>
  );
};
```

---

## 📋 API Reference

### Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/pixQrCode` | Cria um novo pagamento PIX |
| `GET` | `/pixQrCode/check?id={id}` | Verifica status do pagamento |

### Criar Pagamento PIX

```typescript
POST /pixQrCode
Content-Type: application/json
Authorization: Bearer {token}

{
  "amount": 5000,
  "description": "Descrição do pagamento",
  "externalId": "order_123",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com"
  }
}
```

**Resposta:**
```json
{
  "id": "pix_123456",
  "qrCode": "00020126580014br.gov.bcb.pix...",
  "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSU...",
  "expiresAt": "2024-01-15T10:30:00Z",
  "amount": 5000,
  "status": "PENDING"
}
```

### Verificar Pagamento

```typescript
GET /pixQrCode/check?id=pix_123456
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "id": "pix_123456",
  "status": "APPROVED|PENDING|REJECTED",
  "paidAt": "2024-01-15T10:25:00Z"
}
```

---

## 🐳 Desenvolvimento com Docker

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3000"
    environment:
      - VITE_ABACATE_PAY_TOKEN=${VITE_ABACATE_PAY_TOKEN}
    volumes:
      - .:/app
      - /app/node_modules
```

### Comandos Docker

```bash
# Build e start da aplicação
docker-compose up --build

# Start em modo detached
docker-compose up -d

# Stop dos containers
docker-compose down

# Rebuild completo
docker-compose down && docker-compose up --build
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### Token não configurado
```
Error: Token da API do Abacate Pay não configurado
```
**Solução:** Configure a variável `VITE_ABACATE_PAY_TOKEN` no arquivo `.env.local`

#### Erro de CORS
```
Access to fetch at 'https://api.abacatepay.com' blocked by CORS
```
**Solução:** Verifique se está usando o ambiente correto e o token válido

#### QR Code não carrega
**Solução:** Verifique a conexão com a internet e se o token tem permissões adequadas

### Debug Mode

Ative logs detalhados:

```typescript
// Adicione ao .env.local
VITE_DEBUG_ABACATE=true
```

---

## 🤝 Contribuição

### Como Contribuir

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código

- ✅ TypeScript para tipagem forte
- ✅ ESLint + Prettier para formatação
- ✅ Componentes funcionais com hooks
- ✅ Tratamento de erros robusto
- ✅ Testes unitários (em desenvolvimento)

---

## 📞 Suporte

### Contatos

- **Email:** ajuda@abacatepay.com
- **Documentação Oficial:** https://docs.abacatepay.com
- **GitHub Issues:** Para bugs e sugestões

### Links Úteis

- [Documentação AbacatePay](https://docs.abacatepay.com)
- [Painel AbacatePay](https://app.abacatepay.com)
- [Status da API](https://status.abacatepay.com)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**🦋 Feito com ❤️ para Borboleta Eventos**

[![AbacatePay](https://img.shields.io/badge/Powered%20by-AbacatePay-green)](https://abacatepay.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-blue)](https://typescriptlang.org)

</div>
