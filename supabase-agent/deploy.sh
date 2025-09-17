#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DRY_RUN="${DRY_RUN:-false}"
REPORTS_DIR="reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Criar diretório de relatórios
mkdir -p "$REPORTS_DIR"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { log_error "Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { log_error "PROJECT_REF não definido"; exit 1; }

log "🤖 Agente Supabase Deploy - $ENVIRONMENT"

# 1. Verificar CLI e token
supabase --version
supabase whoami

# 2. Vincular projeto
supabase link --project-ref "$PROJECT_REF"

# 3. Verificar status
supabase status

# 4. Verificar diferenças
echo "🔍 Verificando diff..."
supabase db diff --linked || echo "⚠️ Diferenças detectadas"

# 5. Aplicar migrações
echo "📋 Migrações:"
supabase migration list --linked

if [ "$DRY_RUN" = "false" ]; then
    echo "🔄 Aplicando migrações..."
    supabase db push --linked
    
    # Atualizar local após push
    supabase db pull --linked
fi

# 6. Gerar tipos
echo "📄 Gerando tipos..."
mkdir -p src
supabase gen types typescript --linked > src/database.types.ts

# 7. Testes e validações
log "🧪 Executando testes..."
supabase db lint --linked 2>&1 | tee "$REPORTS_DIR/lint_$TIMESTAMP.log"
supabase test db --linked 2>&1 | tee "$REPORTS_DIR/test_$TIMESTAMP.log"

# 8. Monitoramento de performance
log "📊 Coletando métricas de performance..."
supabase inspect db outliers --linked > "$REPORTS_DIR/outliers_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar outliers"
supabase inspect db bloat --linked > "$REPORTS_DIR/bloat_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar bloat"
supabase inspect db vacuum-stats --linked > "$REPORTS_DIR/vacuum_$TIMESTAMP.txt" 2>/dev/null || log_warning "Não foi possível coletar vacuum stats"

# 9. Aplicar seeds se especificado
if [ -d "seed/$ENVIRONMENT" ] && [ "$DRY_RUN" = "false" ]; then
    log "🌱 Aplicando seeds para $ENVIRONMENT..."
    for seed_file in seed/$ENVIRONMENT/*.sql; do
        if [ -f "$seed_file" ]; then
            log "Executando seed: $(basename "$seed_file")"
            supabase db reset --linked --seed-file "$seed_file" || log_warning "Falha ao aplicar seed: $seed_file"
        fi
    done
fi

# 10. Resumo final
log_success "Deploy concluído com sucesso!"
log "📋 Relatórios salvos em: $REPORTS_DIR/"
log "📄 Tipos TypeScript atualizados em: src/database.types.ts"

if [ "$DRY_RUN" = "true" ]; then
    log_warning "Modo DRY_RUN ativo - nenhuma alteração foi aplicada"
fi
