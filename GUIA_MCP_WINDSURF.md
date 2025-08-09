# 🚀 Guia de Uso MCP no Windsurf

## 📱 Como Acessar os MCPs

### 1. **Interface do Windsurf:**
- **Ícone MCP:** Barra lateral esquerda
- **Painel Chat:** Digite comandos MCP
- **Command Palette:** `Ctrl+Shift+P` → "MCP"

### 2. **Comandos Disponíveis:**

#### 🔍 **CONTEXT7** - Documentação
```
/mcp context7 search "React hooks"
/mcp context7 document "Como usar useState"
```

#### 🐙 **GITHUB** - Repositório
```
/mcp github list-repos
/mcp github create-issue "Bug no login"
/mcp github create-pr "Implementar novo recurso"
```

#### 🚀 **SUPABASE** - Banco de Dados
```
/mcp supabase list-projects
/mcp supabase run-sql "SELECT * FROM products LIMIT 10"
/mcp supabase create-table "users"
```

#### 🎭 **PLAYWRIGHT** - Automação
```
/mcp playwright navigate "https://exemplo.com"
/mcp playwright screenshot "homepage"
/mcp playwright test-form
```

#### 🔧 **N8N** - Workflow Automation
```
/mcp n8n list-workflows
/mcp n8n execute-workflow "workflow-id"
/mcp n8n create-workflow
```

#### 🌐 **BROWSER** - Web Interaction
```
/mcp browser navigate "https://site.com"
/mcp browser click "button"
/mcp browser extract-text
```

#### ✨ **MAGIC** - 21st Dev Tools
```
/mcp magic generate-code
/mcp magic optimize-performance
/mcp magic analyze-project
```

## 🔧 Configuração Atual

### **Status:** ✅ ATIVO e TESTADO
- **Docker:** `borboleta-eventos-loja-app-1` ✅ Rodando
- **Porta MCP:** `8812` ✅ Ativa
- **Configuração:** `~/.codeium/windsurf/mcp_config.json` ✅ Copiada
- **GitHub Token:** ✅ Validado e funcionando

### **Servidores:**
- ✅ Context7: Habilitado (gerenciamento de contexto)
- ✅ GitHub: **TESTADO e FUNCIONANDO** (Issue #1 criada com sucesso)
- ✅ **Supabase: NOVO e FUNCIONANDO** (MCP oficial integrado)
- ✅ Playwright: Habilitado (automação web)

### **🧪 Testes Realizados:**

**GitHub MCP:** ✅ **SUCESSO**
- **Ação:** Criar issue automaticamente via MCP
- **Resultado:** Issue #1 criada em `borboleta-eventos-loja`
- **URL:** https://github.com/Andersondos7000/borboleta-eventos-loja/issues/1
- **Data:** 2025-08-05 00:57:58Z

**Supabase MCP:** ✅ **NOVO SUCESSO**
- **Ação:** Query SQL no banco de dados via MCP oficial
- **Resultado:** Listou 5 tabelas do projeto (orders, order_items, products, tickets, profiles)
- **Projeto:** queren (pxcvoiffnandpdyotped)
- **Modo:** Read-only (seguro)
- **Data:** 2025-08-05 01:07:26Z

## 🆘 Solução de Problemas

### **MCP não aparece:**
1. Reinicie o Windsurf completamente
2. Verifique se o Docker está rodando
3. Confirme o arquivo de configuração

### **Comandos não funcionam:**
```bash
# Verificar container
docker ps --filter "name=borboleta"

# Restart se necessário
docker-compose restart
```

### **Reconfigurar:**
```bash
# Copiar novamente
copy mcp_config.json "%USERPROFILE%\.codeium\windsurf\mcp_config.json"
```

## 🎯 Próximos Passos

1. **Abrir Windsurf IDE**
2. **Procurar ícone MCP** na lateral
3. **Testar comandos** no chat
4. **Explorar funcionalidades**

---
*Configuração completa em: 2025-08-05*
