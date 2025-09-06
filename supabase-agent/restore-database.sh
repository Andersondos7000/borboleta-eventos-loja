#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
BACKUP_FILE="${BACKUP_FILE:-}"
RESTORE_TYPE="${RESTORE_TYPE:-full}"  # Opções: schema, data, full
DRY_RUN="${DRY_RUN:-true}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }
[ -z "$BACKUP_FILE" ] && { echo "❌ BACKUP_FILE não definido"; exit 1; }

# Verificar se o arquivo de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restauração do Banco de Dados Supabase"
echo "Projeto: $PROJECT_REF"
echo "Arquivo de backup: $BACKUP_FILE"
echo "Tipo de restauração: $RESTORE_TYPE"
echo "Modo: ${DRY_RUN/true/Simulação}${DRY_RUN/false/Execução}"

# Verificar se o arquivo está comprimido
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "🔄 Descomprimindo arquivo de backup..."
    TEMP_FILE="/tmp/supabase_restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    BACKUP_FILE="$TEMP_FILE"
    echo "✅ Arquivo descomprimido: $BACKUP_FILE"
fi

# Vincular projeto
echo "🔗 Vinculando ao projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

# Verificar status
echo "📊 Verificando status do projeto..."
supabase status

# Obter URL do banco de dados
DB_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')

# Verificar se a URL do banco foi obtida
if [ -z "$DB_URL" ]; then
    echo "❌ Não foi possível obter a URL do banco de dados"
    exit 1
fi

# Criar backup de segurança antes da restauração
if [ "$DRY_RUN" = "false" ]; then
    echo "🔄 Criando backup de segurança antes da restauração..."
    SAFETY_BACKUP_DIR="/tmp/supabase_safety_backup_$(date +%s)"
    mkdir -p "$SAFETY_BACKUP_DIR"
    
    SAFETY_BACKUP_FILE="${SAFETY_BACKUP_DIR}/pre_restore_backup.sql"
    pg_dump "$DB_URL" --no-owner --no-acl > "$SAFETY_BACKUP_FILE"
    
    if [ -f "$SAFETY_BACKUP_FILE" ]; then
        echo "✅ Backup de segurança criado: $SAFETY_BACKUP_FILE"
    else
        echo "❌ Falha ao criar backup de segurança"
        echo "⚠️ Abortando restauração por segurança"
        exit 1
    fi
fi

# Função para executar SQL com ou sem dry run
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    echo "🔍 $description"
    
    if [ "$DRY_RUN" = "true" ]; then
        echo "SQL que seria executado (primeiras 10 linhas):"
        head -n 10 "$sql_file"
        echo "..."
        echo "Total de linhas: $(wc -l < "$sql_file")"
    else
        echo "Executando SQL..."
        psql "$DB_URL" -f "$sql_file"
        echo "✅ SQL executado com sucesso"
    fi
}

# Filtrar arquivo de backup conforme o tipo de restauração
if [ "$RESTORE_TYPE" = "schema" ] || [ "$RESTORE_TYPE" = "full" ]; then
    # Extrair apenas comandos de schema
    SCHEMA_FILE="/tmp/supabase_restore_schema_$(date +%s).sql"
    grep -E "CREATE |ALTER |DROP |COMMENT |SET |CREATE OR REPLACE FUNCTION|CREATE TRIGGER" "$BACKUP_FILE" > "$SCHEMA_FILE" || true
    
    # Verificar se há conteúdo no arquivo de schema
    if [ -s "$SCHEMA_FILE" ]; then
        execute_sql "$SCHEMA_FILE" "Restaurando schema"
    else
        echo "⚠️ Nenhum comando de schema encontrado no arquivo de backup"
    fi
fi

if [ "$RESTORE_TYPE" = "data" ] || [ "$RESTORE_TYPE" = "full" ]; then
    # Extrair apenas comandos de dados
    DATA_FILE="/tmp/supabase_restore_data_$(date +%s).sql"
    grep -E "INSERT INTO|COPY |UPDATE " "$BACKUP_FILE" > "$DATA_FILE" || true
    
    # Verificar se há conteúdo no arquivo de dados
    if [ -s "$DATA_FILE" ]; then
        execute_sql "$DATA_FILE" "Restaurando dados"
    else
        echo "⚠️ Nenhum comando de dados encontrado no arquivo de backup"
    fi
fi

# Limpar arquivos temporários
if [[ "$BACKUP_FILE" == /tmp/* ]]; then
    echo "🔄 Limpando arquivos temporários..."
    rm -f "$BACKUP_FILE"
    [ -f "$SCHEMA_FILE" ] && rm -f "$SCHEMA_FILE"
    [ -f "$DATA_FILE" ] && rm -f "$DATA_FILE"
    echo "✅ Arquivos temporários removidos"
fi

# Verificar integridade após restauração
if [ "$DRY_RUN" = "false" ]; then
    echo "🔍 Verificando integridade após restauração..."
    
    # Verificar constraints
    INVALID_CONSTRAINTS=$(psql "$DB_URL" -t -c "
        SELECT
            conrelid::regclass AS table_name,
            conname AS constraint_name,
            contype AS constraint_type
        FROM
            pg_constraint
        WHERE
            NOT pg_catalog.pg_constraint_is_valid(oid)
            AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY
            conrelid::regclass::text;
    ")
    
    if [ -n "$INVALID_CONSTRAINTS" ]; then
        echo "⚠️ Constraints inválidas encontradas após restauração:"
        echo "$INVALID_CONSTRAINTS"
    else
        echo "✅ Todas as constraints estão válidas"
    fi
    
    # Verificar tabelas
    TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'" | tr -d ' ')
    echo "📊 $TABLE_COUNT tabelas encontradas no banco de dados"
    
    # Verificar funções
    FUNCTION_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'" | tr -d ' ')
    echo "📊 $FUNCTION_COUNT funções encontradas no banco de dados"
fi

echo "✅ Processo de restauração concluído"

if [ "$DRY_RUN" = "true" ]; then
    echo "ℹ️ Esta foi apenas uma simulação. Para executar a restauração, defina DRY_RUN=false"
else
    echo "ℹ️ Backup de segurança disponível em: $SAFETY_BACKUP_FILE"
fi