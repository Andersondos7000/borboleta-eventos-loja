#!/bin/bash
set -euo pipefail

# Configuração
SOURCE_PROJECT_REF="${SOURCE_PROJECT_REF:-}"
TARGET_PROJECT_REF="${TARGET_PROJECT_REF:-}"
TABLES="${TABLES:-}"
DRY_RUN="${DRY_RUN:-true}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$SOURCE_PROJECT_REF" ] && { echo "❌ SOURCE_PROJECT_REF não definido"; exit 1; }
[ -z "$TARGET_PROJECT_REF" ] && { echo "❌ TARGET_PROJECT_REF não definido"; exit 1; }

echo "🔒 Sincronização de Políticas RLS entre Projetos Supabase"
echo "Origem: $SOURCE_PROJECT_REF"
echo "Destino: $TARGET_PROJECT_REF"
echo "Modo: ${DRY_RUN/true/Simulação}${DRY_RUN/false/Execução}"

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

# Determinar tabelas a sincronizar
if [ -z "$TABLES" ]; then
    echo "🔍 Nenhuma tabela específica fornecida, detectando tabelas automaticamente..."
    TABLES_TO_SYNC=$(list_tables "$SOURCE_DB_URL")
    
    # Converter para array
    readarray -t TABLE_ARRAY <<< "$TABLES_TO_SYNC"
    
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
        echo "⚠️ Tabela '$table' não existe no destino. Pulando..."
        continue
    fi
    
    echo "\n🔒 Processando políticas RLS para tabela: $table"
    
    # Verificar se RLS está ativado na origem
    SOURCE_RLS_ENABLED=$(psql "$SOURCE_DB_URL" -t -c "
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    " | tr -d ' ')
    
    # Verificar se RLS está ativado no destino
    TARGET_RLS_ENABLED=$(psql "$TARGET_DB_URL" -t -c "
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    " | tr -d ' ')
    
    echo "📊 RLS na origem: ${SOURCE_RLS_ENABLED/t/Ativado}${SOURCE_RLS_ENABLED/f/Desativado}"
    echo "📊 RLS no destino: ${TARGET_RLS_ENABLED/t/Ativado}${TARGET_RLS_ENABLED/f/Desativado}"
    
    # Sincronizar estado do RLS
    if [ "$SOURCE_RLS_ENABLED" != "$TARGET_RLS_ENABLED" ]; then
        if [ "$SOURCE_RLS_ENABLED" = "t" ]; then
            echo "🔄 Ativando RLS para tabela '$table' no destino..."
            
            if [ "$DRY_RUN" = "false" ]; then
                psql "$TARGET_DB_URL" -c "ALTER TABLE public.$table ENABLE ROW LEVEL SECURITY;"
                echo "✅ RLS ativado para tabela '$table' no destino"
            else
                echo "🔍 [DRY RUN] Seria ativado RLS para tabela '$table' no destino"
            fi
        else
            echo "🔄 Desativando RLS para tabela '$table' no destino..."
            
            if [ "$DRY_RUN" = "false" ]; then
                psql "$TARGET_DB_URL" -c "ALTER TABLE public.$table DISABLE ROW LEVEL SECURITY;"
                echo "✅ RLS desativado para tabela '$table' no destino"
            else
                echo "🔍 [DRY RUN] Seria desativado RLS para tabela '$table' no destino"
            fi
        fi
    fi
    
    # Se RLS não estiver ativado na origem, pular sincronização de políticas
    if [ "$SOURCE_RLS_ENABLED" != "t" ]; then
        echo "ℹ️ RLS não está ativado na origem para tabela '$table', pulando sincronização de políticas"
        continue
    fi
    
    # Obter políticas da origem
    SOURCE_POLICIES=$(psql "$SOURCE_DB_URL" -t -c "
        SELECT polname, polcmd, polpermissive, polroles::text, pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)
        FROM pg_policy
        WHERE polrelid = 'public.$table'::regclass;
    ")
    
    # Obter políticas do destino
    TARGET_POLICIES=$(psql "$TARGET_DB_URL" -t -c "
        SELECT polname
        FROM pg_policy
        WHERE polrelid = 'public.$table'::regclass;
    " | tr -d ' ')
    
    # Processar cada política da origem
    while IFS='|' read -r polname polcmd polpermissive polroles polqual polwithcheck; do
        # Remover espaços em branco
        polname=$(echo "$polname" | tr -d ' ')
        polcmd=$(echo "$polcmd" | tr -d ' ')
        polpermissive=$(echo "$polpermissive" | tr -d ' ')
        polroles=$(echo "$polroles" | tr -d ' ')
        polqual=$(echo "$polqual" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        polwithcheck=$(echo "$polwithcheck" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Pular linhas vazias
        if [ -z "$polname" ]; then
            continue
        fi
        
        echo "\n📋 Política encontrada na origem: $polname"
        echo "   Comando: $polcmd"
        echo "   Permissiva: ${polpermissive/t/Sim}${polpermissive/f/Não}"
        echo "   Roles: $polroles"
        echo "   Condição USING: $polqual"
        echo "   Condição WITH CHECK: $polwithcheck"
        
        # Verificar se a política existe no destino
        if echo "$TARGET_POLICIES" | grep -q "^$polname$"; then
            echo "🔄 Atualizando política '$polname' no destino..."
            
            if [ "$DRY_RUN" = "false" ]; then
                # Remover política existente
                psql "$TARGET_DB_URL" -c "DROP POLICY IF EXISTS \"$polname\" ON public.$table;"
                
                # Recriar política
                SQL="CREATE POLICY \"$polname\" ON public.$table"
                SQL="$SQL FOR $polcmd"
                SQL="$SQL TO $polroles"
                
                if [ -n "$polqual" ] && [ "$polqual" != "NULL" ]; then
                    SQL="$SQL USING ($polqual)"
                fi
                
                if [ -n "$polwithcheck" ] && [ "$polwithcheck" != "NULL" ]; then
                    SQL="$SQL WITH CHECK ($polwithcheck)"
                fi
                
                SQL="$SQL;"
                
                psql "$TARGET_DB_URL" -c "$SQL"
                echo "✅ Política '$polname' atualizada no destino"
            else
                echo "🔍 [DRY RUN] Seria atualizada a política '$polname' no destino"
            fi
        else
            echo "🔄 Criando política '$polname' no destino..."
            
            if [ "$DRY_RUN" = "false" ]; then
                # Criar política
                SQL="CREATE POLICY \"$polname\" ON public.$table"
                SQL="$SQL FOR $polcmd"
                SQL="$SQL TO $polroles"
                
                if [ -n "$polqual" ] && [ "$polqual" != "NULL" ]; then
                    SQL="$SQL USING ($polqual)"
                fi
                
                if [ -n "$polwithcheck" ] && [ "$polwithcheck" != "NULL" ]; then
                    SQL="$SQL WITH CHECK ($polwithcheck)"
                fi
                
                SQL="$SQL;"
                
                psql "$TARGET_DB_URL" -c "$SQL"
                echo "✅ Política '$polname' criada no destino"
            else
                echo "🔍 [DRY RUN] Seria criada a política '$polname' no destino"
            fi
        fi
    done <<< "$SOURCE_POLICIES"
    
    # Identificar políticas que existem apenas no destino
    while read -r target_polname; do
        # Remover espaços em branco
        target_polname=$(echo "$target_polname" | tr -d ' ')
        
        # Pular linhas vazias
        if [ -z "$target_polname" ]; then
            continue
        fi
        
        # Verificar se a política existe na origem
        if ! echo "$SOURCE_POLICIES" | grep -q "$target_polname"; then
            echo "🔄 Removendo política '$target_polname' do destino (não existe na origem)..."
            
            if [ "$DRY_RUN" = "false" ]; then
                psql "$TARGET_DB_URL" -c "DROP POLICY IF EXISTS \"$target_polname\" ON public.$table;"
                echo "✅ Política '$target_polname' removida do destino"
            else
                echo "🔍 [DRY RUN] Seria removida a política '$target_polname' do destino"
            fi
        fi
    done <<< "$TARGET_POLICIES"
    
    echo "✅ Sincronização de políticas RLS para tabela '$table' concluída"
done

echo "\n✅ Processo de sincronização de políticas RLS concluído"

if [ "$DRY_RUN" = "true" ]; then
    echo "ℹ️ Esta foi apenas uma simulação. Para executar a sincronização, defina DRY_RUN=false"
fi