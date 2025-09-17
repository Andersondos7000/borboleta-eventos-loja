# 🔧 Guia de Troubleshooting - Supabase Agent

## 🚨 Problemas Comuns

### 1. Erro de Autenticação

**Sintoma:**
```bash
Error: Invalid token or insufficient permissions
```

**Soluções:**
1. Verificar se o token está correto:
   ```bash
   echo $SUPABASE_ACCESS_TOKEN
   supabase whoami
   ```

2. Gerar novo token em: https://supabase.com/dashboard/account/tokens
   - Permissões necessárias: `project:read`, `project:write`, `db:write`

3. Verificar se o token não expirou

### 2. Projeto não encontrado

**Sintoma:**
```bash
Error: Project not found or access denied
```

**Soluções:**
1. Verificar PROJECT_REF:
   ```bash
   echo $PROJECT_REF
   ```

2. Confirmar na URL do dashboard:
   `https://supabase.com/dashboard/project/[PROJECT_REF]`

3. Verificar se você tem acesso ao projeto

### 3. Falha na aplicação de migrações

**Sintoma:**
```bash
Error applying migration: syntax error at or near...
```

**Soluções:**
1. Validar SQL localmente:
   ```bash
   supabase db reset
   supabase db start
   ```

2. Verificar dependências entre migrações:
   ```bash
   supabase migration list
   ```

3. Aplicar migrações uma por vez:
   ```bash
   supabase db push --linked --include-all=false
   ```

### 4. Conflitos de schema

**Sintoma:**
```bash
Error: relation "table_name" already exists
```

**Soluções:**
1. Sincronizar schema local:
   ```bash
   supabase db pull --linked
   ```

2. Verificar diferenças:
   ```bash
   supabase db diff --linked
   ```

3. Resolver conflitos manualmente ou usar `IF NOT EXISTS`

### 5. Timeout de conexão

**Sintoma:**
```bash
Error: connection timeout
```

**Soluções:**
1. Verificar conectividade:
   ```bash
   ping db.supabase.co
   ```

2. Verificar firewall/proxy

3. Tentar novamente com retry:
   ```bash
   for i in {1..3}; do supabase db push --linked && break || sleep 10; done
   ```

## 🔍 Comandos de Diagnóstico

### Verificar status geral
```bash
# Status do projeto
supabase status

# Informações do usuário
supabase whoami

# Listar projetos disponíveis
supabase projects list
```

### Verificar saúde do banco
```bash
# Conexões ativas
supabase inspect db locks --linked

# Queries lentas
supabase inspect db outliers --linked

# Tabelas com bloat
supabase inspect db bloat --linked
```

### Verificar migrações
```bash
# Listar migrações
supabase migration list --linked

# Verificar diferenças
supabase db diff --linked

# Histórico de migrações
supabase migration repair --linked
```

## 🛠️ Scripts de Recuperação

### Rollback de migração
```bash
#!/bin/bash
# rollback.sh
set -euo pipefail

MIGRATION_VERSION="$1"

echo "🔄 Fazendo rollback para versão: $MIGRATION_VERSION"

# Backup antes do rollback
supabase db dump --linked > "backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql"

# Aplicar rollback
supabase migration down --linked --to "$MIGRATION_VERSION"

echo "✅ Rollback concluído"
```

### Sincronização forçada
```bash
#!/bin/bash
# force-sync.sh
set -euo pipefail

echo "🔄 Sincronização forçada do schema"

# Backup do schema atual
supabase db dump --linked --schema-only > "schema_backup_$(date +%Y%m%d_%H%M%S).sql"

# Puxar schema remoto
supabase db pull --linked

# Aplicar mudanças locais
supabase db push --linked

echo "✅ Sincronização concluída"
```

## 📊 Monitoramento de Problemas

### Alertas automáticos
```bash
# Verificar se há problemas críticos
check_critical_issues() {
    local issues=0
    
    # Verificar conexões excessivas
    local connections=$(psql "$DB_URL" -t -c "SELECT count(*) FROM pg_stat_activity" | tr -d ' ')
    if [ "$connections" -gt 100 ]; then
        echo "⚠️ Muitas conexões ativas: $connections"
        ((issues++))
    fi
    
    # Verificar locks
    local locks=$(psql "$DB_URL" -t -c "SELECT count(*) FROM pg_locks WHERE NOT granted" | tr -d ' ')
    if [ "$locks" -gt 0 ]; then
        echo "⚠️ Locks ativos: $locks"
        ((issues++))
    fi
    
    # Verificar tamanho do banco
    local size_mb=$(psql "$DB_URL" -t -c "SELECT pg_database_size(current_database())/1024/1024" | tr -d ' ')
    if [ "$(echo "$size_mb > 1000" | bc)" -eq 1 ]; then
        echo "⚠️ Banco muito grande: ${size_mb}MB"
        ((issues++))
    fi
    
    return $issues
}
```

## 🆘 Contatos de Emergência

### Suporte Supabase
- **Documentação:** https://supabase.com/docs
- **Discord:** https://discord.supabase.com
- **GitHub Issues:** https://github.com/supabase/supabase/issues

### Logs importantes
```bash
# Logs do Supabase CLI
~/.supabase/logs/

# Logs do agente
reports/

# Logs do sistema
/var/log/ (Linux)
~/Library/Logs/ (macOS)
%APPDATA%/logs/ (Windows)
```

## 🔄 Procedimentos de Emergência

### 1. Parar deploy em andamento
```bash
# Interromper processo
Ctrl+C

# Verificar se há migrações pendentes
supabase migration list --linked

# Fazer rollback se necessário
supabase migration down --linked
```

### 2. Restaurar backup
```bash
# Listar backups disponíveis
ls -la backups/

# Restaurar backup específico
psql "$DB_URL" < "backup_YYYYMMDD_HHMMSS.sql"
```

### 3. Contatar equipe
```bash
# Gerar relatório de diagnóstico
./validate.sh > diagnostic_report.txt

# Incluir logs relevantes
tar -czf emergency_logs.tar.gz reports/ diagnostic_report.txt
```

---

**💡 Dica:** Sempre mantenha backups atualizados e teste os procedimentos de recuperação em ambiente de staging antes de aplicar em produção.