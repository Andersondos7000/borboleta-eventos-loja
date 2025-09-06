# Integração Pieces MCP no Trae AI

Este documento descreve a implementação da integração do Pieces MCP (Model Context Protocol) no Trae AI, permitindo o uso de funcionalidades de memória de longo prazo (LTM) e contexto histórico para melhorar a experiência do usuário.

## Visão Geral

A integração do Pieces MCP permite:

1. **Consulta ao contexto histórico** - Utilizar o conhecimento acumulado pelo Pieces para fornecer sugestões inteligentes
2. **Registro de eventos** - Armazenar eventos importantes para análise futura
3. **Sugestões de resolução de problemas** - Fornecer dicas personalizadas para resolver problemas de conectividade

## Arquitetura

A implementação segue a arquitetura recomendada:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Componentes UI │────▶│   Hooks React   │────▶│   API Routes    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │   Pieces MCP    │
                                               │                 │
                                               └─────────────────┘
```

## Componentes Implementados

### 1. Hook `usePiecesMCP`

Hook React para interagir com o Pieces MCP:

```typescript
// src/hooks/mcp/usePiecesMCP.ts
export function usePiecesMCP(options: UsePiecesMCPOptions = {}) {
  // ...
  
  return {
    askPiecesLTM,         // Consultar contexto histórico
    createPiecesMemory,    // Criar memória para uso futuro
    logConnectivityEvent,  // Registrar eventos de conectividade
    getConnectivityTroubleshooting, // Obter dicas de resolução
    isLoading,
    error,
    lastResponse
  };
}
```

### 2. API Endpoint

Endpoint para comunicação com o servidor Pieces MCP:

```typescript
// src/pages/api/mcp/pieces.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PiecesResponse>
) {
  // Implementação da comunicação com o Pieces MCP
}
```

### 3. Componente UI `OfflineIndicator`

Componente atualizado para utilizar o Pieces MCP:

```tsx
// src/components/realtime/OfflineIndicator.tsx
export function OfflineIndicator({ ... }) {
  // Integração com Pieces MCP para sugestões inteligentes
  // e registro de eventos de conectividade
}
```

### 4. Página de Teste

Página para testar a integração com o Pieces MCP:

```tsx
// src/pages/test-mcp.tsx
export default function TestMCPPage() {
  // Interface para testar as funcionalidades do Pieces MCP
}
```

## Configuração

A configuração do Pieces MCP é feita no arquivo `.trae/mcp.json`:

```json
{
  "mcpServers": {
    "Pieces": {
      "url": "http://localhost:39300/model_context_protocol/2024-11-05/sse"
    }
  }
}
```

## Uso

### Consultar o Contexto Histórico

```typescript
const { askPiecesLTM } = usePiecesMCP();

const result = await askPiecesLTM("Como resolver problemas de conectividade?");
```

### Criar Memória para Uso Futuro

```typescript
const { createPiecesMemory } = usePiecesMCP();

const result = await createPiecesMemory(
  "Documento importante sobre arquitetura", 
  ["arquitetura", "documentação"]
);
```

### Registrar Eventos de Conectividade

```typescript
const { logConnectivityEvent } = usePiecesMCP();

await logConnectivityEvent({
  type: 'offline',
  details: { timestamp: new Date().toISOString() }
});
```

### Obter Sugestões de Resolução de Problemas

```typescript
const { getConnectivityTroubleshooting } = usePiecesMCP();

const tips = await getConnectivityTroubleshooting('offline');
// Retorna array de dicas para resolver problemas de conectividade
```

## Testes

Para testar a integração, acesse a página `/test-mcp` que fornece uma interface para interagir com as funcionalidades do Pieces MCP.

## Requisitos

1. PiecesOS em execução na porta 39300
2. Configuração correta no arquivo `.trae/mcp.json`

## Próximos Passos

1. Implementar cache offline para consultas ao Pieces MCP
2. Adicionar mais integrações em outros componentes da aplicação
3. Implementar análise de padrões de uso para melhorar sugestões

---

## Referências

- [Documentação do Pieces MCP](https://docs.pieces.app/mcp)
- [Integração Pieces + Trae AI](https://docs.pieces.app/integrations/trae-ai)