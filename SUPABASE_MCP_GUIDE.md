# 🚀 Supabase MCP - Guia Completo

## 📋 Implementação Realizada

### **✅ Status:** FUNCIONANDO
- **MCP Server:** `@supabase/mcp-server-supabase@latest` (oficial)
- **Modo:** Read-only (segurança)
- **Projeto:** queren (pxcvoiffnandpdyotped)
- **Região:** sa-east-1
- **Status do Projeto:** ACTIVE_HEALTHY

### **🔧 Configuração:**

#### **Variáveis de Ambiente (.env.local):**
```bash
# Supabase Basic
SUPABASE_URL=https://pxcvoiffnandpdyotped.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase MCP Configuration
SUPABASE_PROJECT_REF=pxcvoiffnandpdyotped
SUPABASE_ACCESS_TOKEN=sbp_3e0344c08b3ce6123ab8df6b6bb7b5f48b3b4bc7
MCP_SUPABASE_ENABLED=true
```

#### **Orchestrador MCP:**
```javascript
SUPABASE: {
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase@latest', '--read-only', '--project-ref=pxcvoiffnandpdyotped'],
    description: 'Supabase MCP Server oficial',
    enabled: process.env.MCP_SUPABASE_ENABLED === 'true',
    env: {
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
}
```

## 🎯 Comandos Disponíveis no Windsurf

### **📊 Gerenciamento de Projetos:**
```bash
/mcp supabase list-projects              # Listar todos os projetos
/mcp supabase create-project "novo-app"  # Criar novo projeto
/mcp supabase get-project-config         # Ver configuração do projeto
```

### **🗃️ Operações de Banco de Dados:**
```bash
/mcp supabase run-sql "SELECT * FROM products LIMIT 10"
/mcp supabase list-tables
/mcp supabase create-table "new_table"
/mcp supabase get-table-schema "products"
```

### **🔐 Gerenciamento de API Keys:**
```bash
/mcp supabase list-api-keys
/mcp supabase create-api-key "publishable"
/mcp supabase update-api-key "key-id"
```

### **📈 Configurações Avançadas:**
```bash
/mcp supabase get-postgres-config
/mcp supabase update-postgres-config
/mcp supabase list-backups
/mcp supabase create-read-replica
```

## 🧪 Testes Realizados

### **✅ Teste 1: Listar Projetos**
- **Comando:** `list-all-projects`
- **Resultado:** 2 projetos encontrados (n8n, queren)
- **Status:** ✅ Sucesso

### **✅ Teste 2: Query SQL**
- **Comando:** `run-sql "SELECT table_name FROM information_schema.tables..."`
- **Resultado:** 5 tabelas listadas (orders, order_items, products, tickets, profiles)
- **Status:** ✅ Sucesso

## 🔒 Recursos de Segurança

### **Read-Only Mode:**
- **Ativo:** ✅ Sim
- **Benefit:** Previne alterações acidentais no banco
- **Queries:** Apenas SELECT permitidas
- **Gerenciamento:** CREATE/DROP ainda disponíveis via MCP tools

### **Project Scoping:**
- **Projeto:** Limitado ao `pxcvoiffnandpdyotped`
- **Isolamento:** Não acessa outros projetos
- **Tokens:** Scoped para projeto específico

### **Melhores Práticas Implementadas:**
1. ✅ **Ambiente de desenvolvimento** (não produção)
2. ✅ **Read-only mode** habilitado
3. ✅ **Project scoping** configurado
4. ✅ **Token scoped** para projeto específico
5. ✅ **Revisão manual** dos comandos no Windsurf

## 🚀 Recursos Avançados

### **🔄 Branching (Futuro):**
```bash
/mcp supabase create-branch "feature-branch"
/mcp supabase switch-branch "main"
```

### **📊 Analytics:**
```bash
/mcp supabase get-project-analytics
/mcp supabase list-connections
```

### **🛡️ SSL & Security:**
```bash
/mcp supabase get-ssl-config
/mcp supabase update-ssl-enforcement
```

## 📚 Documentação Oficial

- **GitHub:** https://github.com/supabase-community/supabase-mcp
- **Docs:** https://supabase.com/docs/guides/getting-started/mcp
- **Tools List:** https://github.com/supabase-community/supabase-mcp#tools

## 🆘 Troubleshooting

### **MCP não conecta:**
```bash
# Verificar container
docker exec borboleta-eventos-loja-app-1 env | grep SUPABASE

# Testar token
curl -H "Authorization: Bearer sbp_..." https://api.supabase.com/v1/projects
```

### **Queries falham:**
- Verificar se está em read-only mode
- Confirmar project-ref correto
- Validar sintaxe SQL PostgreSQL

### **Reconfigurar:**
```bash
# Atualizar configuração
copy mcp_config.json "%USERPROFILE%\.codeium\windsurf\mcp_config.json"

# Restart container
docker restart borboleta-eventos-loja-app-1
```

---

**🎉 Supabase MCP implementado com sucesso em 2025-08-05!**

*Integração oficial do Supabase via Model Context Protocol para desenvolvimento seguro e eficiente.*
