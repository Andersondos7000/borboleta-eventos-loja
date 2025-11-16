#!/bin/bash

# =============================================================================
# Script de Monitoramento - Agente de Reconciliação
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
PM2_APP_NAME="reconciliation-agent"
PROJECT_DIR="/opt/querenhapuque"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
MAX_EXECUTION_GAP=600000  # 10 minutos em ms
MAX_ERROR_RATE=10         # 10%
MIN_SUCCESS_RATE=85       # 85%

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Enviar alerta
send_alert() {
    local message="$1"
    local severity="${2:-warning}"
    
    log "Enviando alerta: $message"
    
    if [ -n "$ALERT_WEBHOOK_URL" ]; then
        curl -X POST "$ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"🚨 Agente de Reconciliação - $severity\",
                \"attachments\": [{
                    \"color\": \"$([ "$severity" = "error" ] && echo "danger" || echo "warning")\",
                    \"text\": \"$message\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null 2>&1
    fi
}

# Verificar se PM2 está rodando
check_pm2_status() {
    log "Verificando status do PM2..."
    
    if ! command -v pm2 >/dev/null 2>&1; then
        error "PM2 não está instalado"
        send_alert "PM2 não está instalado no servidor" "error"
        return 1
    fi
    
    if ! pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
        error "Processo $PM2_APP_NAME não encontrado no PM2"
        send_alert "Processo $PM2_APP_NAME não está registrado no PM2" "error"
        return 1
    fi
    
    local status=$(pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .pm2_env.status")
    
    if [ "$status" != "online" ]; then
        error "Processo $PM2_APP_NAME está $status"
        send_alert "Processo $PM2_APP_NAME está com status: $status" "error"
        return 1
    fi
    
    success "PM2 está rodando corretamente"
    return 0
}

# Verificar logs por erros recentes
check_recent_errors() {
    log "Verificando erros recentes..."
    
    local error_count=$(pm2 logs "$PM2_APP_NAME" --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|failed" | wc -l)
    
    if [ "$error_count" -gt 5 ]; then
        warning "Muitos erros encontrados nos logs recentes ($error_count)"
        send_alert "Encontrados $error_count erros nos logs recentes" "warning"
        return 1
    fi
    
    success "Nenhum erro crítico encontrado nos logs"
    return 0
}

# Verificar métricas do banco
check_database_metrics() {
    log "Verificando métricas do banco de dados..."
    
    cd "$PROJECT_DIR"
    
    # Executar query para verificar última execução
    local metrics=$(npm run reconciliation:test metrics 2>/dev/null | tail -n 1)
    
    if [ -z "$metrics" ]; then
        warning "Não foi possível obter métricas do banco"
        return 1
    fi
    
    # Verificar se há execuções recentes (últimos 10 minutos)
    local last_execution=$(echo "$metrics" | jq -r '.timestamp // empty')
    
    if [ -n "$last_execution" ]; then
        local last_execution_ms=$(date -d "$last_execution" +%s)000
        local current_ms=$(date +%s)000
        local gap=$((current_ms - last_execution_ms))
        
        if [ "$gap" -gt "$MAX_EXECUTION_GAP" ]; then
            warning "Última execução foi há $(($gap / 60000)) minutos"
            send_alert "Agente não executa há $(($gap / 60000)) minutos" "warning"
            return 1
        fi
    fi
    
    # Verificar taxa de erro
    local error_rate=$(echo "$metrics" | jq -r '.error_rate // 0')
    if (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l) )); then
        warning "Taxa de erro alta: ${error_rate}%"
        send_alert "Taxa de erro alta: ${error_rate}%" "warning"
        return 1
    fi
    
    # Verificar taxa de sucesso da API
    local api_success_rate=$(echo "$metrics" | jq -r '.api_success_rate // 100')
    if (( $(echo "$api_success_rate < $MIN_SUCCESS_RATE" | bc -l) )); then
        warning "Taxa de sucesso da API baixa: ${api_success_rate}%"
        send_alert "Taxa de sucesso da API baixa: ${api_success_rate}%" "warning"
        return 1
    fi
    
    success "Métricas do banco estão normais"
    return 0
}

# Verificar uso de memória
check_memory_usage() {
    log "Verificando uso de memória..."
    
    local memory_usage=$(pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .monit.memory")
    local memory_mb=$((memory_usage / 1024 / 1024))
    
    if [ "$memory_mb" -gt 512 ]; then
        warning "Uso de memória alto: ${memory_mb}MB"
        send_alert "Uso de memória alto: ${memory_mb}MB" "warning"
        return 1
    fi
    
    success "Uso de memória normal: ${memory_mb}MB"
    return 0
}

# Verificar conectividade externa
check_external_connectivity() {
    log "Verificando conectividade externa..."
    
    cd "$PROJECT_DIR"
    
    if ! npm run reconciliation:test connectivity >/dev/null 2>&1; then
        error "Falha na conectividade com serviços externos"
        send_alert "Falha na conectividade com Supabase ou AbacatePay" "error"
        return 1
    fi
    
    success "Conectividade externa OK"
    return 0
}

# Verificar locks órfãos
check_orphaned_locks() {
    log "Verificando locks órfãos..."
    
    cd "$PROJECT_DIR"
    
    local orphaned_locks=$(npm run reconciliation:test cleanup 2>/dev/null | grep -o "Removed [0-9]* expired locks" | grep -o "[0-9]*" || echo "0")
    
    if [ "$orphaned_locks" -gt 0 ]; then
        warning "Encontrados $orphaned_locks locks órfãos (removidos automaticamente)"
        send_alert "Encontrados e removidos $orphaned_locks locks órfãos" "warning"
    fi
    
    success "Nenhum lock órfão encontrado"
    return 0
}

# Gerar relatório de saúde
generate_health_report() {
    log "Gerando relatório de saúde..."
    
    local report_file="/tmp/reconciliation-health-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "checks": {
        "pm2_status": $(check_pm2_status >/dev/null 2>&1 && echo "true" || echo "false"),
        "recent_errors": $(check_recent_errors >/dev/null 2>&1 && echo "false" || echo "true"),
        "database_metrics": $(check_database_metrics >/dev/null 2>&1 && echo "true" || echo "false"),
        "memory_usage": $(check_memory_usage >/dev/null 2>&1 && echo "true" || echo "false"),
        "external_connectivity": $(check_external_connectivity >/dev/null 2>&1 && echo "true" || echo "false"),
        "orphaned_locks": $(check_orphaned_locks >/dev/null 2>&1 && echo "true" || echo "false")
    },
    "process_info": $(pm2 jlist | jq ".[] | select(.name==\"$PM2_APP_NAME\")" 2>/dev/null || echo "null")
}
EOF
    
    log "Relatório salvo em: $report_file"
    cat "$report_file"
}

# Função principal de monitoramento
main() {
    log "=== Iniciando Monitoramento do Agente de Reconciliação ==="
    
    local failed_checks=0
    
    check_pm2_status || ((failed_checks++))
    check_recent_errors || ((failed_checks++))
    check_database_metrics || ((failed_checks++))
    check_memory_usage || ((failed_checks++))
    check_external_connectivity || ((failed_checks++))
    check_orphaned_locks || ((failed_checks++))
    
    if [ "$failed_checks" -eq 0 ]; then
        success "=== Todos os checks passaram! Agente está saudável ==="
        return 0
    else
        error "=== $failed_checks checks falharam ==="
        return 1
    fi
}

# Função de restart automático
auto_restart() {
    log "=== Tentando restart automático ==="
    
    if pm2 restart "$PM2_APP_NAME"; then
        success "Restart realizado com sucesso"
        sleep 30  # Aguardar estabilização
        
        if check_pm2_status >/dev/null 2>&1; then
            success "Serviço está funcionando após restart"
            send_alert "Agente reiniciado automaticamente e está funcionando" "info"
        else
            error "Serviço ainda não está funcionando após restart"
            send_alert "Falha no restart automático do agente" "error"
        fi
    else
        error "Falha no restart automático"
        send_alert "Falha no restart automático do agente" "error"
    fi
}

# Verificar argumentos
case "${1:-check}" in
    "check")
        main
        ;;
    "report")
        generate_health_report
        ;;
    "restart")
        auto_restart
        ;;
    "watch")
        log "Iniciando monitoramento contínuo (Ctrl+C para parar)..."
        while true; do
            if ! main >/dev/null 2>&1; then
                warning "Problemas detectados, tentando restart automático..."
                auto_restart
            fi
            sleep 300  # Verificar a cada 5 minutos
        done
        ;;
    *)
        echo "Uso: $0 [check|report|restart|watch]"
        echo "  check   - Verificar saúde uma vez (padrão)"
        echo "  report  - Gerar relatório detalhado"
        echo "  restart - Tentar restart automático"
        echo "  watch   - Monitoramento contínuo"
        exit 1
        ;;
esac