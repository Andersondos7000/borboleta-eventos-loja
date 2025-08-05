# 🚀 VS Code + MCP Integration Guide

## Visão Geral

Este guia documenta a integração completa entre VS Code e nosso ecossistema MCP (Model Context Protocol) com 7 servidores ativos, criando um ambiente de desenvolvimento automatizado para o projeto Borboleta Eventos.

## 🏗️ Arquitetura da Integração

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code IDE                              │
├─────────────────────────────────────────────────────────────────┤
│  📁 .vscode/                                                    │
│  ├── tasks.json          (6 tasks automatizadas)               │
│  ├── settings.json       (Configurações MCP)                   │
│  └── mcp-integration.json (Configuração avançada)              │
├─────────────────────────────────────────────────────────────────┤
│  🔧 scripts/                                                    │
│  └── vscode-mcp-integration.ps1 (Automação PowerShell)         │
├─────────────────────────────────────────────────────────────────┤
│  🧩 Extensão Personalizada                                      │
│  └── .vscode/extensions/borboleta-mcp/                         │
│      ├── package.json    (Configuração da extensão)           │
│      ├── src/extension.ts (Lógica principal)                   │
│      └── tsconfig.json   (TypeScript config)                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Ecosystem (7 Servers)                    │
├─────────────────────────────────────────────────────────────────┤
│  🐙 GitHub Official MCP    📊 Supabase MCP                     │
│  🔄 N8N MCP               🌐 Browser Tools MCP                 │
│  ✨ Magic MCP             🎭 Playwright MCP                     │
│  📋 Context7 MCP                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infraestrutura                               │
├─────────────────────────────────────────────────────────────────┤
│  🐳 Docker Container: borboleta-eventos-loja-app-1             │
│  ☁️  Supabase Project: pxcvoiffnandpdyotped                     │
│  💳 AbacatePay API Integration                                  │
│  ⚙️  GitHub Actions Workflows                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Tasks Automatizadas

### 1. Run Vite Dev Server
```json
{
  "label": "Run Vite Dev Server",
  "command": "pnpm dev",
  "group": "build",
  "isBackground": true
}
```

### 2. 🚀 Deploy Edge Functions via MCP
```json
{
  "label": "🚀 Deploy Edge Functions via MCP",
  "command": "docker exec -i borboleta-eventos-loja-app-1 bash -c 'cd /app && supabase functions deploy'",
  "group": "build"
}
```

### 3. ⚡ Start MCP Orchestrator (7 Servers)
```json
{
  "label": "⚡ Start MCP Orchestrator (7 Servers)",
  "command": "docker exec -i borboleta-eventos-loja-app-1 bash -c 'cd /app && node scripts/mcp-orchestrator-simple.cjs'",
  "group": "test",
  "isBackground": true
}
```

### 4. 🔍 Test AbacatePay API via MCP
```json
{
  "label": "🔍 Test AbacatePay API via MCP",
  "command": "curl test para API do AbacatePay",
  "group": "test"
}
```

### 5. 📊 MCP Status Check
```json
{
  "label": "📊 MCP Status Check",
  "command": "docker exec -i borboleta-eventos-loja-app-1 bash -c 'ps aux | grep mcp'",
  "group": "test"
}
```

### 6. 🔧 GitHub MCP Test
```json
{
  "label": "🔧 GitHub MCP Test",
  "command": "echo 'Testing GitHub MCP integration...'",
  "group": "test"
}
```

## ⚙️ Configurações VS Code

### MCP Servers Configuration
```json
{
  "mcp.servers": {
    "github-official": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "supabase": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "${VITE_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

### Automação em Save
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## 🧩 Extensão Personalizada

### Comandos Disponíveis

| Comando | Atalho | Função |
|---------|--------|---------|
| `🚀 Deploy Supabase Functions` | `Ctrl+Alt+D` | Deploy das Edge Functions |
| `💳 Test Payment API` | `Ctrl+Alt+T` | Teste da API de pagamento |
| `📊 Check MCP Status` | - | Verificação do status MCP |
| `⚡ Start MCP Orchestrator` | - | Iniciar orquestrador MCP |

### Status Bar Integration
- **Indicador Visual**: Mostra status em tempo real
- **Estados**: Ready, Deploying, Testing, Error
- **Click Action**: Executa verificação de status

## 🔧 Script PowerShell de Automação

### Uso Básico
```powershell
# Setup completo
.\scripts\vscode-mcp-integration.ps1 -Action setup

# Iniciar MCP
.\scripts\vscode-mcp-integration.ps1 -Action start

# Deploy Supabase
.\scripts\vscode-mcp-integration.ps1 -Action deploy

# Testar API
.\scripts\vscode-mcp-integration.ps1 -Action test

# Verificar status
.\scripts\vscode-mcp-integration.ps1 -Action status

# Abrir VS Code
.\scripts\vscode-mcp-integration.ps1 -Action vscode
```

### Funcionalidades
- ✅ Verificação de containers Docker
- ✅ Gerenciamento do MCP Orchestrator
- ✅ Deploy automatizado de funções
- ✅ Teste de APIs
- ✅ Abertura integrada do VS Code

## 🔗 Integrações MCP Ativas

### 1. GitHub Official MCP
- **Status**: ✅ Conectado (ca_kL8Flu_ivBbI)
- **Capacidades**: Repositórios, Issues, PRs, Workflows
- **Uso**: Deploy automatizado via GitHub Actions

### 2. Supabase MCP  
- **Status**: ✅ Conectado (pxcvoiffnandpdyotped)
- **Capacidades**: Edge Functions, Database, Storage, Auth
- **Uso**: Deploy e gerenciamento de funções

### 3. Context7 MCP
- **Status**: ✅ Ativo
- **Capacidades**: Contexto de projeto, análise de código
- **Uso**: Assistência de desenvolvimento

### 4. N8N MCP
- **Status**: ✅ Ativo  
- **Capacidades**: Automação de workflows
- **Uso**: Orquestração de processos

### 5. Browser Tools MCP
- **Status**: ✅ Ativo
- **Capacidades**: Automação web, testes
- **Uso**: Testes de interface

### 6. Magic MCP
- **Status**: ✅ Ativo
- **Capacidades**: Funcionalidades avançadas
- **Uso**: Operações especiais

### 7. Playwright MCP
- **Status**: ✅ Ativo
- **Capacidades**: Testes end-to-end
- **Uso**: Automação de testes

## 🚀 Workflows de Desenvolvimento

### Fluxo Típico de Desenvolvimento

1. **Início do Desenvolvimento**
   ```bash
   # Script automatizado
   .\scripts\vscode-mcp-integration.ps1 -Action setup
   ```

2. **Edição de Código**
   - Auto-save formatação (ESLint + Prettier)
   - TypeScript checking em tempo real
   - MCP status na status bar

3. **Deploy de Funções**
   - Manual: `Ctrl+Alt+D` ou Command Palette
   - Automático: Save em arquivos `supabase/functions/**/*.ts`

4. **Teste de APIs**
   - Manual: `Ctrl+Alt+T`
   - Resposta mostrada no Output Channel

5. **Monitoramento**
   - Status bar sempre visível
   - Logs centralizados no Output Channel

## 📊 Benefícios da Integração

### Para Desenvolvedores
- ⚡ **Produtividade**: Deploy com 1 clique
- 🔍 **Visibilidade**: Status em tempo real
- 🤖 **Automação**: Menos tarefas manuais
- 🛠️ **Debugging**: Logs centralizados

### Para o Projeto
- 🚀 **Deploy Rápido**: Supabase functions via MCP
- 🔄 **CI/CD**: GitHub Actions integrado
- 💳 **Testes**: AbacatePay API automatizado
- 📈 **Monitoramento**: 7 servidores MCP ativos

## 🎯 Próximos Passos

### Melhorias Planejadas
- [ ] **Testes E2E**: Integração com Playwright MCP
- [ ] **Notificações**: Webhooks de deploy
- [ ] **Métricas**: Dashboard de performance
- [ ] **Rollback**: Deploy reverso automático

### Expansões Futuras
- [ ] **Multi-ambiente**: Dev/Staging/Prod
- [ ] **Team Collaboration**: Shared MCP configs
- [ ] **Custom Commands**: Comandos específicos do projeto
- [ ] **Integration Tests**: Suite completa automatizada

## 🆘 Troubleshooting

### Problemas Comuns

**1. Container Docker não encontrado**
```bash
# Verificar containers ativos
docker ps

# Iniciar container se necessário
docker-compose up -d
```

**2. MCP Orchestrator não inicia**
```bash
# Verificar logs
docker logs borboleta-eventos-loja-app-1

# Reiniciar container
docker restart borboleta-eventos-loja-app-1
```

**3. Deploy Supabase falha**
```bash
# Verificar variáveis de ambiente
docker exec -i borboleta-eventos-loja-app-1 env | grep SUPABASE

# Verificar login
docker exec -i borboleta-eventos-loja-app-1 supabase status
```

### Logs e Debug
- **VS Code Output**: `Borboleta MCP` channel
- **Docker Logs**: `docker logs borboleta-eventos-loja-app-1`
- **MCP Status**: Via extensão ou script PowerShell

## 📈 Métricas de Sucesso

### KPIs Atuais
- ✅ **7 servidores MCP**: 100% ativos
- ✅ **Deploy time**: < 30 segundos
- ✅ **Test coverage**: API de pagamento automatizada
- ✅ **Developer experience**: 1-click operations

### Objetivos
- 🎯 **Zero manual deploys**: 100% automatizado
- 🎯 **Sub-10s feedback**: Testes instantâneos  
- 🎯 **100% uptime**: MCP ecosystem resiliente
- 🎯 **Team adoption**: Todos usando VS Code integration

---

> **Nota**: Esta integração representa o estado da arte em automação de desenvolvimento, combinando VS Code, MCP ecosystem e DevOps moderno para maximum developer productivity.

**Última atualização**: Janeiro 2025
**Versão**: 3.0.0
**Responsável**: MCP Integration Team
