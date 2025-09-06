#!/bin/bash
set -euo pipefail

# Configuração
SOURCE_PROJECT_REF="${SOURCE_PROJECT_REF:-}"
TARGET_PROJECT_REF="${TARGET_PROJECT_REF:-}"
TABLES="${TABLES:-}"
DRY_RUN="${DRY_RUN:-true}"
BATCH_SIZE="${BATCH_SIZE:-1000}"
TEMP_DIR="/tmp/supabase_migration_$(date +%s)"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$SOURCE_PROJECT_REF" ] && { echo "❌ SOURCE_PROJECT_REF não definido"; exit 1; }
[ -z "$TARGET_PROJECT_REF" ] && { echo "❌ TARGET_PROJECT_REF não definido"; exit 1; }

echo "🔄 Migração de Dados entre Projetos Supabase"
echo "Origem: $SOURCE_PROJECT_REF"
echo "Destino: $TARGET_PROJECT_REF"
echo "Modo: ${DRY_RUN/true/Simulação}${DRY_RUN/false/Execução}"

# Criar diretório temporário
mkdir -p "$TEMP_DIR"

# Função para vincular projeto e obter URL do banco
get_db_url() {
    local project_ref="$1"
    local description="$2"
    
    echo "🔗 Vinculando ao projeto $description ($project_ref)..."
    supabase link --project-ref "$project_ref"
    
    echo "📊 Verificando status do projeto $description..."
    supabase status
    
    local db_url=$(supabase status | grep 'DB URL' | awk '{print $3}')
    
    if [ -z "$db_url" ]; then
        echo "❌ Não foi possível obter a URL do banco de dados $description"
        exit 1
    fi
    
    echo "$db_url"
}

# Obter URLs dos bancos de dados
SOURCE_DB_URL=$(get_db_url "$SOURCE_PROJECT_REF" "origem")
TARGET_DB_URL=$(get_db_url "$TARGET_PROJECT_REF" "destino")

# Função para listar tabelas
list_tables() {
    local db_url="$1"
    
    psql "$db_url" -t -c "
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
    " | grep -v "^$" | sed 's/ //g'
}

# Determinar tabelas a migrar
if [ -z "$TABLES" ]; then
    echo "🔍 Nenhuma tabela específica fornecida, detectando tabelas automaticamente..."
    TABLES_TO_MIGRATE=$(list_tables "$SOURCE_DB_URL")
    
    # Converter para array
    readarray -t TABLE_ARRAY <<< "$TABLES_TO_MIGRATE"
    
    echo "📋 Tabelas detectadas: ${#TABLE_ARRAY[@]}"
    echo "${TABLE_ARRAY[@]}"
else
    # Converter string de tabelas para array
    IFS=',' read -ra TABLE_ARRAY <<< "$TABLES"
    
    echo "📋 Tabelas especificadas: ${#TABLE_ARRAY[@]}"
    echo "${TABLE_ARRAY[@]}"
fi

# Verificar se as tabelas existem no destino
echo "🔍 Verificando se as tabelas existem no destino..."
TARGET_TABLES=$(list_tables "$TARGET_DB_URL")

for table in "${TABLE_ARRAY[@]}"; do
    if ! echo "$TARGET_TABLES" | grep -q "^$table$"; then
        echo "⚠️ Tabela '$table' não existe no destino. Criando schema..."
        
        # Extrair schema da tabela de origem
        SCHEMA_FILE="$TEMP_DIR/${table}_schema.sql"
        pg_dump "$SOURCE_DB_URL" --schema-only --no-owner --no-acl --table="public.$table" > "$SCHEMA_FILE"
        
        if [ "$DRY_RUN" = "false" ]; then
            echo "🔄 Criando tabela '$table' no destino..."
            psql "$TARGET_DB_URL" -f "$SCHEMA_FILE"
        else
            echo "🔍 [DRY RUN] Seria criada a tabela '$table' no destino"
        fi
    fi
done

# Migrar dados tabela por tabela
for table in "${TABLE_ARRAY[@]}"; do
    echo "\n🔄 Processando tabela: $table"
    
    # Contar registros na origem
    SOURCE_COUNT=$(psql "$SOURCE_DB_URL" -t -c "SELECT COUNT(*) FROM public.$table;" | tr -d ' ')
    echo "📊 Registros na origem: $SOURCE_COUNT"
    
    # Contar registros no destino
    TARGET_COUNT=$(psql "$TARGET_DB_URL" -t -c "SELECT COUNT(*) FROM public.$table;" | tr -d ' ')
    echo "📊 Registros no destino: $TARGET_COUNT"
    
    # Verificar se há registros para migrar
    if [ "$SOURCE_COUNT" -eq 0 ]; then
        echo "ℹ️ Tabela '$table' vazia na origem, pulando..."
        continue
    fi
    
    # Verificar se o destino já tem todos os registros
    if [ "$SOURCE_COUNT" -eq "$TARGET_COUNT" ]; then
        echo "ℹ️ Tabela '$table' já tem o mesmo número de registros no destino, verificando dados..."
        
        # Verificar se os dados são idênticos (usando MD5 de uma amostra)
        SOURCE_SAMPLE_MD5=$(psql "$SOURCE_DB_URL" -t -c "SELECT MD5(CAST((SELECT * FROM public.$table ORDER BY 1 LIMIT 10) AS TEXT));" | tr -d ' ')
        TARGET_SAMPLE_MD5=$(psql "$TARGET_DB_URL" -t -c "SELECT MD5(CAST((SELECT * FROM public.$table ORDER BY 1 LIMIT 10) AS TEXT));" | tr -d ' ')
        
        if [ "$SOURCE_SAMPLE_MD5" = "$TARGET_SAMPLE_MD5" ]; then
            echo "✅ Amostra de dados idêntica, pulando tabela '$table'"
            continue
        else
            echo "⚠️ Dados diferentes detectados na tabela '$table'"
        fi
    fi
    
    # Obter colunas da tabela
    COLUMNS=$(psql "$SOURCE_DB_URL" -t -c "
        SELECT string_agg(column_name, ',') 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '$table';
    " | tr -d ' ')
    
    # Calcular número de batches
    TOTAL_BATCHES=$(( (SOURCE_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))
    echo "📦 Processando em $TOTAL_BATCHES batches de $BATCH_SIZE registros"
    
    # Processar em batches
    for ((i=0; i<TOTAL_BATCHES; i++)); do
        OFFSET=$((i * BATCH_SIZE))
        echo "🔄 Processando batch $((i+1))/$TOTAL_BATCHES (offset $OFFSET)"
        
        # Arquivo para este batch
        BATCH_FILE="$TEMP_DIR/${table}_batch_${i}.sql"
        
        # Extrair dados deste batch
        pg_dump "$SOURCE_DB_URL" --data-only --no-owner --no-acl --table="public.$table" \
               --column-inserts --rows-per-insert=100 \
               --where="true LIMIT $BATCH_SIZE OFFSET $OFFSET" > "$BATCH_FILE"
        
        # Verificar se o arquivo tem conteúdo
        if [ ! -s "$BATCH_FILE" ]; then
            echo "ℹ️ Batch vazio, pulando..."
            continue
        fi
        
        # Contar instruções INSERT
        INSERT_COUNT=$(grep -c "INSERT INTO" "$BATCH_FILE" || echo 0)
        echo "📊 $INSERT_COUNT instruções INSERT neste batch"
        
        if [ "$DRY_RUN" = "false" ]; then
            echo "🔄 Inserindo dados no destino..."
            
            # Adicionar ON CONFLICT DO NOTHING para evitar erros de duplicação
            sed -i 's/INSERT INTO/INSERT INTO public/' "$BATCH_FILE"
            sed -i 's/);/) ON CONFLICT DO NOTHING;/' "$BATCH_FILE"
            
            # Executar no destino
            psql "$TARGET_DB_URL" -f "$BATCH_FILE"
            
            # Verificar quantos registros foram inseridos
            NEW_TARGET_COUNT=$(psql "$TARGET_DB_URL" -t -c "SELECT COUNT(*) FROM public.$table;" | tr -d ' ')
            INSERTED=$((NEW_TARGET_COUNT - TARGET_COUNT))
            TARGET_COUNT=$NEW_TARGET_COUNT
            
            echo "✅ $INSERTED registros inseridos neste batch"
        else
            echo "🔍 [DRY RUN] Seriam inseridos aproximadamente $INSERT_COUNT registros"
        fi
    done
    
    echo "✅ Processamento da tabela '$table' concluído"
done

# Limpar arquivos temporários
echo "🔄 Limpando arquivos temporários..."
rm -rf "$TEMP_DIR"

echo "\n✅ Processo de migração concluído"

if [ "$DRY_RUN" = "true" ]; then
    echo "ℹ️ Esta foi apenas uma simulação. Para executar a migração, defina DRY_RUN=false"
fi