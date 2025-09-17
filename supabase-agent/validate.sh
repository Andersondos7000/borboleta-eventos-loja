#!/bin/bash
set -euo pipefail

# Configuração
REPORTS_DIR="reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VALIDATION_LOG="$REPORTS_DIR/validation_$TIMESTAMP.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$VALIDATION_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}" | tee -a "$VALIDATION_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$VALIDATION_LOG"
}

# Criar diretório de relatórios
mkdir -p "$REPORTS_DIR"

log "🔍 Validação Avançada - Iniciando"

# 1. Verificar conectividade e status
log "🔌 Verificando conectividade..."
if ! supabase status --linked >/dev/null 2>&1; then
    log_error "Não foi possível conectar ao projeto Supabase"
    exit 1
fi
log_success "Conectividade OK"

# 2. Verificar RLS em tabelas críticas
log "🔒 Verificando RLS..."
CRITICAL_TABLES=("customers" "orders" "payments" "tickets" "profiles" "events")
RLS_ISSUES=0

for table in "${CRITICAL_TABLES[@]}"; do
    RLS_ENABLED=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
        SELECT COALESCE(relrowsecurity, false) FROM pg_class 
        WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    " 2>/dev/null | tr -d ' ' || echo "f")
    
    if [ "$RLS_ENABLED" = "t" ]; then
        log_success "RLS ativo: $table"
    else
        log_warning "RLS inativo: $table"
        ((RLS_ISSUES++))
    fi
done

if [ $RLS_ISSUES -gt 0 ]; then
    log_warning "$RLS_ISSUES tabelas sem RLS ativo"
else
    log_success "Todas as tabelas críticas têm RLS ativo"
fi

# 3. Verificar foreign keys
log "🔗 Verificando foreign keys..."
FK_VIOLATIONS=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
    SELECT COUNT(*) FROM pg_constraint
    WHERE contype = 'f' AND NOT pg_catalog.pg_constraint_is_valid(oid)
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$FK_VIOLATIONS" -eq 0 ]; then
    log_success "Foreign keys válidas"
else
    log_error "$FK_VIOLATIONS foreign keys violadas"
fi

# 4. Verificar índices em colunas críticas
log "📊 Verificando índices..."
MISSING_INDEXES=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
    WITH critical_columns AS (
        SELECT 'orders' as table_name, 'customer_id' as column_name
        UNION SELECT 'orders', 'created_at'
        UNION SELECT 'tickets', 'event_id'
        UNION SELECT 'tickets', 'user_id'
        UNION SELECT 'profiles', 'user_id'
    )
    SELECT COUNT(*) FROM critical_columns cc
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes pi
        WHERE pi.tablename = cc.table_name
        AND pi.indexdef LIKE '%' || cc.column_name || '%'
    )
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$MISSING_INDEXES" -eq 0 ]; then
    log_success "Índices críticos presentes"
else
    log_warning "$MISSING_INDEXES índices críticos ausentes"
fi

# 5. Verificar migrações pendentes
log "📋 Verificando migrações..."
PENDING_MIGRATIONS=$(supabase migration list --linked 2>/dev/null | grep -c "Not applied" || echo "0")

if [ "$PENDING_MIGRATIONS" -eq 0 ]; then
    log_success "Todas as migrações aplicadas"
else
    log_warning "$PENDING_MIGRATIONS migrações pendentes"
fi

# 6. Performance checks
log "📊 Coletando métricas de performance..."
supabase inspect db outliers --linked > "$REPORTS_DIR/outliers_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar outliers"
supabase inspect db bloat --linked > "$REPORTS_DIR/bloat_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar bloat"
supabase inspect db vacuum-stats --linked > "$REPORTS_DIR/vacuum_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar vacuum stats"
supabase inspect db locks --linked > "$REPORTS_DIR/locks_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar locks"

# 7. Verificar tamanho do banco
log "💾 Verificando tamanho do banco..."
DB_SIZE=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
    SELECT pg_size_pretty(pg_database_size(current_database()))
" 2>/dev/null | tr -d ' ' || echo "N/A")
log "Tamanho do banco: $DB_SIZE"

# 8. Verificar conexões ativas
log "🔌 Verificando conexões ativas..."
ACTIVE_CONNECTIONS=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
    SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
" 2>/dev/null | tr -d ' ' || echo "N/A")
log "Conexões ativas: $ACTIVE_CONNECTIONS"

# 9. Resumo final
log_success "Validação concluída"
log "📋 Relatórios salvos em: $REPORTS_DIR/"
log "📄 Log completo: $VALIDATION_LOG"

# 10. Verificar se há problemas críticos
CRITICAL_ISSUES=0
if [ "$FK_VIOLATIONS" -gt 0 ]; then
    ((CRITICAL_ISSUES++))
fi
if [ "$RLS_ISSUES" -gt 3 ]; then  # Mais de 3 tabelas sem RLS
    ((CRITICAL_ISSUES++))
fi

if [ $CRITICAL_ISSUES -gt 0 ]; then
    log_error "$CRITICAL_ISSUES problemas críticos encontrados!"
    exit 1
else
    log_success "Nenhum problema crítico encontrado"
fi