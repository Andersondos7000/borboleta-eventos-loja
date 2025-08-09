# 📚 DOCUMENTAÇÃO MCP CONSOLIDADA PARA LLM

## 🎯 RESUMO EXECUTIVO

Este documento consolida toda a documentação sobre Model Context Protocol (MCP) do projeto Queren/Borboleta Eventos para facilitar o entendimento por LLMs. O sistema possui **8 MCPs ativos** em ambiente Docker com integração completa ao VS Code.

---

## 🏗️ ARQUITETURA GERAL

### Sistema MCP Centralizado
```
🖥️  Windsurf IDE
    ↓
🐳 MCP_DOCKER (Container: queren-app-1)
    ↓
🎛️  MCP Orchestrator (mcp-orchestrator-simple.cjs)
    ↓
📡 8 Servidores MCP Ativos
```

### Container Docker
- **Nome:** `queren-app-1`
- **Portas:** 3005:3000 (app), 8812:8812 (MCP communication via socat)
- **Base:** Node.js com ambiente completo
- **Localização:** `c:\xampps\htdocs\queren`

---

## 🔧 CONFIGURAÇÃO ATUAL (mcp-config.json)

### 8 MCPs Configurados e Funcionais:

#### 1. 📋 CONTEXT7
```json
{
  "command": "npx",
  "args": ["-y", "@context7/mcp-server@latest"],
  "description": "Context7 MCP Server for project context management"
}
```

#### 2. ✨ 21ST-DEV-MAGIC
```json
{
  "command": "npx",
  "args": ["-y", "@21st-dev/mcp-magic@latest"],
  "description": "21st Dev Magic MCP Server for advanced development tools"
}
```

#### 3. 🎭 PLAYWRIGHT
```json
{
  "command": "npx",
  "args": ["-y", "@executeautomation/playwright-mcp-server@latest"],
  "description": "Playwright MCP Server for browser automation and testing"
}
```

#### 4. 🔄 N8N-MCP
```json
{
  "command": "node",
  "args": ["/app/n8n-mcp/dist/index.js"],
  "description": "N8N MCP Server for workflow automation",
  "env": {
    "N8N_HOST": "http://localhost:5678",
    "N8N_API_KEY": "n8n_api_key_placeholder"
  }
}
```

#### 5. 📊 SUPABASE
```json
{
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--read-only", "--project-ref=pxcvoiffnandpdyotped"],
  "description": "Supabase MCP Server oficial para gerenciamento de banco de dados",
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_3e0344c08b3ce6123ab8df6b6bb7b5f48b3b4bc7",
    "SUPABASE_URL": "https://pxcvoiffnandpdyotped.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 6. 🐙 GITHUB
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github@latest"],
  "description": "GitHub MCP Server oficial para operações Git e GitHub",
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_11BCQY3FQ0aMfOQJmrHjOl_wK..."
  }
}
```

#### 7. 🌐 BROWSER
```json
{
  "command": "npx",
  "args": ["@agentdeskai/browser-tools-mcp@latest"],
  "description": "Browser monitoring and interaction tool via MCP - AgentDeskAI",
  "env": {
    "BROWSER_WS_ENDPOINT": "ws://localhost:9222"
  }
}
```

#### 8. 🐳 DOCKERHUB
```json
{
  "command": "docker",
  "args": ["run", "--rm", "-i", "mcp/dockerhub"],
  "description": "Docker Hub MCP Server for container registry operations"
}
```

---

## 🚀 COMO USAR OS MCPs

### 📋 Context7 MCP
**Função:** Gerenciamento de contexto do projeto
```bash
# Comandos disponíveis:
/mcp context7 analyze-project
/mcp context7 get-project-structure
/mcp context7 summarize-codebase
```

### ✨ 21st-dev Magic MCP
**Função:** Ferramentas avançadas de desenvolvimento
```bash
# Comandos disponíveis:
/mcp magic generate-component
/mcp magic optimize-code
/mcp magic create-tests
```

### 🎭 Playwright MCP
**Função:** Automação de browser e testes E2E
```bash
# Comandos disponíveis:
/mcp playwright run-test
/mcp playwright capture-screenshot
/mcp playwright automate-workflow
```

### 🔄 N8N MCP
**Função:** Automação de workflows
```bash
# Comandos disponíveis:
/mcp n8n create-workflow
/mcp n8n execute-workflow
/mcp n8n list-workflows
```
**Configuração:** N8N rodando em http://localhost:5678

### 📊 Supabase MCP
**Função:** Gerenciamento de banco de dados (modo read-only)
```bash
# Comandos disponíveis:
/mcp supabase list-projects
/mcp supabase run-sql "SELECT * FROM products LIMIT 10"
/mcp supabase list-tables
/mcp supabase get-table-schema "products"
/mcp supabase list-api-keys
```
**Projeto:** queren (pxcvoiffnandpdyotped)
**Região:** sa-east-1
**Status:** ACTIVE_HEALTHY

### 🐙 GitHub MCP
**Função:** Operações Git e GitHub
```bash
# Comandos disponíveis:
/mcp github create-repository
/mcp github list-repositories
/mcp github create-issue
/mcp github create-pull-request
/mcp github get-file-contents
```

### 🌐 Browser MCP
**Função:** Monitoramento e interação com browser
```bash
# Comandos disponíveis:
"Tire um screenshot desta página"
"Execute uma auditoria de acessibilidade"
"Verifique os logs do console"
"Analise a performance desta página"
"Execute o modo de auditoria completa"
"Capture o tráfego de rede"
```
**Status:** 95% instalado (falta extensão Chrome manual)
**Server:** Browser Tools Server rodando na porta 3026

### 🐳 Docker Hub MCP
**Função:** Operações com registry de containers
```bash
# Comandos disponíveis:
/mcp dockerhub list-repositories
/mcp dockerhub create-repository
/mcp dockerhub get-repository-info
/mcp dockerhub list-tags
/mcp dockerhub search
```

---

## 🔧 INTEGRAÇÃO VS CODE

### Tasks Automatizadas (6 disponíveis):
1. **🚀 Deploy Edge Functions via MCP** - Deploy automatizado
2. **⚡ Start MCP Orchestrator (7 Servers)** - Iniciar ecosystem
3. **🔍 Test AbacatePay API via MCP** - Teste de pagamento
4. **📊 MCP Status Check** - Monitorar processos
5. **🔧 GitHub MCP Test** - Teste integração GitHub
6. **Run Vite Dev Server** - Servidor desenvolvimento

### Extensão Personalizada:
- **Nome:** Borboleta MCP Extension
- **Comandos:** 4 comandos principais
- **Atalhos:** Ctrl+Alt+D (Deploy), Ctrl+Alt+T (Test)
- **Status Bar:** Indicadores visuais em tempo real

### Script PowerShell:
```powershell
# Uso completo
.\scripts\vscode-mcp-simple.ps1 -Action setup   # Setup completo
.\scripts\vscode-mcp-simple.ps1 -Action start   # Iniciar MCP
.\scripts\vscode-mcp-simple.ps1 -Action deploy  # Deploy functions
.\scripts\vscode-mcp-simple.ps1 -Action test    # Testar APIs
.\scripts\vscode-mcp-simple.ps1 -Action status  # Verificar status
```

---

## 🏗️ ARQUITETURA TÉCNICA

### Base de Instalação:
1. **Configuração Central:** `mcp-config.json` define todos os 8 MCPs
2. **Container Docker:** Ambiente isolado com Node.js
3. **Ambiente Windows:** XAMPP em `c:\xampps\htdocs\queren`

### Tipos de Instalação:
1. **NPX (maioria):** Instalação dinâmica via `npx -y package@latest`
2. **Docker Container:** `mcp/dockerhub` roda em container separado
3. **Instalação Local:** `n8n-mcp` e `@agentdeskai/browser-tools-server`

### Lógica de Execução:
1. **Inicialização:** `mcp-orchestrator-simple.cjs` spawna processos
2. **Comunicação:** Cada MCP roda como processo Node.js independente
3. **Orquestração:** Orchestrator gerencia ciclo de vida
4. **Integração:** Windsurf IDE conecta via protocolo MCP

### Fluxo de Comunicação:
```
Windsurf IDE → MCP Protocol → Docker Container → Orchestrator → Individual MCPs
```

### Casos Especiais:
- **Browser MCP:** Requer extensão Chrome manual
- **Docker Hub MCP:** Roda em container Docker separado
- **n8n MCP:** Instalação local dentro do container

---

## 🔐 VARIÁVEIS DE AMBIENTE

### Autenticação:
- **SUPABASE_ACCESS_TOKEN:** Token de acesso Supabase
- **GITHUB_PERSONAL_ACCESS_TOKEN:** Token GitHub
- **N8N_API_KEY:** Chave API N8N

### Configuração:
- **SUPABASE_URL:** URL do projeto Supabase
- **SUPABASE_ANON_KEY:** Chave anônima Supabase
- **N8N_HOST:** Host do N8N (localhost:5678)
- **BROWSER_WS_ENDPOINT:** WebSocket do browser

---

## 📊 STATUS ATUAL

### ✅ Funcionando:
- 8 MCPs configurados e ativos
- Container Docker rodando
- VS Code integrado com 6 tasks
- Browser Tools Server ativo (porta 3026)
- Supabase MCP em modo read-only
- GitHub MCP com token válido
- N8N MCP conectado

### ⏳ Pendente:
- Extensão Chrome do Browser MCP (instalação manual)

### 🔧 Comandos de Verificação:
```bash
# Verificar status do servidor
curl -s http://localhost:3005/health

# Verificar processos MCP
docker exec queren-app-1 ps aux | grep mcp

# Verificar porta do browser server
docker exec queren-app-1 netstat -tlnp | grep 3026
```

---

## 🎯 CASOS DE USO PRÁTICOS

### Desenvolvimento:
1. **Análise de Código:** Context7 para estrutura do projeto
2. **Testes Automatizados:** Playwright para E2E
3. **Deploy:** GitHub MCP para automação
4. **Banco de Dados:** Supabase MCP para queries

### Automação:
1. **Workflows:** N8N para processos complexos
2. **Browser Testing:** Browser MCP para auditorias
3. **Container Management:** Docker Hub MCP
4. **Code Generation:** Magic MCP para otimizações

### Monitoramento:
1. **Performance:** Browser MCP auditorias
2. **Status:** VS Code tasks para verificação
3. **Logs:** Orchestrator centralizado
4. **Health Checks:** Endpoints de saúde

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### Arquivos de Referência:
- `BROWSER_MCP_SETUP_COMPLETO.md` - Setup completo Browser MCP
- `DOCKER-HUB-MCP-SUCCESS.md` - Implementação Docker Hub
- `SUPABASE_MCP_GUIDE.md` - Guia completo Supabase
- `SETUP_COMPLETO_MCP_VSCODE.md` - Integração VS Code
- `VSCODE_MCP_INTEGRATION_GUIDE.md` - Guia detalhado VS Code
- `MCP_SETUP_COMPLETO.md` - Configuração geral
- `DOCUMENTACAO_GERAL.md` - Informações do projeto

### Links Úteis:
- **Browser Extension:** [GitHub Releases](https://github.com/AgentDeskAI/browser-tools-mcp/releases/latest)
- **Supabase Project:** https://pxcvoiffnandpdyotped.supabase.co
- **N8N Interface:** http://localhost:5678

---

## 🚀 COMANDOS RÁPIDOS PARA LLM

### Iniciar Sistema:
```bash
# Iniciar container
docker-compose up -d

# Iniciar MCPs
docker exec queren-app-1 node scripts/mcp-orchestrator-simple.cjs
```

### Verificar Status:
```bash
# Health check
curl http://localhost:3005/health

# Processos ativos
docker exec queren-app-1 ps aux | grep -E "(mcp|node)"
```

### Usar MCPs:
```bash
# Via Windsurf IDE - usar comandos /mcp
/mcp supabase list-tables
/mcp github list-repositories
/mcp playwright capture-screenshot
```

---

**📝 Nota:** Esta documentação consolida todo o conhecimento sobre MCPs no projeto Queren para facilitar o entendimento e uso por LLMs. O sistema está 95% funcional, com apenas a extensão Chrome pendente de instalação manual.