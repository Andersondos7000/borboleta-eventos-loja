#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DRY_RUN="${DRY_RUN:-false}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🤖 Agente Supabase Deploy - $ENVIRONMENT"

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

# 7. Testes
echo "🧪 Executando testes..."
supabase db lint --linked
supabase test db --linked

echo "✅ Deploy concluído!"
