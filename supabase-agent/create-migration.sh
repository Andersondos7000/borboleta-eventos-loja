#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

# Verificar se foi fornecido um nome para a migração
if [ $# -eq 0 ]; then
    echo "❌ Nome da migração não fornecido"
    echo "Uso: ./create-migration.sh nome_da_migracao"
    exit 1
fi

# Nome da migração
MIGRATION_NAME="$1"

# Vincular projeto
echo "🔗 Vinculando projeto..."
supabase link --project-ref "$PROJECT_REF"

# Verificar status
echo "📊 Verificando status..."
supabase status

# Criar migração
echo "📝 Criando migração: $MIGRATION_NAME"
supabase migration new "$MIGRATION_NAME"

# Obter caminho da migração criada
MIGRATION_DIR="$(find ./supabase/migrations -type d -name "*_$MIGRATION_NAME" | sort -r | head -n 1)"

if [ -z "$MIGRATION_DIR" ]; then
    echo "❌ Não foi possível encontrar o diretório da migração criada"
    exit 1
fi

MIGRATION_FILE="$MIGRATION_DIR/migration.sql"

echo "✅ Migração criada em: $MIGRATION_FILE"

# Abrir o arquivo para edição
echo "📝 Edite o arquivo de migração com seu editor preferido:"
echo "$MIGRATION_FILE"

# Instruções para aplicar a migração
echo ""
echo "🔄 Após editar a migração, aplique-a com:"
echo "./supabase-cli.sh push"

echo ""
echo "📋 Para verificar o status das migrações:"
echo "./supabase-cli.sh migrations"