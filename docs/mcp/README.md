# 📚 Documentação MCP - Model Context Protocol

Esta pasta contém toda a documentação relacionada ao Model Context Protocol (MCP) do projeto Queren/Borboleta Eventos.

## 📋 Índice de Documentos

### 🎯 Documentação Principal
- **[DOCUMENTACAO_MCP_CONSOLIDADA_PARA_LLM.md](./DOCUMENTACAO_MCP_CONSOLIDADA_PARA_LLM.md)** - 📚 Documentação consolidada para LLMs entenderem todo o sistema MCP
- **[MCP_SETUP_COMPLETO.md](./MCP_SETUP_COMPLETO.md)** - 🔧 Configuração completa do MCP no ambiente Docker
- **[MCP_SETUP_FINAL.md](./MCP_SETUP_FINAL.md)** - ✅ Setup final e validação do sistema

### 🌐 Browser MCP
- **[BROWSER_MCP_SETUP_COMPLETO.md](./BROWSER_MCP_SETUP_COMPLETO.md)** - 🌐 Instalação e configuração completa do Browser MCP

### 🐳 Docker Hub MCP
- **[DOCKER-HUB-MCP-SUCCESS.md](./DOCKER-HUB-MCP-SUCCESS.md)** - 🐳 Implementação bem-sucedida do Docker Hub MCP Gateway

### 📊 Supabase MCP
- **[SUPABASE_MCP_GUIDE.md](./SUPABASE_MCP_GUIDE.md)** - 📊 Guia completo do Supabase MCP

### 🔧 Integração VS Code
- **[SETUP_COMPLETO_MCP_VSCODE.md](./SETUP_COMPLETO_MCP_VSCODE.md)** - 🔧 Integração completa VS Code + MCP
- **[VSCODE_MCP_INTEGRATION_GUIDE.md](./VSCODE_MCP_INTEGRATION_GUIDE.md)** - 📖 Guia detalhado de integração VS Code

### 🎛️ Orquestração e Novos MCPs
- **[README-MCP-ORCHESTRATOR.md](./README-MCP-ORCHESTRATOR.md)** - 🎛️ Documentação do orquestrador MCP
- **[NOVOS_MCPS_IMPLEMENTADOS.md](./NOVOS_MCPS_IMPLEMENTADOS.md)** - ✨ Novos MCPs implementados no sistema

### 🧹 Manutenção
- **[LIMPEZA_MCP_COMPLETA.md](./LIMPEZA_MCP_COMPLETA.md)** - 🧹 Procedimentos de limpeza completa do MCP

### 🌪️ Windsurf IDE
- **[GUIA_MCP_WINDSURF.md](./GUIA_MCP_WINDSURF.md)** - 🌪️ Guia específico para Windsurf IDE

## 🏗️ Arquitetura Atual

### 8 MCPs Ativos:
1. 📋 **Context7** - Gerenciamento de contexto do projeto
2. ✨ **21st-dev Magic** - Ferramentas avançadas de desenvolvimento
3. 🎭 **Playwright** - Automação de browser e testes E2E
4. 🔄 **N8N** - Automação de workflows
5. 📊 **Supabase** - Gerenciamento de banco de dados
6. 🐙 **GitHub** - Operações Git e GitHub
7. 🌐 **Browser** - Monitoramento e interação com browser
8. 🐳 **Docker Hub** - Operações com registry de containers

### Container Docker:
- **Nome:** `queren-app-1`
- **Portas:** 3005:3000 (app), 8812:8812 (MCP communication)
- **Orquestrador:** `mcp-orchestrator-simple.cjs`

## 🚀 Como Usar

### Para Desenvolvedores:
1. Leia primeiro: `DOCUMENTACAO_MCP_CONSOLIDADA_PARA_LLM.md`
2. Configure ambiente: `MCP_SETUP_COMPLETO.md`
3. Integre VS Code: `SETUP_COMPLETO_MCP_VSCODE.md`

### Para LLMs:
- Use `DOCUMENTACAO_MCP_CONSOLIDADA_PARA_LLM.md` como referência principal
- Contém todos os comandos, configurações e casos de uso

### Comandos Rápidos:
```bash
# Verificar status
curl http://localhost:3005/health

# Iniciar MCPs
docker exec queren-app-1 node scripts/mcp-orchestrator-simple.cjs

# Verificar processos
docker exec queren-app-1 ps aux | grep mcp
```

## 📊 Status Atual

✅ **Funcionando:**
- 8 MCPs configurados e ativos
- Container Docker rodando
- VS Code integrado com 6 tasks
- Browser Tools Server ativo (porta 3026)
- Supabase MCP em modo read-only
- GitHub MCP com token válido

⏳ **Pendente:**
- Extensão Chrome do Browser MCP (instalação manual)

---

**📝 Nota:** Esta documentação é mantida atualizada conforme o sistema evolui. Para dúvidas ou atualizações, consulte o arquivo de consolidação principal.