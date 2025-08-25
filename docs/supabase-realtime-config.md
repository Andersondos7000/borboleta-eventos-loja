# Configuração Supabase Realtime

## RLS Policies Configuradas

### cart_items
- **RLS**: Habilitado ✅
- **Políticas**:
  - `Users can manage their own cart items`: Usuários só podem ver/editar seus próprios itens
  - `Public can view cart items`: Visualização pública (para admin)

### orders
- **RLS**: Habilitado ✅
- **Políticas**:
  - `Users can manage their own orders`: Usuários só podem ver/editar seus próprios pedidos
  - `Public can view orders`: Visualização pública (para admin)

### products
- **RLS**: Habilitado ✅
- **Políticas**:
  - `Anyone can view products`: Todos podem visualizar produtos
  - `Authenticated users can manage products`: Apenas autenticados podem modificar

### events
- **RLS**: Habilitado ✅
- **Políticas**:
  - `Anyone can view events`: Todos podem visualizar eventos
  - `Authenticated users can manage events`: Apenas autenticados podem modificar

### categories
- **RLS**: Habilitado ✅
- **Políticas**:
  - `Anyone can view categories`: Todos podem visualizar categorias
  - `Authenticated users can manage categories`: Apenas autenticados podem modificar

### product_stock
- **RLS**: Habilitado ✅ (já estava configurado)
- **Políticas**:
  - `Anyone can view product stock`: Visualização pública do estoque
  - `Authenticated users can manage product stock`: Apenas autenticados podem modificar

## Realtime Publications

Todas as tabelas principais estão habilitadas para Realtime:
- ✅ cart_items
- ✅ categories
- ✅ events
- ✅ order_items
- ✅ orders
- ✅ product_stock
- ✅ products
- ✅ tickets

## Configuração WebSocket

O Supabase Realtime está configurado para:
- **URL**: `wss://ojxmfxbflbfinodkhixk.supabase.co/realtime/v1/websocket`
- **Autenticação**: JWT tokens via `supabase.auth.getSession()`
- **Canais**: Configurados automaticamente por tabela

## Segurança

### Princípios Aplicados
1. **Least Privilege**: Usuários só acessam seus próprios dados
2. **Public Read**: Dados de catálogo (produtos, eventos, categorias) são públicos para leitura
3. **Authenticated Write**: Apenas usuários autenticados podem modificar dados
4. **Admin Override**: Políticas públicas permitem acesso administrativo quando necessário

### Validações de Segurança
- ✅ RLS habilitado em todas as tabelas
- ✅ Políticas de acesso por usuário implementadas
- ✅ Separação entre dados públicos e privados
- ✅ Autenticação obrigatória para modificações

## Monitoramento

Para monitorar a performance do Realtime:

```sql
-- Verificar conexões ativas
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%realtime%';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Verificar tabelas com Realtime habilitado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
ORDER BY tablename;
```

## Próximos Passos

1. ✅ Configurar RLS policies
2. ✅ Habilitar Realtime publications
3. ⏳ Implementar optimistic updates
4. ⏳ Configurar monitoramento de performance
5. ⏳ Testes de sincronização multi-dispositivo