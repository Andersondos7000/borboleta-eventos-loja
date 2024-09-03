# 📄 PRD: AbacatePay – Gateway de Pagamento Descomplicado  
**Documento de Requisitos de Produto**  
*Versão 1.0*  
*Data: 17 e 18 de abril de 2026*

---

## 1. Visão Geral

### 1.1 Nome do Produto  
**AbacatePay** – Gateway de Pagamento Simples para Produtos Digitais

### 1.2 Missão  
Descomplicar cobranças digitais com uma API intuitiva, transparente e eficiente, criada por desenvolvedores para desenvolvedores.

### 1.3 Origem  
A AbacatePay nasceu da frustração prática da equipe ao integrar gateways tradicionais em seus próprios produtos. A complexidade excessiva, documentação confusa e fluxos longos motivaram a criação de uma solução mais direta.

> *"A AbacatePay é um gateway de pagamento que surgiu da nossa própria necessidade de simplificar cobranças em nossos produtos. Percebemos que os meios de pagamento existentes eram excessivamente complexos."*

---

## 2. Objetivos Estratégicos

| Objetivo | Métrica de Sucesso |
|--------|-------------------|
| Simplificar a integração de pagamentos | Tempo médio de primeira cobrança < 30 minutos |
| Reduzir curva de aprendizado da API | 90% dos novos usuários criam cobrança no 1º dia |
| Oferecer experiência transparente | 100% dos erros com mensagens claras em português |
| Suportar modelos digitais modernos | Pix, cartão, boleto, assinaturas, links |

---

## 3. Princípios da API

A API da AbacatePay foi projetada com **três princípios fundamentais**:

### 3.1 Simplicidade  
- Poucos endpoints essenciais.
- Nomenclatura autoexplicativa.
- Respostas JSON previsíveis.
- Exemplo: `POST /cobrancas` cria uma cobrança com poucos campos obrigatórios.

### 3.2 Transparência  
- Status claros: `aguardando_pagamento`, `pago`, `expirado`, `falhou`.
- Mensagens de erro descritivas em português.
- Sem cobranças ocultas ou taxas surpresa.

### 3.3 Eficiência  
- Integração em minutos, não em dias.
- Suporte nativo a Pix instantâneo.
- Webhooks rápidos e confiáveis.
- Autenticação única com Bearer Token.

---

## 4. Funcionalidades do Produto

### 4.1 Cobrança Única (One-off)
- Criação de cobranças pontuais via API ou painel.
- Suporte a Pix, cartão de crédito e boleto (futuro).
- Geração automática de QR Code Pix.

### 4.2 Link de Pagamento
- Geração de links personalizados no painel.
- Compartilhável por WhatsApp, e-mail, redes sociais.
- Ideal para freelancers, lojas simples e negócios sem site.

### 4.3 Checkout Integrado
- **Checkout Hosted**: usuário é redirecionado para página segura da AbacatePay.
- **Checkout Próprio**: formulário no site do cliente, com envio direto à API (requer segurança PCI).

### 4.4 Assinaturas e Recorrência
- Criação de planos (ex: R$29,90/mês).
- Cobrança automática com cartão ou Pix agendado.
- Gestão de ciclo de vida: ativação, cancelamento, pausa.

### 4.5 Webhooks
- Notificações em tempo real para eventos:
  - `cobranca.criada`
  - `cobranca.paga`
  - `cobranca.expirada`
  - `assinatura.criada`
  - `pagamento.estornado`
- Validação de assinatura HMAC para segurança.

### 4.6 Gestão de Clientes
- Cadastro e armazenamento de clientes (nome, e-mail, CPF/CNPJ).
- Reutilização em múltiplas cobranças.
- Histórico de pagamentos por cliente.

### 4.7 Painel do Usuário
- Dashboard intuitivo com:
  - Resumo de receitas
  - Lista de cobranças
  - Relatórios exportáveis (CSV)
  - Configurações de API e webhooks
  - Histórico de eventos

---

## 5. Arquitetura Técnica

### 5.1 Base da API
- **URL**: `https://api.abacatepay.com/v1`
- **Protocolo**: RESTful + JSON
- **Autenticação**: `Authorization: Bearer <chave_secreta>`
- **Idioma**: Campos em inglês, mensagens em português

### 5.2 Chaves de API
| Tipo | Prefixo | Uso |
|------|--------|-----|
| Chave Secreta | `sk_test_` / `sk_live_` | Backend – criação de cobranças |
| Chave Pública | `pk_test_` / `pk_live_` | Frontend – apenas leitura e checkout |

> 🔐 Regra: **Nunca expor a chave secreta no frontend ou repositório público.**

### 5.3 Endpoints Principais (v1)

| Endpoint | Método | Descrição |
|--------|--------|-----------|
| `/cobrancas` | POST | Cria cobrança |
| `/cobrancas/{id}` | GET | Busca cobrança |
| `/cobrancas` | GET | Lista cobranças |
| `/clientes` | POST | Cria cliente |
| `/clientes/{id}` | GET | Busca cliente |
| `/assinaturas` | POST | Cria assinatura |
| `/webhooks` | POST | Registra endpoint |
| `/chaves` | GET | Lista chaves (apenas teste) |

---

## 6. Exemplo de Uso: Criar Cobrança com Pix

### Request
```bash
curl -X POST https://api.abacatepay.com/v1/cobrancas \
  -H "Authorization: Bearer sk_test_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 2990,
    "descricao": "Mensalidade - Plano Básico",
    "cliente": {
      "nome": "Ana Silva",
      "email": "ana@email.com",
      "cpf": "123.456.789-00"
    },
    "metodos": ["pix"],
    "expires_in": 3600
  }'