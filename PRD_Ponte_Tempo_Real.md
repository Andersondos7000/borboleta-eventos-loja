# PRD - Ponte de Atualização em Tempo Real - VERSÃO 2.0
## Borboleta Eventos Loja - React + Supabase + MCPs

### 📋 Visão Geral

**Objetivo**: Criar uma ponte de sincronização em tempo real entre a aplicação React e o banco de dados Supabase, aproveitando os MCPs nativos do Trae para automação e monitoramento inteligente.

**Escopo**: Sistema de sincronização bidirecional que mantém dados consistentes entre frontend, backend e serviços externos sem necessidade de Docker ou infraestrutura adicional.

**Contexto Atualizado**: A aplicação "Borboleta Eventos Loja" utiliza o projeto Supabase "boboleta" (ojxmfxbflbfinodkhixk) como ambiente principal, com necessidade de hooks reutilizáveis e estado global sincronizado.

### 🎯 Objetivos de Negócio

1. **Experiência do Usuário**
   - Atualizações instantâneas na interface sem refresh
   - Sincronização automática entre múltiplas abas/dispositivos
   - Feedback visual de status de conexão
   - **NOVO**: Optimistic Updates para melhor percepção de performance
   - **NOVO**: Resolução inteligente de conflitos em operações simultâneas

2. **Operacional**
   - Redução de inconsistências de dados
   - Automação de deploys e atualizações
   - Monitoramento proativo de performance
   - **NOVO**: Deploy automático via GitHub MCP quando mudanças são detectadas
   - **NOVO**: Métricas de performance coletadas via Browser Tools MCP

3. **Técnico**
   - Aproveitamento máximo dos MCPs disponíveis
   - Arquitetura cloud-native sem infraestrutura local
   - Escalabilidade automática via Supabase
   - **NOVO**: Hooks reutilizáveis para operações realtime
   - **NOVO**: Estado global sincronizado com Zustand + React Query
   - **NOVO**: Estratégias de cache inteligente e invalidação automática

### 🏗️ Arquitetura Proposta

#### Componentes Principais

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │◄──►│  Supabase        │◄──►│   MCPs Trae     │
│                 │    │  Realtime        │    │                 │
│ • Hooks RT      │    │  • WebSocket     │    │ • GitHub        │
│ • State Sync    │    │  • Edge Funcs    │    │ • Browser Tools │
│ • UI Updates    │    │  • Database      │    │ • Supabase      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

#### Fluxo de Dados

1. **Frontend → Supabase**
   - Mutations via Supabase Client
   - Realtime subscriptions para updates
   - Optimistic updates com rollback

2. **Supabase → MCPs**
   - Edge Functions como triggers
   - Webhooks para GitHub (deploys)
   - Browser Tools para monitoramento

3. **MCPs → Automação**
   - GitHub: Auto-deploy em mudanças
   - Browser Tools: Coleta de métricas
   - Supabase MCP: Gestão de schema

### 🔧 Especificações Técnicas

#### 1. Camada de Realtime (Frontend)

**Hooks React Customizados Avançados**
```typescript
// Hook principal para sincronização com tabelas
useRealtimeTable<T>(tableName: string, options?: {
  filters?: object;
  select?: string;
  orderBy?: string;
  limit?: number;
  enableOptimistic?: boolean;
}): {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
}

// Hook para mutações otimistas com rollback
useOptimisticMutation<T>(tableName: string): {
  mutate: (data: Partial<T>) => Promise<T>;
  mutateAsync: (data: Partial<T>) => Promise<T>;
  rollback: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
}

// Hook para status de conexão e métricas
useConnectionStatus(): {
  isConnected: boolean;
  latency: number;
  reconnectAttempts: number;
  lastSync: Date;
}

// Hook para resolução de conflitos
useConflictResolution<T>(strategy: 'client-wins' | 'server-wins' | 'merge')
```

**Estado Global Sincronizado Avançado**
- **Zustand Store** para estado global com middleware de persistência
- **React Query** para cache inteligente e sincronização
- **Context API** para dados de sessão e configurações
- **Immer** para atualizações imutáveis otimizadas

#### 2. Camada de Backend (Supabase) - Projeto boboleta

**Configuração do Projeto**
- **Project ID**: ojxmfxbflbfinodkhixk
- **URL**: https://ojxmfxbflbfinodkhixk.supabase.co
- **Region**: sa-east-1 (São Paulo)
- **Database Version**: PostgreSQL 17.4.1.069

**Edge Functions Avançadas**
```typescript
// functions/realtime-orchestrator/index.ts
// Coordena atualizações entre diferentes serviços e resolve conflitos

// functions/github-deploy-trigger/index.ts
// Dispara deploys automáticos via GitHub MCP com validação

// functions/metrics-collector/index.ts
// Coleta métricas via Browser Tools MCP

// functions/conflict-resolver/index.ts
// Resolve conflitos de dados em tempo real

// functions/cache-invalidator/index.ts
// Invalida cache baseado em mudanças
```

**Database Triggers e RLS Policies**
```sql
-- Trigger avançado para log de mudanças com metadados
CREATE OR REPLACE FUNCTION log_table_changes_advanced()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO realtime_logs (table_name, operation, old_data, new_data, user_id, timestamp, metadata)
  VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), now(), 
    jsonb_build_object('ip', current_setting('request.headers')::json->>'x-forwarded-for'));
  
  -- Notificar via Realtime
  PERFORM pg_notify('table_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'id', COALESCE(NEW.id, OLD.id)
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies para segurança
CREATE POLICY "Users can only see their own data" ON produtos
  FOR ALL USING (auth.uid() = user_id);
```

#### 3. Integração com MCPs

**GitHub MCP**
- Auto-commit de mudanças de schema
- Deploy automático em staging/produção
- Versionamento de configurações

**Browser Tools MCP**
- Monitoramento de performance em tempo real
- Coleta de métricas de usuário
- Detecção de erros JavaScript

**Supabase MCP**
- Gestão automatizada de migrações
- Backup automático de dados críticos
- Monitoramento de saúde do banco

### 📊 Casos de Uso Detalhados

#### Caso 1: Atualização de Produto na Loja

**Fluxo Atual vs Proposto**

*Atual:*
1. Admin atualiza produto
2. Usuário precisa refresh para ver mudança
3. Possível inconsistência entre sessões

*Proposto:*
1. Admin atualiza produto → Supabase
2. Realtime trigger → Todos os clientes conectados
3. UI atualiza automaticamente
4. Edge Function → GitHub MCP (log da mudança)
5. Browser Tools MCP → Métricas de engagement

#### Caso 2: Sistema de Carrinho Colaborativo

**Cenário**: Múltiplos usuários editando mesmo evento

1. **Detecção de Conflito**
   ```typescript
   const { data, conflict } = useRealtimeSync('eventos', {
     filter: `id=eq.${eventoId}`,
     onConflict: (local, remote) => {
       // Estratégia de resolução
       return mergeStrategy(local, remote);
     }
   });
   ```

2. **Resolução Automática**
   - Last-write-wins para campos simples
   - Merge inteligente para arrays/objetos
   - Notificação visual de conflitos

#### Caso 3: Deploy Automático

**Trigger**: Mudança em tabela de configuração

1. Admin altera configuração → Supabase
2. Edge Function detecta mudança crítica
3. GitHub MCP cria commit automático
4. CI/CD pipeline executa deploy
5. Browser Tools MCP monitora saúde pós-deploy

### 🔒 Segurança e Compliance

#### Row Level Security (RLS)
```sql
-- Política para dados de usuário
CREATE POLICY "Users can only see own data" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- Política para dados públicos com rate limiting
CREATE POLICY "Public read with rate limit" ON produtos
  FOR SELECT USING (true);
```

#### Validação de Dados
```typescript
// Schema validation com Zod
const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  stock: z.number().int().min(0)
});
```

#### Auditoria
- Log de todas as mudanças em tempo real
- Rastreamento de origem (user, session, IP)
- Retenção configurável por tipo de dado

### 📈 Monitoramento e Observabilidade

#### Métricas Chave

**Performance**
- Latência de sincronização (< 100ms)
- Taxa de sucesso de WebSocket (> 99.9%)
- Throughput de mensagens/segundo

**Negócio**
- Engagement em tempo real
- Taxa de conversão por feature
- Abandono de carrinho em tempo real

**Técnicas**
- Error rate por componente
- Memory usage do frontend
- Database connection pool

#### Dashboards

**Operacional** (Browser Tools MCP)
```typescript
// Coleta automática de métricas
const metrics = {
  realtimeConnections: getActiveConnections(),
  messageLatency: getAverageLatency(),
  errorRate: getErrorRate(),
  userEngagement: getUserEngagementMetrics()
};
```

**Desenvolvimento** (GitHub MCP)
- Deploy frequency
- Lead time for changes
- Mean time to recovery
- Change failure rate

### 🚀 Plano de Implementação

#### Fase 1: Fundação (Semana 1-2)
- [ ] Configurar Supabase Realtime
- [ ] Criar hooks React básicos
- [ ] Implementar estado global
- [ ] Testes de conectividade

#### Fase 2: Sincronização Core (Semana 3-4)
- [ ] Implementar optimistic updates
- [ ] Criar sistema de conflitos
- [ ] Edge Functions básicas
- [ ] Integração GitHub MCP

#### Fase 3: Automação (Semana 5-6)
- [ ] Deploy automático
- [ ] Monitoramento Browser Tools
- [ ] Métricas em tempo real
- [ ] Alertas proativos

#### Fase 4: Otimização (Semana 7-8)
- [ ] Performance tuning
- [ ] Escalabilidade
- [ ] Documentação completa
- [ ] Treinamento da equipe

### 🎛️ Configuração e Variáveis

#### Variáveis de Ambiente Necessárias
```bash
# Supabase Realtime
SUPABASE_REALTIME_URL=wss://pxcvoiffnandpdyotped.supabase.co/realtime/v1
SUPABASE_REALTIME_KEY=eyJ...

# MCPs Integration
MCP_GITHUB_ENABLED=true
MCP_BROWSER_TOOLS_ENABLED=true
MCP_SUPABASE_ENABLED=true

# Monitoring
REALTIME_METRICS_INTERVAL=30000
ERROR_REPORTING_ENABLED=true
PERFORMANCE_MONITORING=true
```

#### Configuração de Desenvolvimento
```typescript
// config/realtime.ts
export const realtimeConfig = {
  development: {
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
    enableDebugLogs: true
  },
  production: {
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    enableDebugLogs: false
  }
};
```

### 🔄 Estratégias de Fallback

#### Offline-First
- Service Worker para cache
- IndexedDB para persistência local
- Sync queue para quando voltar online

#### Degradação Graceful
- Polling como fallback do WebSocket
- Cache local em caso de falha de rede
- UI indicators de status de conexão

### 🗄️ Schema do Banco de Dados

#### Schema de Referência Oficial

**✅ Estrutura Definitiva**: Seguiremos exatamente o schema conforme definido no arquivo `WARNING This schema.txt`

**Tabelas do Sistema:**
- `cart_items` - Itens do carrinho de compras
- `categories` - Categorias de produtos  
- `events` - Eventos e shows
- `order_items` - Itens dos pedidos
- `orders` - Pedidos realizados
- `product_sizes` - Tamanhos disponíveis dos produtos
- `product_stock` - Controle de estoque por produto/tamanho
- `products` - Catálogo de produtos
- `profiles` - Perfis de usuários
- `tickets` - Ingressos para eventos

**Relacionamentos Principais:**
- `products` → `categories` (many-to-one)
- `product_stock` → `products` + `product_sizes` (many-to-one each)
- `cart_items` → `products` + `product_sizes` + `auth.users`
- `orders` → `auth.users` (many-to-one)
- `order_items` → `orders` + `products` + `product_sizes`
- `tickets` → `events` + `auth.users`
- `profiles` → `auth.users` (one-to-one)

#### Impacto na Ponte de Tempo Real
- **Schema Confirmado**: Estrutura completa e estável para sincronização
- **Tabelas Críticas para Realtime**: `products`, `product_stock`, `cart_items`, `orders`, `tickets`
- **Relacionamentos Otimizados**: Queries eficientes para hooks de tempo real
- **Implementação Completa**: Todos os recursos planejados são suportados

### 🔌 Análise dos MCPs (Model Context Protocol) Disponíveis

#### MCPs Nativos do Trae para o Projeto

**1. Supabase MCP (`mcp.config.usrlocalmcp.supabase`)**
```json
{
  "server_name": "mcp.config.usrlocalmcp.supabase",
  "capabilities": [
    "list_organizations", "get_organization", "list_projects", "get_project",
    "create_project", "pause_project", "restore_project",
    "create_branch", "list_branches", "delete_branch", "merge_branch",
    "list_tables", "list_extensions", "list_migrations",
    "apply_migration", "execute_sql", "get_logs", "get_advisors",
    "generate_typescript_types", "search_docs",
    "list_edge_functions", "deploy_edge_function"
  ],
  "uso_no_projeto": {
    "gerenciamento_db": "Aplicar migrações, executar SQL, listar tabelas",
    "edge_functions": "Deploy automático das funções de orquestração realtime",
    "monitoramento": "Logs de sistema, advisors de segurança e performance",
    "typescript_types": "Geração automática de tipos para o frontend"
  }
}
```

**2. Pieces MCP (`mcp.config.usrlocalmcp.Pieces`)**
```json
{
  "server_name": "mcp.config.usrlocalmcp.Pieces",
  "capabilities": [
    "ask_pieces_ltm", "create_pieces_memory"
  ],
  "uso_no_projeto": {
    "contexto_historico": "Recuperar informações sobre implementações anteriores",
    "documentacao_memoria": "Criar memórias detalhadas de breakthroughs e decisões",
    "knowledge_base": "Consultar histórico de bugs, soluções e padrões"
  }
}
```

**3. Browser Tools MCP (`mcp.config.usrlocalmcp.browser-tools`)**
```json
{
  "server_name": "mcp.config.usrlocalmcp.browser-tools",
  "capabilities": [
    "getConsoleLogs", "getConsoleErrors", "getNetworkErrors",
    "getNetworkLogs", "takeScreenshot", "getSelectedElement",
    "wipeLogs", "runAccessibilityAudit"
  ],
  "uso_no_projeto": {
    "debugging_realtime": "Monitorar logs de WebSocket e erros de conexão",
    "performance_monitoring": "Capturar métricas de rede e latência",
    "testing_visual": "Screenshots para validação de UI em tempo real",
    "accessibility": "Auditorias automáticas de acessibilidade"
  }
}
```

#### Integração dos MCPs na Ponte de Tempo Real

**Fluxo de Desenvolvimento Automatizado:**
1. **Supabase MCP**: Gerencia schema, migrations e Edge Functions
2. **Pieces MCP**: Documenta decisões arquiteturais e soluções
3. **Browser Tools MCP**: Monitora performance e debugging em tempo real

**Casos de Uso Específicos:**
- **Deploy Automático**: Supabase MCP + GitHub Actions
- **Debugging Inteligente**: Browser Tools + Pieces (histórico de bugs similares)
- **Monitoramento Proativo**: Logs do Supabase + métricas do Browser
- **Documentação Viva**: Pieces MCP captura breakthroughs durante desenvolvimento

**Vantagens da Integração MCP:**
- ✅ **Zero Configuração**: MCPs já configurados no Trae
- ✅ **Contexto Compartilhado**: Informações fluem entre ferramentas
- ✅ **Automação Nativa**: Workflows integrados sem scripts externos
- ✅ **Debugging Avançado**: Correlação entre logs, rede e histórico

### 🎯 Instruções para Builder with MCP

#### 📋 Diretrizes Gerais de Implementação

**Priorização de MCPs**
**SEMPRE use MCPs nativos do Trae antes de implementações customizadas:**
1. **Supabase MCP** - Para todas as operações de banco de dados, Edge Functions e monitoramento
2. **Pieces MCP** - Para documentação, contexto histórico e gestão de conhecimento
3. **Browser Tools MCP** - Para debugging, testes visuais e monitoramento de performance

**Arquitetura Obrigatória**
- **Hooks Customizados**: Implemente hooks React reutilizáveis para cada funcionalidade realtime
- **Estado Global**: Use Context API + useReducer para gerenciar estado sincronizado
- **Edge Functions**: Prefira Edge Functions do Supabase para lógica de negócio complexa
- **WebSocket Direto**: Conecte diretamente ao Supabase Realtime, evite abstrações desnecessárias

**Padrões de Código**
```typescript
// Estrutura obrigatória para hooks realtime
const useRealtimeSync = <T>({
  table: string,
  filter?: string,
  onUpdate?: (data: T) => void,
  onError?: (error: Error) => void
}) => {
  // Implementação usando Supabase MCP
}

// Padrão para Edge Functions
export default async function handler(req: Request) {
  // Use Pieces MCP para logging de contexto
  // Use Supabase MCP para operações DB
  // Retorne sempre Response padronizada
}
```

**Integração com MCPs**
1. **Supabase MCP**:
   - Use `execute_sql` para queries complexas
   - Use `apply_migration` para mudanças de schema
   - Use `deploy_edge_function` para lógica de negócio
   - Use `get_logs` para debugging em tempo real

2. **Pieces MCP**:
   - Use `create_pieces_memory` para documentar decisões arquiteturais
   - Use `ask_pieces_ltm` para recuperar contexto histórico do projeto
   - Documente todos os padrões implementados

3. **Browser Tools MCP**:
   - Use `takeScreenshot` para validar UI em tempo real
   - Use `getNetworkLogs` para monitorar performance de sincronização
   - Use `runAccessibilityAudit` antes de cada deploy

**Fluxo de Desenvolvimento**
1. **Análise**: Use Pieces MCP para entender contexto histórico
2. **Implementação**: Priorize Supabase MCP para backend, hooks customizados para frontend
3. **Testes**: Use Browser Tools MCP para validação visual e performance
4. **Documentação**: Use Pieces MCP para criar memórias permanentes
5. **Deploy**: Use Supabase MCP para Edge Functions e migrações

**Tratamento de Erros**
```typescript
// Padrão obrigatório para tratamento de erros
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Use em todos os hooks e funções críticas
const useRealtimeData = (): Result<Data[]> => {
  // Implementação com tratamento robusto
}
```

**Performance e Monitoramento**
- **Métricas Obrigatórias**: Latência, throughput, error rate, connection status
- **Logs Estruturados**: Use formato JSON com timestamp, level, service, traceId
- **Alertas**: Configure via Supabase MCP para falhas críticas
- **Cache**: Implemente cache local com IndexedDB para offline-first

**Segurança**
- **RLS Policies**: Sempre implemente Row Level Security no Supabase
- **Validação**: Use Zod para validação de schemas em runtime
- **Sanitização**: Sanitize todos os inputs do usuário
- **Auditoria**: Log todas as operações críticas via Pieces MCP

#### 🔧 Implementação Específica

**1. Hooks de Sincronização**
**Localização**: `src/hooks/realtime/`
**Arquivos obrigatórios**:
- `useRealtimeCart.ts` - Sincronização do carrinho
- `useRealtimeStock.ts` - Monitoramento de estoque
- `useRealtimeOrders.ts` - Atualizações de pedidos
- `useRealtimeEvents.ts` - Eventos em tempo real

**2. Edge Functions**
**Localização**: `supabase/functions/`
**Funções obrigatórias**:
- `sync-cart/` - Sincronização de carrinho entre dispositivos
- `stock-monitor/` - Monitoramento de estoque em tempo real
- `conflict-resolver/` - Resolução de conflitos de dados

**3. Componentes UI**
**Localização**: `src/components/realtime/`
**Componentes obrigatórios**:
- `SyncStatus.tsx` - Indicador de status de sincronização
- `ConflictResolver.tsx` - Interface para resolução de conflitos
- `OfflineIndicator.tsx` - Indicador de modo offline

**4. Testes**
**Cobertura mínima**: 90% para hooks realtime
**Testes obrigatórios**:
- Sincronização entre múltiplas abas
- Comportamento offline/online
- Resolução de conflitos
- Performance sob carga

#### 📊 Validação e Entrega

**Checklist de Implementação**
- [ ] Todos os hooks realtime implementados e testados
- [ ] Edge Functions deployadas e funcionais
- [ ] Componentes UI responsivos e acessíveis
- [ ] Testes automatizados com cobertura > 90%
- [ ] Documentação completa via Pieces MCP
- [ ] Performance validada via Browser Tools MCP
- [ ] Segurança auditada (RLS, validação, sanitização)
- [ ] Monitoramento configurado via Supabase MCP

**Critérios de Aceitação**
- **Latência**: < 100ms para sincronização
- **Disponibilidade**: 99.9% uptime
- **Perda de Dados**: 0% em condições normais
- **Experiência**: Sincronização transparente e automática

---

### 📝 Critérios de Sucesso

#### Técnicos
- [ ] Latência < 100ms para 95% das operações
- [ ] Uptime > 99.9% do sistema de realtime
- [ ] Zero perda de dados em cenários de conflito
- [ ] Cobertura de testes > 90%
- [ ] Schema Compliance: 100% alinhamento com referência
- [ ] MCP Integration: 100% das funcionalidades via MCPs nativos

#### Negócio
- [ ] Redução de 50% em abandono de carrinho
- [ ] Aumento de 30% em engagement
- [ ] Redução de 80% em tickets de "dados desatualizados"
- [ ] Deploy automático em < 5 minutos via Supabase MCP

#### Experiência
- [ ] Feedback visual em < 50ms
- [ ] Sincronização entre abas instantânea
- [ ] Resolução de conflitos transparente
- [ ] Zero configuração manual
- [ ] Debugging visual via Browser Tools MCP para desenvolvedores

---

**Versão**: 1.0  
**Data**: Janeiro 2025  
**Responsável**: Equipe de Desenvolvimento  
**Aprovação**: Pendente