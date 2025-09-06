#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
ACTION="${ACTION:-list}"
WEBHOOK_ID="${WEBHOOK_ID:-}"
WEBHOOK_NAME="${WEBHOOK_NAME:-}"
WEBHOOK_URL="${WEBHOOK_URL:-}"
WEBHOOK_EVENTS="${WEBHOOK_EVENTS:-}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"
WEBHOOK_ENABLED="${WEBHOOK_ENABLED:-true}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🔔 Gerenciador de Webhooks Supabase"
echo "Projeto: $PROJECT_REF"
echo "Ação: $ACTION"

# Vincular projeto
echo "🔗 Vinculando ao projeto ($PROJECT_REF)..."
supabase link --project-ref "$PROJECT_REF"

# Verificar status
echo "📊 Verificando status do projeto..."
supabase status

# Obter URL do banco de dados
DB_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')

if [ -z "$DB_URL" ]; then
    echo "❌ Não foi possível obter a URL do banco de dados"
    exit 1
fi

# Função para listar webhooks
list_webhooks() {
    echo "📋 Listando Webhooks..."
    
    # Consulta SQL para listar webhooks
    WEBHOOKS=$(psql "$DB_URL" -t -c "
        SELECT id, name, endpoint, enabled, filters, created_at
        FROM supabase_functions.hooks
        ORDER BY created_at DESC;
    ")
    
    if [ -z "$WEBHOOKS" ]; then
        echo "ℹ️ Nenhum webhook encontrado"
        return
    fi
    
    echo "\n📊 Webhooks encontrados:"
    echo "--------------------------------------------------"
    echo "ID | Nome | Endpoint | Ativo | Eventos | Criado em"
    echo "--------------------------------------------------"
    echo "$WEBHOOKS" | sed 's/|/ | /g'
    echo "--------------------------------------------------"
}

# Função para obter detalhes de um webhook
get_webhook() {
    if [ -z "$WEBHOOK_ID" ]; then
        echo "❌ ID do webhook não especificado"
        exit 1
    fi
    
    echo "🔍 Obtendo detalhes do webhook: $WEBHOOK_ID"
    
    # Consulta SQL para obter detalhes do webhook
    WEBHOOK=$(psql "$DB_URL" -t -c "
        SELECT id, name, endpoint, enabled, filters, created_at, updated_at, request_headers
        FROM supabase_functions.hooks
        WHERE id = '$WEBHOOK_ID';
    ")
    
    if [ -z "$WEBHOOK" ]; then
        echo "❌ Webhook não encontrado: $WEBHOOK_ID"
        exit 1
    fi
    
    echo "\n📊 Detalhes do webhook:"
    echo "--------------------------------------------------"
    echo "$WEBHOOK" | sed 's/|/\n/g'
    echo "--------------------------------------------------"
}

# Função para criar webhook
create_webhook() {
    if [ -z "$WEBHOOK_NAME" ] || [ -z "$WEBHOOK_URL" ] || [ -z "$WEBHOOK_EVENTS" ]; then
        echo "❌ Nome, URL ou eventos do webhook não especificados"
        echo "Uso: ACTION=create WEBHOOK_NAME=nome WEBHOOK_URL=url WEBHOOK_EVENTS=evento1,evento2 ./manage-webhooks.sh"
        exit 1
    fi
    
    echo "🔧 Criando webhook: $WEBHOOK_NAME"
    echo "URL: $WEBHOOK_URL"
    echo "Eventos: $WEBHOOK_EVENTS"
    echo "Ativo: $WEBHOOK_ENABLED"
    
    # Converter eventos para formato JSON
    IFS=',' read -ra EVENT_ARRAY <<< "$WEBHOOK_EVENTS"
    EVENTS_JSON="["
    for i in "${!EVENT_ARRAY[@]}"; do
        if [ $i -gt 0 ]; then
            EVENTS_JSON="$EVENTS_JSON,"
        fi
        EVENTS_JSON="$EVENTS_JSON\"${EVENT_ARRAY[$i]}\""
    done
    EVENTS_JSON="$EVENTS_JSON]"
    
    # Preparar headers JSON
    HEADERS_JSON="{}"
    if [ -n "$WEBHOOK_SECRET" ]; then
        HEADERS_JSON="{\"Authorization\": \"Bearer $WEBHOOK_SECRET\"}"
    fi
    
    # Consulta SQL para criar webhook
    WEBHOOK_ID=$(psql "$DB_URL" -t -c "
        INSERT INTO supabase_functions.hooks (name, endpoint, filters, enabled, request_headers)
        VALUES ('$WEBHOOK_NAME', '$WEBHOOK_URL', '$EVENTS_JSON', $WEBHOOK_ENABLED, '$HEADERS_JSON')
        RETURNING id;
    " | tr -d ' ')
    
    if [ -z "$WEBHOOK_ID" ]; then
        echo "❌ Falha ao criar webhook"
        exit 1
    fi
    
    echo "✅ Webhook criado com sucesso"
    echo "ID: $WEBHOOK_ID"
}

# Função para atualizar webhook
update_webhook() {
    if [ -z "$WEBHOOK_ID" ]; then
        echo "❌ ID do webhook não especificado"
        exit 1
    fi
    
    echo "🔄 Atualizando webhook: $WEBHOOK_ID"
    
    # Verificar se o webhook existe
    WEBHOOK_EXISTS=$(psql "$DB_URL" -t -c "
        SELECT id FROM supabase_functions.hooks WHERE id = '$WEBHOOK_ID';
    " | tr -d ' ')
    
    if [ -z "$WEBHOOK_EXISTS" ]; then
        echo "❌ Webhook não encontrado: $WEBHOOK_ID"
        exit 1
    fi
    
    # Construir consulta SQL para atualização
    UPDATE_SQL="UPDATE supabase_functions.hooks SET updated_at = NOW()"
    
    if [ -n "$WEBHOOK_NAME" ]; then
        echo "Nome: $WEBHOOK_NAME"
        UPDATE_SQL="$UPDATE_SQL, name = '$WEBHOOK_NAME'"
    fi
    
    if [ -n "$WEBHOOK_URL" ]; then
        echo "URL: $WEBHOOK_URL"
        UPDATE_SQL="$UPDATE_SQL, endpoint = '$WEBHOOK_URL'"
    fi
    
    if [ -n "$WEBHOOK_EVENTS" ]; then
        echo "Eventos: $WEBHOOK_EVENTS"
        
        # Converter eventos para formato JSON
        IFS=',' read -ra EVENT_ARRAY <<< "$WEBHOOK_EVENTS"
        EVENTS_JSON="["
        for i in "${!EVENT_ARRAY[@]}"; do
            if [ $i -gt 0 ]; then
                EVENTS_JSON="$EVENTS_JSON,"
            fi
            EVENTS_JSON="$EVENTS_JSON\"${EVENT_ARRAY[$i]}\""
        done
        EVENTS_JSON="$EVENTS_JSON]"
        
        UPDATE_SQL="$UPDATE_SQL, filters = '$EVENTS_JSON'"
    fi
    
    if [ -n "$WEBHOOK_ENABLED" ]; then
        echo "Ativo: $WEBHOOK_ENABLED"
        UPDATE_SQL="$UPDATE_SQL, enabled = $WEBHOOK_ENABLED"
    fi
    
    if [ -n "$WEBHOOK_SECRET" ]; then
        echo "Segredo atualizado"
        HEADERS_JSON="{\"Authorization\": \"Bearer $WEBHOOK_SECRET\"}"
        UPDATE_SQL="$UPDATE_SQL, request_headers = '$HEADERS_JSON'"
    fi
    
    # Executar atualização
    UPDATE_SQL="$UPDATE_SQL WHERE id = '$WEBHOOK_ID';"
    psql "$DB_URL" -c "$UPDATE_SQL"
    
    echo "✅ Webhook atualizado com sucesso"
}

# Função para excluir webhook
delete_webhook() {
    if [ -z "$WEBHOOK_ID" ]; then
        echo "❌ ID do webhook não especificado"
        exit 1
    fi
    
    echo "🗑️ Excluindo webhook: $WEBHOOK_ID"
    
    # Verificar se o webhook existe
    WEBHOOK_EXISTS=$(psql "$DB_URL" -t -c "
        SELECT id FROM supabase_functions.hooks WHERE id = '$WEBHOOK_ID';
    " | tr -d ' ')
    
    if [ -z "$WEBHOOK_EXISTS" ]; then
        echo "❌ Webhook não encontrado: $WEBHOOK_ID"
        exit 1
    fi
    
    # Confirmar exclusão
    read -p "⚠️ Tem certeza que deseja excluir o webhook '$WEBHOOK_ID'? (s/N) " confirm
    if [[ "$confirm" != [sS] ]]; then
        echo "ℹ️ Operação cancelada"
        exit 0
    fi
    
    # Executar exclusão
    psql "$DB_URL" -c "DELETE FROM supabase_functions.hooks WHERE id = '$WEBHOOK_ID';"
    
    echo "✅ Webhook excluído com sucesso"
}

# Função para ativar/desativar webhook
toggle_webhook() {
    if [ -z "$WEBHOOK_ID" ]; then
        echo "❌ ID do webhook não especificado"
        exit 1
    fi
    
    # Verificar se o webhook existe
    WEBHOOK_INFO=$(psql "$DB_URL" -t -c "
        SELECT id, name, enabled FROM supabase_functions.hooks WHERE id = '$WEBHOOK_ID';
    ")
    
    if [ -z "$WEBHOOK_INFO" ]; then
        echo "❌ Webhook não encontrado: $WEBHOOK_ID"
        exit 1
    fi
    
    # Extrair nome e estado atual
    WEBHOOK_NAME=$(echo "$WEBHOOK_INFO" | awk -F'|' '{print $2}' | tr -d ' ')
    CURRENT_STATE=$(echo "$WEBHOOK_INFO" | awk -F'|' '{print $3}' | tr -d ' ')
    
    # Determinar novo estado
    if [ "$CURRENT_STATE" = "t" ]; then
        NEW_STATE="false"
        ACTION_DESC="Desativando"
    else
        NEW_STATE="true"
        ACTION_DESC="Ativando"
    fi
    
    echo "$ACTION_DESC webhook: $WEBHOOK_NAME ($WEBHOOK_ID)"
    
    # Executar atualização
    psql "$DB_URL" -c "UPDATE supabase_functions.hooks SET enabled = $NEW_STATE, updated_at = NOW() WHERE id = '$WEBHOOK_ID';"
    
    echo "✅ Webhook ${NEW_STATE/true/ativado}${NEW_STATE/false/desativado} com sucesso"
}

# Função para testar webhook
test_webhook() {
    if [ -z "$WEBHOOK_ID" ]; then
        echo "❌ ID do webhook não especificado"
        exit 1
    fi
    
    # Verificar se o webhook existe
    WEBHOOK_INFO=$(psql "$DB_URL" -t -c "
        SELECT id, name, endpoint, request_headers FROM supabase_functions.hooks WHERE id = '$WEBHOOK_ID';
    ")
    
    if [ -z "$WEBHOOK_INFO" ]; then
        echo "❌ Webhook não encontrado: $WEBHOOK_ID"
        exit 1
    fi
    
    # Extrair informações
    WEBHOOK_NAME=$(echo "$WEBHOOK_INFO" | awk -F'|' '{print $2}' | tr -d ' ')
    WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | awk -F'|' '{print $3}' | tr -d ' ')
    WEBHOOK_HEADERS=$(echo "$WEBHOOK_INFO" | awk -F'|' '{print $4}' | tr -d ' ')
    
    echo "🧪 Testando webhook: $WEBHOOK_NAME ($WEBHOOK_ID)"
    echo "URL: $WEBHOOK_URL"
    
    # Preparar payload de teste
    PAYLOAD="{
        \"type\": \"test\",
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
        \"source\": \"supabase-agent\",
        \"payload\": {
            \"message\": \"Este é um teste do webhook\",
            \"webhook_id\": \"$WEBHOOK_ID\"
        }
    }"
    
    # Extrair token de autorização se existir
    AUTH_HEADER=""
    if [[ "$WEBHOOK_HEADERS" == *"Authorization"* ]]; then
        AUTH_HEADER=$(echo "$WEBHOOK_HEADERS" | grep -o '"Authorization"[^}]*' | sed 's/"Authorization"[^"]*"\([^"]*\)".*/\1/')
    fi
    
    # Enviar requisição de teste
    echo "📤 Enviando payload de teste..."
    
    if [ -n "$AUTH_HEADER" ]; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -H "Authorization: $AUTH_HEADER" \
            -d "$PAYLOAD")
    else
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD")
    fi
    
    # Verificar resposta
    if [[ "$RESPONSE" =~ ^2[0-9][0-9]$ ]]; then
        echo "✅ Teste bem-sucedido! Resposta: $RESPONSE"
    else
        echo "❌ Falha no teste. Resposta: $RESPONSE"
    fi
}

# Função para exportar webhooks
export_webhooks() {
    echo "📤 Exportando webhooks..."
    
    # Consulta SQL para obter todos os webhooks
    WEBHOOKS=$(psql "$DB_URL" -t -c "
        SELECT json_agg(hooks) 
        FROM supabase_functions.hooks;
    ")
    
    if [ -z "$WEBHOOKS" ] || [ "$WEBHOOKS" = " [null]" ]; then
        echo "ℹ️ Nenhum webhook encontrado para exportar"
        return
    fi
    
    # Criar arquivo de exportação
    EXPORT_FILE="webhooks_export_$(date +%Y%m%d_%H%M%S).json"
    echo "$WEBHOOKS" > "$EXPORT_FILE"
    
    echo "✅ Webhooks exportados para: $EXPORT_FILE"
}

# Função para importar webhooks
import_webhooks() {
    if [ -z "$1" ]; then
        echo "❌ Arquivo de importação não especificado"
        exit 1
    fi
    
    IMPORT_FILE="$1"
    
    if [ ! -f "$IMPORT_FILE" ]; then
        echo "❌ Arquivo não encontrado: $IMPORT_FILE"
        exit 1
    fi
    
    echo "📥 Importando webhooks de: $IMPORT_FILE"
    
    # Ler arquivo JSON
    WEBHOOKS=$(cat "$IMPORT_FILE")
    
    # Verificar se é um JSON válido
    if ! jq -e . >/dev/null 2>&1 <<< "$WEBHOOKS"; then
        echo "❌ Arquivo não contém JSON válido"
        exit 1
    fi
    
    # Contar webhooks no arquivo
    WEBHOOK_COUNT=$(jq 'length' <<< "$WEBHOOKS")
    echo "📊 $WEBHOOK_COUNT webhooks encontrados no arquivo"
    
    # Confirmar importação
    read -p "⚠️ Deseja importar $WEBHOOK_COUNT webhooks? (s/N) " confirm
    if [[ "$confirm" != [sS] ]]; then
        echo "ℹ️ Operação cancelada"
        exit 0
    fi
    
    # Processar cada webhook
    for i in $(seq 0 $((WEBHOOK_COUNT-1))); do
        WEBHOOK=$(jq -r ".[$i]" <<< "$WEBHOOKS")
        
        NAME=$(jq -r '.name' <<< "$WEBHOOK")
        ENDPOINT=$(jq -r '.endpoint' <<< "$WEBHOOK")
        FILTERS=$(jq -r '.filters' <<< "$WEBHOOK")
        ENABLED=$(jq -r '.enabled' <<< "$WEBHOOK")
        HEADERS=$(jq -r '.request_headers // "{}"' <<< "$WEBHOOK")
        
        echo "\n🔄 Importando webhook: $NAME"
        echo "URL: $ENDPOINT"
        
        # Inserir webhook
        psql "$DB_URL" -c "
            INSERT INTO supabase_functions.hooks (name, endpoint, filters, enabled, request_headers)
            VALUES ('$NAME', '$ENDPOINT', '$FILTERS', $ENABLED, '$HEADERS');
        "
        
        echo "✅ Webhook '$NAME' importado com sucesso"
    done
    
    echo "\n✅ Importação concluída com sucesso"
}

# Executar ação especificada
case "$ACTION" in
    list)
        list_webhooks
        ;;
    get)
        get_webhook
        ;;
    create)
        create_webhook
        ;;
    update)
        update_webhook
        ;;
    delete)
        delete_webhook
        ;;
    toggle)
        toggle_webhook
        ;;
    test)
        test_webhook
        ;;
    export)
        export_webhooks
        ;;
    import)
        if [ -z "$2" ] && [ -z "${IMPORT_FILE:-}" ]; then
            echo "❌ Arquivo de importação não especificado"
            echo "Uso: ACTION=import IMPORT_FILE=arquivo.json ./manage-webhooks.sh"
            exit 1
        fi
        import_webhooks "${IMPORT_FILE:-$2}"
        ;;
    *)
        echo "❌ Ação desconhecida: $ACTION"
        echo "Ações disponíveis: list, get, create, update, delete, toggle, test, export, import"
        exit 1
        ;;
esac

echo "\n✅ Operação concluída com sucesso"