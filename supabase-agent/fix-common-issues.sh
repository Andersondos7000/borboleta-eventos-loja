#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
DRY_RUN="${DRY_RUN:-true}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🔧 Verificando e Corrigindo Problemas Comuns"
echo "Modo: ${DRY_RUN/true/Simulação}${DRY_RUN/false/Execução}"

# Vincular projeto
supabase link --project-ref "$PROJECT_REF"

# Verificar status
supabase status

# Obter URL do banco de dados
DB_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')

# Função para executar SQL
execute_sql() {
    local description="$1"
    local sql="$2"
    
    echo "🔍 $description"
    
    if [ "$DRY_RUN" = "true" ]; then
        echo "SQL que seria executado:"
        echo "$sql"
    else
        echo "Executando SQL:"
        echo "$sql"
        psql "$DB_URL" -c "$sql"
    fi
    
    echo ""
}

# 1. Verificar e corrigir índices duplicados
echo "🔍 Verificando índices duplicados..."
DUPLICATE_INDEXES=$(psql "$DB_URL" -t -c "
    SELECT
        indrelid::regclass AS table_name,
        array_agg(indexrelid::regclass) AS indexes,
        array_agg(indexrelid::regclass::text) AS index_names
    FROM (
        SELECT
            indrelid,
            indexrelid,
            indkey,
            indpred,
            indexprs,
            indisunique
        FROM
            pg_index
    ) sub
    JOIN pg_class c ON sub.indrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE
        n.nspname = 'public'
    GROUP BY
        indrelid,
        indkey,
        indpred,
        indexprs,
        indisunique
    HAVING
        COUNT(*) > 1
    ORDER BY
        indrelid::regclass::text;
")

if [ -n "$DUPLICATE_INDEXES" ]; then
    echo "⚠️ Índices duplicados encontrados:"
    echo "$DUPLICATE_INDEXES"
    
    # Extrair nomes de índices para remoção
    echo "$DUPLICATE_INDEXES" | while read -r line; do
        if [ -n "$line" ]; then
            TABLE=$(echo "$line" | awk '{print $1}')
            INDEXES=$(echo "$line" | sed -E 's/.*\{(.*)\}.*/\1/')
            
            # Manter o primeiro índice, remover os demais
            IFS=',' read -ra INDEX_ARRAY <<< "$INDEXES"
            for ((i=1; i<${#INDEX_ARRAY[@]}; i++)); do
                INDEX_NAME=$(echo "${INDEX_ARRAY[$i]}" | tr -d ' "')
                execute_sql "Removendo índice duplicado $INDEX_NAME da tabela $TABLE" "DROP INDEX IF EXISTS $INDEX_NAME;"
            done
        fi
    done
else
    echo "✅ Nenhum índice duplicado encontrado"
fi

# 2. Verificar e corrigir constraints inválidas
echo "🔍 Verificando constraints inválidas..."
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
    echo "⚠️ Constraints inválidas encontradas:"
    echo "$INVALID_CONSTRAINTS"
    
    echo "$INVALID_CONSTRAINTS" | while read -r line; do
        if [ -n "$line" ]; then
            TABLE=$(echo "$line" | awk '{print $1}')
            CONSTRAINT=$(echo "$line" | awk '{print $2}')
            
            execute_sql "Validando constraint $CONSTRAINT na tabela $TABLE" "ALTER TABLE $TABLE VALIDATE CONSTRAINT $CONSTRAINT;"
        fi
    done
else
    echo "✅ Nenhuma constraint inválida encontrada"
fi

# 3. Verificar e corrigir tabelas sem RLS
echo "🔍 Verificando tabelas críticas sem RLS..."
CRITICAL_TABLES=("profiles" "customers" "orders" "payments" "tickets" "users" "products" "cart_items" "order_items" "events")

for table in "${CRITICAL_TABLES[@]}"; do
    # Verificar se a tabela existe
    TABLE_EXISTS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table'" | tr -d ' ')
    
    if [ "$TABLE_EXISTS" -eq 0 ]; then
        continue
    fi
    
    # Verificar se RLS está ativo
    RLS_ENABLED=$(psql "$DB_URL" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')" | tr -d ' ')
    
    if [ "$RLS_ENABLED" != "t" ]; then
        execute_sql "Ativando RLS na tabela $table" "ALTER TABLE public.$table ENABLE ROW LEVEL SECURITY;"
    fi
    
    # Verificar se há políticas
    POLICY_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_policy WHERE schemaname = 'public' AND tablename = '$table'" | tr -d ' ')
    
    if [ "$POLICY_COUNT" -eq 0 ]; then
        echo "⚠️ A tabela $table não tem políticas RLS definidas"
        echo "Recomendação: Crie políticas RLS adequadas para esta tabela"
        echo ""
    fi
done

# 4. Verificar e corrigir tabelas sem índices em chaves estrangeiras
echo "🔍 Verificando chaves estrangeiras sem índices..."
FK_WITHOUT_INDEX=$(psql "$DB_URL" -t -c "
    SELECT
        c.conrelid::regclass AS table_name,
        a.attname AS column_name,
        c.conname AS foreign_key_name
    FROM
        pg_constraint c
    JOIN
        pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    LEFT JOIN
        pg_index i ON
            i.indrelid = c.conrelid AND
            (a.attnum = ANY(i.indkey) AND array_position(i.indkey, a.attnum) = 0)
    WHERE
        c.contype = 'f' AND
        i.indexrelid IS NULL AND
        c.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY
        c.conrelid::regclass::text, a.attname;
")

if [ -n "$FK_WITHOUT_INDEX" ]; then
    echo "⚠️ Chaves estrangeiras sem índices encontradas:"
    echo "$FK_WITHOUT_INDEX"
    
    echo "$FK_WITHOUT_INDEX" | while read -r line; do
        if [ -n "$line" ]; then
            TABLE=$(echo "$line" | awk '{print $1}')
            COLUMN=$(echo "$line" | awk '{print $2}')
            FK_NAME=$(echo "$line" | awk '{print $3}')
            
            # Criar nome de índice baseado na tabela e coluna
            INDEX_NAME="idx_${TABLE}_${COLUMN}"
            
            execute_sql "Criando índice para chave estrangeira $FK_NAME na tabela $TABLE" "CREATE INDEX IF NOT EXISTS $INDEX_NAME ON $TABLE ($COLUMN);"
        fi
    done
else
    echo "✅ Todas as chaves estrangeiras possuem índices"
fi

# 5. Verificar e corrigir tabelas sem primary key
echo "🔍 Verificando tabelas sem primary key..."
TABLES_WITHOUT_PK=$(psql "$DB_URL" -t -c "
    SELECT
        c.relname AS table_name
    FROM
        pg_class c
    JOIN
        pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN
        pg_constraint con ON con.conrelid = c.oid AND con.contype = 'p'
    WHERE
        c.relkind = 'r' AND
        n.nspname = 'public' AND
        con.oid IS NULL
    ORDER BY
        c.relname;
")

if [ -n "$TABLES_WITHOUT_PK" ]; then
    echo "⚠️ Tabelas sem primary key encontradas:"
    echo "$TABLES_WITHOUT_PK"
    echo "Recomendação: Adicione primary keys a estas tabelas"
else
    echo "✅ Todas as tabelas possuem primary key"
fi

# 6. Verificar e corrigir tabelas sem updated_at
echo "🔍 Verificando tabelas sem coluna updated_at..."
TABLES_WITHOUT_UPDATED_AT=$(psql "$DB_URL" -t -c "
    SELECT
        c.relname AS table_name
    FROM
        pg_class c
    JOIN
        pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN
        pg_attribute a ON a.attrelid = c.oid AND a.attname = 'updated_at'
    WHERE
        c.relkind = 'r' AND
        n.nspname = 'public' AND
        a.attname IS NULL
    ORDER BY
        c.relname;
")

if [ -n "$TABLES_WITHOUT_UPDATED_AT" ]; then
    echo "⚠️ Tabelas sem coluna updated_at encontradas:"
    echo "$TABLES_WITHOUT_UPDATED_AT"
    
    echo "$TABLES_WITHOUT_UPDATED_AT" | while read -r table; do
        if [ -n "$table" ]; then
            # Verificar se a tabela tem created_at (indicativo de que deveria ter updated_at também)
            HAS_CREATED_AT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_attribute a JOIN pg_class c ON a.attrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = '$table' AND a.attname = 'created_at'" | tr -d ' ')
            
            if [ "$HAS_CREATED_AT" -eq 1 ]; then
                execute_sql "Adicionando coluna updated_at à tabela $table" "
                    ALTER TABLE $table ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
                    UPDATE $table SET updated_at = COALESCE(created_at, NOW());
                    ALTER TABLE $table ALTER COLUMN updated_at SET DEFAULT NOW();
                "
                
                # Verificar se a função de trigger já existe
                TRIGGER_FUNCTION_EXISTS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'update_updated_at_column'" | tr -d ' ')
                
                if [ "$TRIGGER_FUNCTION_EXISTS" -eq 0 ]; then
                    execute_sql "Criando função de trigger para atualização automática de updated_at" "
                        CREATE OR REPLACE FUNCTION update_updated_at_column()
                        RETURNS TRIGGER AS $$
                        BEGIN
                            NEW.updated_at = NOW();
                            RETURN NEW;
                        END;
                        $$ LANGUAGE plpgsql;
                    "
                fi
                
                # Criar trigger
                execute_sql "Criando trigger para atualização automática de updated_at na tabela $table" "
                    DROP TRIGGER IF EXISTS update_${table}_updated_at ON $table;
                    CREATE TRIGGER update_${table}_updated_at
                    BEFORE UPDATE ON $table
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
                "
            fi
        fi
    done
else
    echo "✅ Todas as tabelas relevantes possuem coluna updated_at"
fi

echo "✅ Verificação e correção de problemas comuns concluída"