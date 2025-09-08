### 🎯 Instruções para Builder with MCP

#### 📋 Priorização de MCPs
**SEMPRE use MCPs nativos do Trae:**
1. **Supabase MCP** - DB, Edge Functions, monitoramento
2. **Pieces MCP** - Documentação, contexto histórico
3. **Browser Tools MCP** - Debug, testes visuais, performance

#### 🏗️ Arquitetura Obrigatória
- **Hooks Customizados**: React hooks reutilizáveis para realtime
- **Estado Global**: Context API + useReducer
- **Edge Functions**: Supabase para lógica de negócio
- **WebSocket Direto**: Supabase Realtime sem abstrações

#### 💻 Padrões de Código
```typescript
// Hook realtime obrigatório
const useRealtimeSync = <T>({
  table: string,
  filter?: string,
  onUpdate?: (data: T) => void,
  onError?: (error: Error) => void
}) => {
  // Implementação usando Supabase MCP
}

// Edge Function padrão
export default async function handler(req: Request) {
  // Use Pieces MCP para logging
  // Use Supabase MCP para DB
  // Retorne Response padronizada
}

// Tratamento de erros obrigatório
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }
```

#### 🔧 Integração MCPs
**Supabase MCP:**
- `execute_sql` - queries complexas
- `apply_migration` - mudanças schema
- `deploy_edge_function` - lógica negócio
- `get_logs` - debugging

**Pieces MCP:**
- `create_pieces_memory` - decisões arquiteturais
- `ask_pieces_ltm` - contexto histórico

**Browser Tools MCP:**
- `takeScreenshot` - validação UI
- `getNetworkLogs` - performance sync
- `runAccessibilityAudit` - antes deploy

#### 🚀 Fluxo Desenvolvimento
1. **Análise**: Pieces MCP para contexto
2. **Implementação**: Supabase MCP + hooks customizados
3. **Testes**: Browser Tools MCP
4. **Documentação**: Pieces MCP
5. **Deploy**: Supabase MCP

#### 📊 Performance & Segurança
**Métricas Obrigatórias:**
- Latência < 100ms
- Throughput, error rate, connection status
- Logs JSON estruturados
- Cache IndexedDB offline-first

**Segurança:**
- RLS Policies sempre
- Validação Zod runtime
- Sanitização inputs
- Auditoria via Pieces MCP

#### 🔧 Implementação Específica

**Hooks Realtime** (`src/hooks/realtime/`):
- `useRealtimeCart.ts` - Carrinho
- `useRealtimeStock.ts` - Estoque
- `useRealtimeOrders.ts` - Pedidos
- `useRealtimeEvents.ts` - Eventos

**Edge Functions** (`supabase/functions/`):
- `sync-cart/` - Sync carrinho
- `stock-monitor/` - Monitor estoque
- `conflict-resolver/` - Resolução conflitos

**Componentes UI** (`src/components/realtime/`):
- `SyncStatus.tsx` - Status sync
- `ConflictResolver.tsx` - Resolução conflitos
- `OfflineIndicator.tsx` - Modo offline

**Testes (90% cobertura):**
- Sync múltiplas abas
- Comportamento offline/online
- Resolução conflitos
- Performance carga

#### ✅ Checklist Entrega
- [ ] Hooks realtime implementados/testados
- [ ] Edge Functions deployadas
- [ ] Componentes UI responsivos
- [ ] Testes 90% cobertura
- [ ] Documentação Pieces MCP
- [ ] Performance Browser Tools MCP
- [ ] Segurança auditada
- [ ] Monitoramento Supabase MCP

**Critérios Aceitação:**
- Latência < 100ms
- Disponibilidade 99.9%
- Zero perda dados
- Sync transparente

---
#### ✅ Linguagem
- Falar sempre em português
