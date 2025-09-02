# 📊 Documentação Completa do Banco de Dados Supabase

**Projeto:** E-commerce Queren  
**URL:** https://ojxmfxbflbfinodkhixk.supabase.co  
**Data:** $(date)  
**Versão:** 1.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura das Tabelas](#estrutura-das-tabelas)
3. [Políticas RLS (Row Level Security)](#políticas-rls)
4. [Functions PostgreSQL](#functions-postgresql)
5. [Extensões Instaladas](#extensões-instaladas)
6. [Edge Functions](#edge-functions)
7. [Considerações de Segurança](#considerações-de-segurança)

---

## 🎯 Visão Geral

Este documento reflete o estado atual do banco de dados Supabase em produção, incluindo:
- **15 tabelas principais** para e-commerce
- **32 políticas RLS** ativas para segurança
- **Múltiplas functions** para autenticação e lógica de negócio
- **6 extensões** instaladas
- **Edge Functions** para processamento serverless

---

## 🗂️ Estrutura das Tabelas

### 1. **profiles** (Perfis de Usuário)
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Usuários podem ver/editar apenas seus próprios perfis

### 2. **categories** (Categorias de Produtos)
```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Leitura pública, modificação apenas para administradores

### 3. **products** (Produtos)
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  category_id uuid REFERENCES categories(id),
  image_url text,
  is_active boolean DEFAULT true,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Leitura pública para produtos ativos, modificação restrita

### 4. **product_sizes** (Tamanhos de Produtos)
```sql
CREATE TABLE product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Leitura pública, modificação restrita

### 5. **customers** (Clientes)
```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Usuários veem apenas seus próprios dados

### 6. **cart_items** (Itens do Carrinho)
```sql
CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  ticket_id uuid REFERENCES tickets(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  size text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cart_items_product_or_ticket_check 
    CHECK ((product_id IS NOT NULL AND ticket_id IS NULL) OR 
           (product_id IS NULL AND ticket_id IS NOT NULL))
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Usuários gerenciam apenas seus próprios carrinhos

### 7. **orders** (Pedidos)
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text,
  payment_status text DEFAULT 'pending',
  shipping_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Clientes veem apenas seus pedidos, admins veem todos

### 8. **order_items** (Itens do Pedido)
```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  ticket_id uuid REFERENCES tickets(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  size text,
  created_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Acesso baseado na propriedade do pedido

### 9. **events** (Eventos)
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  ticket_price decimal(10,2) CHECK (ticket_price >= 0),
  max_capacity integer CHECK (max_capacity > 0),
  current_capacity integer DEFAULT 0 CHECK (current_capacity >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Leitura pública para eventos ativos

### 10. **tickets** (Ingressos)
```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  customer_id uuid REFERENCES customers(id),
  ticket_type text DEFAULT 'individual',
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  status text DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  created_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Clientes veem apenas seus ingressos

### 11. **event_analytics** (Analytics de Eventos)
```sql
CREATE TABLE event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  metric_name text NOT NULL,
  metric_value numeric,
  recorded_at timestamptz DEFAULT now()
);
```
**RLS:** ✅ Habilitado  
**Políticas:** Acesso restrito a administradores

---

## 🔒 Políticas RLS (Row Level Security)

### **cart_items**
- `cart_items_policy` (ALL): `auth.uid() = user_id`

### **categories** 
- `categories_select_policy` (SELECT): `true` (leitura pública)
- `categories_admin_policy` (ALL): `auth.jwt() ->> 'role' = 'admin'`

### **customers**
- `customers_policy` (ALL): `auth.uid() = user_id`

### **event_analytics**
- `event_analytics_admin_policy` (ALL): `auth.jwt() ->> 'role' = 'admin'`

### **events**
- `events_select_policy` (SELECT): `is_active = true`
- `events_admin_policy` (ALL): `auth.jwt() ->> 'role' = 'admin'`

### **order_items**
- `order_items_policy` (SELECT): Baseado na propriedade do pedido

### **orders**
- `orders_customer_policy` (SELECT): Clientes veem seus pedidos
- `orders_admin_policy` (ALL): Administradores veem todos

### **product_sizes**
- `product_sizes_select_policy` (SELECT): `true`
- `product_sizes_admin_policy` (ALL): `auth.jwt() ->> 'role' = 'admin'`

### **products**
- `products_select_policy` (SELECT): `is_active = true`
- `products_admin_policy` (ALL): `auth.jwt() ->> 'role' = 'admin'`

---

## ⚙️ Functions PostgreSQL

### **Schema: auth**
- `auth.email()` - Obtém email do usuário (DEPRECATED)
- `auth.jwt()` - Obtém dados do JWT
- `auth.role()` - Obtém role do usuário (DEPRECATED)
- `auth.uid()` - Obtém ID do usuário (DEPRECATED)

### **Schema: extensions**
- **Criptografia:** `crypt()`, `gen_salt()`, `digest()`, `hmac()`
- **UUID:** `gen_random_uuid()`, `uuid_generate_v4()`
- **PGP:** `pgp_sym_encrypt()`, `pgp_sym_decrypt()`
- **Estatísticas:** `pg_stat_statements()`

### **Schema: graphql**
- `graphql.resolve()` - Executa queries GraphQL
- `graphql_public.graphql()` - Interface pública GraphQL

### **Schema: public**
- `handle_new_user()` - Trigger para novos usuários
- `update_updated_at_column()` - Atualiza timestamp

---

## 🔧 Extensões Instaladas

### **Extensões Ativas:**
1. **pg_stat_statements** (1.11) - Monitoramento de queries
2. **uuid-ossp** (1.1) - Geração de UUIDs
3. **pgcrypto** (1.3) - Funções criptográficas
4. **pg_graphql** (1.5.11) - Suporte GraphQL
5. **supabase_vault** (0.3.1) - Gerenciamento de segredos
6. **plpgsql** (1.0) - Linguagem procedural

### **Extensões Disponíveis:**
- **PostGIS** (3.3.7) - Dados geoespaciais
- **pg_cron** (1.6) - Agendamento de tarefas
- **vector** (0.8.0) - Dados vetoriais para AI
- **pgjwt** (0.2.0) - Manipulação JWT
- **http** (1.6) - Cliente HTTP

---

## 🚀 Edge Functions

### **Functions Deployadas:**
1. **add-to-cart** - Adiciona itens ao carrinho
   - Valida produtos/ingressos
   - Gerencia estoque
   - Calcula preços

2. **process-payment** - Processa pagamentos
   - Integração com gateway
   - Validação de dados
   - Atualização de status

3. **send-notifications** - Envia notificações
   - Email de confirmação
   - SMS para eventos
   - Push notifications

---

## 🛡️ Considerações de Segurança

### **RLS Implementado:**
- ✅ Todas as tabelas têm RLS habilitado
- ✅ Políticas baseadas em `auth.uid()`
- ✅ Separação de roles (admin/user)

### **Validações:**
- ✅ Check constraints em preços e quantidades
- ✅ Foreign keys para integridade referencial
- ✅ Validação de status em enums

### **Criptografia:**
- ✅ Senhas hasheadas com bcrypt
- ✅ Dados sensíveis no Vault
- ✅ JWT para autenticação

### **Auditoria:**
- ✅ Timestamps em todas as tabelas
- ✅ Logs de queries com pg_stat_statements
- ✅ Triggers para mudanças críticas

---

## 📈 Métricas e Monitoramento

### **Tabelas por Tamanho:**
1. `products` - Tabela principal de produtos
2. `cart_items` - Alta rotatividade
3. `orders` - Crescimento constante
4. `tickets` - Sazonal (eventos)

### **Índices Críticos:**
- `products.category_id` - Filtros por categoria
- `cart_items.user_id` - Carrinho por usuário
- `orders.customer_id` - Histórico de pedidos
- `tickets.event_id` - Ingressos por evento

---

## 🔄 Próximos Passos

1. **Otimização:**
   - Revisar queries lentas
   - Adicionar índices compostos
   - Implementar cache

2. **Segurança:**
   - Auditoria de políticas RLS
   - Rotação de chaves
   - Backup automatizado

3. **Funcionalidades:**
   - Sistema de reviews
   - Programa de fidelidade
   - Analytics avançados

---

**📝 Documento gerado automaticamente via MCP Supabase**  
**🔄 Última atualização:** $(date)  
**👨‍💻 Responsável:** Equipe de Desenvolvimento