#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

# Função de ajuda
show_help() {
    echo "🤖 Supabase CLI Helper"
    echo ""
    echo "Uso: ./supabase-cli.sh [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  link       - Vincular projeto"
    echo "  status     - Verificar status"
    echo "  diff       - Verificar diferenças"
    echo "  push       - Aplicar migrações"
    echo "  pull       - Atualizar schema local"
    echo "  types      - Gerar tipos TypeScript"
    echo "  migrations - Listar migrações"
    echo "  lint       - Verificar problemas no banco"
    echo "  test       - Executar testes"
    echo "  monitor    - Executar monitoramento"
    echo "  help       - Mostrar esta ajuda"
    echo ""
    echo "Exemplo: ./supabase-cli.sh status"
}

# Verificar se foi fornecido um comando
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Processar comando
case "$1" in
    link)
        echo "🔗 Vinculando projeto..."
        supabase link --project-ref "$PROJECT_REF"
        ;;
    status)
        echo "📊 Verificando status..."
        supabase status
        ;;
    diff)
        echo "🔍 Verificando diferenças..."
        supabase db diff --linked
        ;;
    push)
        echo "🔄 Aplicando migrações..."
        supabase db push --linked
        ;;
    pull)
        echo "⬇️ Atualizando schema local..."
        supabase db pull --linked
        ;;
    types)
        echo "📄 Gerando tipos TypeScript..."
        mkdir -p src
        supabase gen types typescript --linked > src/database.types.ts
        echo "✅ Tipos gerados em src/database.types.ts"
        ;;
    migrations)
        echo "📋 Listando migrações..."
        supabase migration list --linked
        ;;
    lint)
        echo "🧪 Verificando problemas no banco..."
        supabase db lint --linked
        ;;
    test)
        echo "🧪 Executando testes..."
        supabase test db --linked
        ;;
    monitor)
        echo "🔍 Executando monitoramento..."
        ./monitor.sh
        ;;
    help)
        show_help
        ;;
    *)
        echo "❌ Comando desconhecido: $1"
        show_help
        exit 1
        ;;
esac

echo "✅ Comando concluído com sucesso!"