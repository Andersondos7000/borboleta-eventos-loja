#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
ACTION="${ACTION:-list}"
FUNCTION_NAME="${FUNCTION_NAME:-}"
FUNCTION_PATH="${FUNCTION_PATH:-}"
ENVIRONMENT="${ENVIRONMENT:-staging}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🔧 Gerenciador de Edge Functions Supabase"
echo "Projeto: $PROJECT_REF"
echo "Ambiente: $ENVIRONMENT"
echo "Ação: $ACTION"

# Vincular projeto
echo "🔗 Vinculando ao projeto ($PROJECT_REF)..."
supabase link --project-ref "$PROJECT_REF"

# Verificar status
echo "📊 Verificando status do projeto..."
supabase status

# Função para listar funções
list_functions() {
    echo "📋 Listando Edge Functions..."
    supabase functions list --linked
}

# Função para criar nova função
create_function() {
    if [ -z "$FUNCTION_NAME" ]; then
        echo "❌ Nome da função não especificado"
        exit 1
    fi
    
    echo "🔧 Criando Edge Function: $FUNCTION_NAME"
    supabase functions new "$FUNCTION_NAME" --linked
    
    echo "✅ Edge Function '$FUNCTION_NAME' criada com sucesso"
    echo "📝 Edite o arquivo em: ./supabase/functions/$FUNCTION_NAME/index.ts"
}

# Função para implantar função
deploy_function() {
    if [ -z "$FUNCTION_NAME" ]; then
        echo "❌ Nome da função não especificado"
        exit 1
    fi
    
    # Verificar se a função existe localmente
    if [ ! -d "./supabase/functions/$FUNCTION_NAME" ]; then
        echo "❌ Função '$FUNCTION_NAME' não encontrada localmente"
        exit 1
    fi
    
    echo "🚀 Implantando Edge Function: $FUNCTION_NAME"
    supabase functions deploy "$FUNCTION_NAME" --linked
    
    echo "✅ Edge Function '$FUNCTION_NAME' implantada com sucesso"
    
    # Obter URL da função
    FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}"
    echo "🔗 URL da função: $FUNCTION_URL"
}

# Função para implantar todas as funções
deploy_all_functions() {
    echo "🚀 Implantando todas as Edge Functions..."
    
    # Verificar se o diretório de funções existe
    if [ ! -d "./supabase/functions" ]; then
        echo "❌ Diretório de funções não encontrado"
        exit 1
    fi
    
    # Listar diretórios de funções
    FUNCTIONS=$(find ./supabase/functions -maxdepth 1 -mindepth 1 -type d -not -path "*/\.*" -exec basename {} \;)
    
    if [ -z "$FUNCTIONS" ]; then
        echo "ℹ️ Nenhuma função encontrada para implantar"
        exit 0
    fi
    
    echo "📋 Funções encontradas:"
    echo "$FUNCTIONS"
    
    # Implantar cada função
    for func in $FUNCTIONS; do
        echo "\n🚀 Implantando função: $func"
        supabase functions deploy "$func" --linked
        echo "✅ Função '$func' implantada com sucesso"
    done
    
    echo "\n✅ Todas as funções foram implantadas com sucesso"
}

# Função para excluir função
delete_function() {
    if [ -z "$FUNCTION_NAME" ]; then
        echo "❌ Nome da função não especificado"
        exit 1
    fi
    
    echo "🗑️ Excluindo Edge Function: $FUNCTION_NAME"
    
    # Confirmar exclusão
    read -p "⚠️ Tem certeza que deseja excluir a função '$FUNCTION_NAME'? (s/N) " confirm
    if [[ "$confirm" != [sS] ]]; then
        echo "ℹ️ Operação cancelada"
        exit 0
    fi
    
    supabase functions delete "$FUNCTION_NAME" --linked
    
    echo "✅ Edge Function '$FUNCTION_NAME' excluída com sucesso"
}

# Função para obter logs
get_logs() {
    if [ -z "$FUNCTION_NAME" ]; then
        echo "📋 Obtendo logs de todas as funções..."
        supabase functions logs --linked
    else
        echo "📋 Obtendo logs da função: $FUNCTION_NAME"
        supabase functions logs "$FUNCTION_NAME" --linked
    fi
}

# Função para servir localmente
serve_local() {
    echo "🔧 Iniciando servidor local de Edge Functions..."
    supabase functions serve --linked
}

# Função para importar função existente
import_function() {
    if [ -z "$FUNCTION_NAME" ] || [ -z "$FUNCTION_PATH" ]; then
        echo "❌ Nome da função ou caminho não especificado"
        exit 1
    fi
    
    # Verificar se o diretório de destino já existe
    if [ -d "./supabase/functions/$FUNCTION_NAME" ]; then
        echo "⚠️ Função '$FUNCTION_NAME' já existe localmente"
        read -p "Deseja sobrescrever? (s/N) " confirm
        if [[ "$confirm" != [sS] ]]; then
            echo "ℹ️ Operação cancelada"
            exit 0
        fi
        rm -rf "./supabase/functions/$FUNCTION_NAME"
    fi
    
    # Criar diretório de funções se não existir
    mkdir -p "./supabase/functions"
    
    # Copiar função
    echo "🔄 Importando função de: $FUNCTION_PATH"
    cp -r "$FUNCTION_PATH" "./supabase/functions/$FUNCTION_NAME"
    
    echo "✅ Função '$FUNCTION_NAME' importada com sucesso"
}

# Função para configurar variáveis de ambiente
set_secrets() {
    if [ -z "$FUNCTION_NAME" ]; then
        echo "❌ Nome da função não especificado"
        exit 1
    fi
    
    echo "🔒 Configurando segredos para função: $FUNCTION_NAME"
    
    # Verificar se existe um arquivo .env para a função
    ENV_FILE="./supabase/functions/$FUNCTION_NAME/.env.$ENVIRONMENT"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo "⚠️ Arquivo de ambiente não encontrado: $ENV_FILE"
        read -p "Deseja criar um novo arquivo? (s/N) " confirm
        if [[ "$confirm" != [sS] ]]; then
            echo "ℹ️ Operação cancelada"
            exit 0
        fi
        touch "$ENV_FILE"
    fi
    
    # Ler variáveis do arquivo .env
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Pular linhas vazias ou comentários
        if [[ -z "$key" || "$key" == \#* ]]; then
            continue
        fi
        
        # Remover aspas do valor
        value=$(echo "$value" | sed -e 's/^"//;s/"$//')
        
        echo "🔑 Configurando segredo: $key"
        supabase secrets set "$key=$value" --env "$ENVIRONMENT" --linked
    done < "$ENV_FILE"
    
    echo "✅ Segredos configurados com sucesso para função '$FUNCTION_NAME'"
}

# Executar ação especificada
case "$ACTION" in
    list)
        list_functions
        ;;
    create)
        create_function
        ;;
    deploy)
        if [ -z "$FUNCTION_NAME" ]; then
            deploy_all_functions
        else
            deploy_function
        fi
        ;;
    delete)
        delete_function
        ;;
    logs)
        get_logs
        ;;
    serve)
        serve_local
        ;;
    import)
        import_function
        ;;
    secrets)
        set_secrets
        ;;
    *)
        echo "❌ Ação desconhecida: $ACTION"
        echo "Ações disponíveis: list, create, deploy, delete, logs, serve, import, secrets"
        exit 1
        ;;
esac

echo "\n✅ Operação concluída com sucesso"