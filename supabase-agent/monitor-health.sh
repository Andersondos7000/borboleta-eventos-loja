#!/bin/bash
set -euo pipefail

# Script de Monitoramento Contínuo da Saúde do Supabase
# Uso: ./monitor-health.sh [intervalo_em_segundos]

INTERVAL=${1:-60}  # Padrão: 60 segundos
REPORTS_DIR="reports/health"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HEALTH_LOG="$REPORTS_DIR/health_monitor_$TIMESTAMP.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$HEALTH_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$HEALTH_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}" | tee -a "$HEALTH_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$HEALTH_LOG"
}

# Criar diretório de relatórios
mkdir -p "$REPORTS_DIR"

# Função para verificar conectividade
check_connectivity() {
    if supabase status --linked >/dev/null 2>&1; then
        log_success "Conectividade OK"
        return 0
    else
        log_error "Falha na conectividade"
        return 1
    fi
}

# Função para verificar métricas de performance
check_performance() {
    local db_url=$(supabase status | grep 'DB URL' | awk '{print $3}')
    
    # Conexões ativas
    local active_connections=$(psql "$db_url" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'" 2>/dev/null | tr -d ' ' || echo "N/A")
    log "Conexões ativas: $active_connections"
    
    # Queries lentas (> 1 segundo)
    local slow_queries=$(psql "$db_url" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '1 second'" 2>/dev/null | tr -d ' ' || echo "N/A")
    if [ "$slow_queries" != "N/A" ] && [ "$slow_queries" -gt 0 ]; then
        log_warning "$slow_queries queries lentas detectadas"
    else
        log_success "Nenhuma query lenta detectada"
    fi
    
    # Locks ativos
    local active_locks=$(psql "$db_url" -t -c "SELECT count(*) FROM pg_locks WHERE NOT granted" 2>/dev/null | tr -d ' ' || echo "N/A")
    if [ "$active_locks" != "N/A" ] && [ "$active_locks" -gt 0 ]; then
        log_warning "$active_locks locks ativos detectados"
    else
        log_success "Nenhum lock ativo"
    fi
}

# Função para verificar tamanho do banco
check_database_size() {
    local db_url=$(supabase status | grep 'DB URL' | awk '{print $3}')
    local db_size=$(psql "$db_url" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()))" 2>/dev/null | tr -d ' ' || echo "N/A")
    log "Tamanho do banco: $db_size"
}

# Função para verificar replicação (se aplicável)
check_replication() {
    local db_url=$(supabase status | grep 'DB URL' | awk '{print $3}')
    local replication_lag=$(psql "$db_url" -t -c "SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())), 0)" 2>/dev/null | tr -d ' ' || echo "N/A")
    
    if [ "$replication_lag" != "N/A" ] && [ "$(echo "$replication_lag > 10" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warning "Lag de replicação: ${replication_lag}s"
    else
        log_success "Replicação em dia"
    fi
}

# Função principal de monitoramento
monitor_cycle() {
    log "🔍 Iniciando ciclo de monitoramento..."
    
    if check_connectivity; then
        check_performance
        check_database_size
        check_replication
    fi
    
    log "📊 Ciclo de monitoramento concluído"
    echo "" | tee -a "$HEALTH_LOG"
}

# Trap para limpeza ao sair
cleanup() {
    log "🛑 Monitoramento interrompido"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Início do monitoramento
log "🤖 Iniciando monitoramento contínuo da saúde do Supabase"
log "📊 Intervalo: ${INTERVAL}s"
log "📋 Log: $HEALTH_LOG"
log "🛑 Pressione Ctrl+C para parar"
echo ""

# Loop principal
while true; do
    monitor_cycle
    sleep "$INTERVAL"
done