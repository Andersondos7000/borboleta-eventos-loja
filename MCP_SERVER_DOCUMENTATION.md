# 🛒 Servidor MCP E-commerce - Documentação

## 📋 Visão Geral

Este servidor MCP (Model Context Protocol) fornece ferramentas para operações de e-commerce integradas ao Supabase. Ele permite gerenciar produtos, carrinho de compras, pedidos, clientes e eventos através de uma interface padronizada.

## 🚀 Configuração

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Variáveis de ambiente configuradas

### Variáveis de Ambiente
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico
```

### Instalação
```bash
# Instalar dependências
npm install @modelcontextprotocol/sdk @supabase/supabase-js zod

# Compilar TypeScript
npx tsc ecommerce-supabase-mcp.ts --target ES2022 --module ESNext --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck --outDir dist

# Executar servidor
node -r dotenv/config dist/ecommerce-supabase-mcp.js
```

## 🛠️ Ferramentas Disponíveis

### 📦 Produtos

#### `list_products`
Lista produtos com filtros opcionais.

**Parâmetros:**
- `limit` (opcional): Número máximo de produtos (padrão: 10)
- `search` (opcional): Termo de busca no nome ou descrição
- `category` (opcional): Filtrar por categoria

**Exemplo:**
```json
{
  "tool": "list_products",
  "arguments": {
    "limit": 5,
    "search": "camiseta",
    "category": "roupas"
  }
}
```

#### `create_product`
Cria um novo produto.

**Parâmetros:**
- `name`: Nome do produto
- `description`: Descrição detalhada
- `price`: Preço em centavos
- `category`: Categoria do produto
- `stock_quantity`: Quantidade em estoque
- `image_url` (opcional): URL da imagem

**Exemplo:**
```json
{
  "tool": "create_product",
  "arguments": {
    "name": "Camiseta Básica",
    "description": "Camiseta 100% algodão",
    "price": 2990,
    "category": "roupas",
    "stock_quantity": 50,
    "image_url": "https://exemplo.com/camiseta.jpg"
  }
}
```

#### `update_product`
Atualiza um produto existente.

**Parâmetros:**
- `id`: ID do produto
- Campos opcionais: `name`, `description`, `price`, `category`, `stock_quantity`, `image_url`

#### `delete_product`
Remove um produto.

**Parâmetros:**
- `id`: ID do produto

### 🛒 Carrinho de Compras

#### `add_to_cart`
Adiciona item ao carrinho.

**Parâmetros:**
- `user_id`: ID do usuário
- `product_id`: ID do produto
- `quantity`: Quantidade

**Exemplo:**
```json
{
  "tool": "add_to_cart",
  "arguments": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "product_id": "456e7890-e89b-12d3-a456-426614174001",
    "quantity": 2
  }
}
```

#### `remove_from_cart`
Remove item do carrinho.

#### `update_cart_item`
Atualiza quantidade de item no carrinho.

#### `list_cart_items`
Lista itens do carrinho de um usuário.

#### `clear_cart`
Limpa todo o carrinho de um usuário.

### 📋 Pedidos

#### `create_order`
Cria um novo pedido.

**Parâmetros:**
- `user_id`: ID do usuário
- `items`: Array de itens do pedido
- `total_amount`: Valor total em centavos
- `shipping_address`: Endereço de entrega
- `payment_method`: Método de pagamento

**Exemplo:**
```json
{
  "tool": "create_order",
  "arguments": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {
        "product_id": "456e7890-e89b-12d3-a456-426614174001",
        "quantity": 2,
        "unit_price": 2990
      }
    ],
    "total_amount": 5980,
    "shipping_address": "Rua das Flores, 123",
    "payment_method": "credit_card"
  }
}
```

#### `update_order_status`
Atualiza status do pedido.

**Status disponíveis:**
- `pending`: Pendente
- `confirmed`: Confirmado
- `processing`: Processando
- `shipped`: Enviado
- `delivered`: Entregue
- `cancelled`: Cancelado

#### `list_orders`
Lista pedidos com filtros.

### 👤 Clientes

#### `create_customer`
Cria perfil de cliente.

**Parâmetros:**
- `user_id`: ID do usuário (UUID)
- `full_name`: Nome completo
- `email`: Email
- `phone` (opcional): Telefone
- `address` (opcional): Endereço

#### `update_customer`
Atualiza dados do cliente.

#### `get_customer`
Busca cliente por ID.

### 🎉 Eventos

#### `create_event`
Cria um novo evento.

#### `list_events`
Lista eventos disponíveis.

### 📊 Relatórios

#### `sales_report`
Gera relatório de vendas.

**Parâmetros:**
- `start_date`: Data inicial (YYYY-MM-DD)
- `end_date`: Data final (YYYY-MM-DD)

#### `inventory_report`
Gera relatório de estoque.

**Parâmetros:**
- `low_stock_threshold` (opcional): Limite para estoque baixo (padrão: 10)

## 🧪 Testando o Servidor

### Script de Teste
Use o script `test-mcp-server.js` para validar a conexão:

```bash
node test-mcp-server.js
```

### Exemplo de Saída
```
🧪 Testando servidor MCP para e-commerce...

📦 Teste 1: Listando produtos...
✅ Produtos encontrados: 0

🛒 Teste 2: Verificando tabela de carrinho...
✅ Itens de carrinho encontrados: 0

📋 Teste 3: Verificando tabela de pedidos...
✅ Pedidos encontrados: 0

👤 Teste 4: Verificando perfis de usuário...
✅ Perfis encontrados: 0

🎉 Teste 5: Verificando eventos...
✅ Eventos encontrados: 0

🎯 Resumo dos testes:
✅ Conexão com Supabase: OK
✅ Acesso às tabelas principais: OK
✅ Sistema pronto para operações MCP
```

## 🔧 Estrutura do Banco de Dados

### Tabelas Principais
- `products`: Catálogo de produtos
- `cart_items`: Itens no carrinho
- `orders`: Pedidos realizados
- `order_items`: Itens dos pedidos
- `profiles`: Perfis de usuários
- `events`: Eventos da plataforma

## 🚨 Tratamento de Erros

Todos os métodos retornam objetos com:
- `success`: Boolean indicando sucesso
- `data`: Dados retornados (em caso de sucesso)
- `error`: Mensagem de erro (em caso de falha)

## 🔐 Segurança

- Use sempre `SUPABASE_SERVICE_ROLE_KEY` para operações administrativas
- Valide todos os inputs usando schemas Zod
- Implemente RLS (Row Level Security) no Supabase
- Nunca exponha chaves sensíveis nos logs

## 📝 Logs

O servidor registra:
- Conexões estabelecidas
- Operações realizadas
- Erros encontrados
- Performance das consultas

## 🤝 Contribuindo

1. Mantenha a documentação atualizada
2. Adicione testes para novas funcionalidades
3. Siga os padrões de código estabelecidos
4. Valide todas as operações antes do commit

---

**Status:** ✅ Servidor MCP totalmente funcional e integrado ao Supabase Cloud
**Última atualização:** Janeiro 2025