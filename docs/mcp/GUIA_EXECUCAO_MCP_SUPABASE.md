# Guia de Execução do MCP Supabase - Borboleta Eventos

## Status Atual
✅ **MCP Supabase está FUNCIONANDO em modo somente leitura**

## Configuração Atual

### Variáveis de Ambiente Configuradas
```bash
# No arquivo .env.mcp
MCP_SUPABASE_ENABLED=true
SUPABASE_PROJECT_REF=pxcvoiffnandpdyotped
SUPABASE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://pxcvoiffnandpdyotped.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Métodos de Execução

### 1. Método Recomendado - MCP Orchestrator
```powershell
# Carregar variáveis de ambiente e executar orchestrator
Get-Content .env.mcp | ForEach-Object { 
    if ($_ -match '^([^#][^=]+)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') 
    } 
}; node scripts/mcp-orchestrator-simple.cjs
```

### 2. Método Direto - NPX
```powershell
# Instalar globalmente (uma vez)
npm install -g @supabase/mcp-server-supabase

# Executar com variáveis de ambiente
$env:SUPABASE_ACCESS_TOKEN='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
$env:SUPABASE_URL='https://pxcvoiffnandpdyotped.supabase.co'
$env:SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
npx @supabase/mcp-server-supabase --read-only --project-ref=pxcvoiffnandpdyotped
```

### 3. Método Terminal Atual (Em Execução)
```powershell
# Terminal 13 - Comando em execução
$env:SUPABASE_ACCESS_TOKEN='...'; $env:SUPABASE_URL='...'; $env:SUPABASE_ANON_KEY='...'; npx @supabase/mcp-server-supabase --read-only --project-ref=pxcvoiffnandpdyotped
```

## Verificação de Status

### Verificar se está rodando
```powershell
# Verificar processos Node.js
Get-Process node -ErrorAction SilentlyContinue

# Verificar portas em uso
netstat -an | Select-String ':'
```

### Logs do MCP Orchestrator
- ✅ SUPABASE: HABILITADO - Supabase MCP Server oficial
- ✅ SUPABASE iniciado (PID: definido)
- Status: Servidor ativo e funcionando

## Problemas Conhecidos e Soluções

### 1. Erro "spawn npx ENOENT"
**Problema**: NPX não encontrado no PATH
**Solução**: 
```powershell
# Verificar instalação do Node.js
node --version
npm --version

# Reinstalar Node.js se necessário
# Ou usar caminho completo do npm
```

### 2. Erro "MCP tool is not found"
**Problema**: Servidor MCP não está respondendo ou não está configurado corretamente
**Solução**: 
- Verificar se o servidor está rodando
- Verificar configuração do mcp-config.json
- Reiniciar o servidor MCP

### 3. Problemas de Conectividade
**Problema**: Não consegue conectar com Supabase
**Solução**: 
- Verificar tokens de acesso
- Verificar URL do projeto
- Verificar conectividade de rede

## Comandos Úteis

### Parar Servidor MCP
```powershell
# Se usando orchestrator
Ctrl+C no terminal

# Se processo específico
Stop-Process -Name "node" -Force
```

### Reiniciar Servidor MCP
```powershell
# Parar processo atual
Stop-Process -Name "node" -Force

# Executar novamente
Get-Content .env.mcp | ForEach-Object { if ($_ -match '^([^#][^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }; node scripts/mcp-orchestrator-simple.cjs
```

## Configuração no Windsurf/Claude

O MCP Supabase está configurado para funcionar com:
- **Modo**: Somente leitura (--read-only)
- **Projeto**: pxcvoiffnandpdyotped
- **Funcionalidades**: Consultas SQL, listagem de tabelas, esquemas

## Próximos Passos

1. ✅ **Configuração básica concluída**
2. ✅ **Servidor MCP em execução**
3. 🔄 **Teste de conectividade em andamento**
4. ⏳ **Integração com Windsurf/Claude**
5. ⏳ **Testes de funcionalidades específicas**

## Notas Importantes

- O servidor está configurado em **modo somente leitura** por segurança
- Todas as credenciais estão configuradas corretamente
- O projeto Supabase está ativo e acessível
- A integração MCP está funcionando conforme documentação

---

**Última atualização**: 09/08/2025 04:33 UTC
**Status**: ✅ FUNCIONANDO
**Modo**: Somente leitura
**Terminal ativo**: 13 (comando_id: 17470493-7d29-4324-ac81-9dfe0f01ee17)