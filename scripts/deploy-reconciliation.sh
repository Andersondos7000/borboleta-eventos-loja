#!/bin/bash

# =============================================================================
# Script de Deploy - Agente de Reconciliação
# =============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_DIR="/opt/querenhapuque"
BACKUP_DIR="/opt/backups/querenhapuque"
LOG_FILE="/var/log/reconciliation-deploy.log"
PM2_APP_NAME="reconciliation-agent"

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar se está rodando como root ou com sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root ou com sudo"
    fi
}

# Verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    command -v node >/dev/null 2>&1 || error "Node.js não está instalado"
    command -v npm >/dev/null 2>&1 || error "npm não está instalado"
    command -v pm2 >/dev/null 2>&1 || error "PM2 não está instalado"
    command -v git >/dev/null 2>&1 || error "Git não está instalado"
    
    success "Todas as dependências estão instaladas"
}

# Criar backup
create_backup() {
    log "Criando backup..."
    
    BACKUP_NAME="querenhapuque-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$PROJECT_DIR" ]; then
        cp -r "$PROJECT_DIR" "$BACKUP_PATH"
        success "Backup criado em: $BACKUP_PATH"
    else
        warning "Diretório do projeto não existe, pulando backup"
    fi
}

# Parar serviços
stop_services() {
    log "Parando serviços..."
    
    if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
        pm2 stop "$PM2_APP_NAME"
        success "Serviço $PM2_APP_NAME parado"
    else
        warning "Serviço $PM2_APP_NAME não está rodando"
    fi
}

# Atualizar código
update_code() {
    log "Atualizando código..."
    
    cd "$PROJECT_DIR"
    
    # Fazer backup do .env se existir
    if [ -f ".env" ]; then
        cp .env .env.backup
        log "Backup do .env criado"
    fi
    
    # Atualizar código
    git fetch origin
    git reset --hard origin/main
    
    # Restaurar .env se existir backup
    if [ -f ".env.backup" ]; then
        mv .env.backup .env
        log ".env restaurado"
    fi
    
    success "Código atualizado"
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    
    cd "$PROJECT_DIR"
    npm ci --production
    
    success "Dependências instaladas"
}

# Verificar configuração
verify_config() {
    log "Verificando configuração..."
    
    cd "$PROJECT_DIR"
    
    if [ ! -f ".env" ]; then
        error "Arquivo .env não encontrado. Copie .env.production.example para .env e configure"
    fi
    
    # Testar configuração
    npm run reconciliation:test || error "Teste de configuração falhou"
    
    success "Configuração verificada"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços..."
    
    cd "$PROJECT_DIR"
    
    # Criar diretório de logs se não existir
    mkdir -p logs
    
    # Iniciar com PM2
    if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
        pm2 restart "$PM2_APP_NAME"
    else
        pm2 start ecosystem.config.js --env production
    fi
    
    # Salvar configuração PM2
    pm2 save
    
    success "Serviços iniciados"
}

# Verificar saúde do serviço
health_check() {
    log "Verificando saúde do serviço..."
    
    sleep 10  # Aguardar inicialização
    
    # Verificar se o processo está rodando
    if ! pm2 describe "$PM2_APP_NAME" | grep -q "online"; then
        error "Serviço não está online"
    fi
    
    # Verificar logs por erros
    if pm2 logs "$PM2_APP_NAME" --lines 20 | grep -i "error\|failed\|exception"; then
        warning "Erros encontrados nos logs, verifique manualmente"
    fi
    
    success "Serviço está saudável"
}

# Limpeza pós-deploy
cleanup() {
    log "Executando limpeza..."
    
    # Manter apenas os 5 backups mais recentes
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        log "Backups antigos removidos"
    fi
    
    success "Limpeza concluída"
}

# Função principal
main() {
    log "=== Iniciando Deploy do Agente de Reconciliação ==="
    
    check_permissions
    check_dependencies
    create_backup
    stop_services
    update_code
    install_dependencies
    verify_config
    start_services
    health_check
    cleanup
    
    success "=== Deploy concluído com sucesso! ==="
    log "Logs do serviço: pm2 logs $PM2_APP_NAME"
    log "Status do serviço: pm2 status"
    log "Monitoramento: pm2 monit"
}

# Função de rollback
rollback() {
    log "=== Iniciando Rollback ==="
    
    # Encontrar backup mais recente
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "Nenhum backup encontrado para rollback"
    fi
    
    log "Fazendo rollback para: $LATEST_BACKUP"
    
    # Parar serviços
    pm2 stop "$PM2_APP_NAME" || true
    
    # Restaurar backup
    rm -rf "$PROJECT_DIR"
    cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$PROJECT_DIR"
    
    # Reiniciar serviços
    cd "$PROJECT_DIR"
    pm2 start "$PM2_APP_NAME"
    
    success "=== Rollback concluído ==="
}

# Verificar argumentos
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Uso: $0 [deploy|rollback|health]"
        echo "  deploy  - Fazer deploy (padrão)"
        echo "  rollback - Fazer rollback para versão anterior"
        echo "  health  - Verificar saúde do serviço"
        exit 1
        ;;
esac