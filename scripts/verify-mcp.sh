# 🔍 Verificador MCP - Borboleta Eventos

echo "🔍 Verificando configuração MCP..."

# Verificar se estamos no container
if [ ! -f /.dockerenv ]; then
    echo "❌ Este script deve ser executado dentro do container Docker!"
    exit 1
fi

echo "📋 Verificando servidores MCP instalados:"

# Verificar instalações globais
packages=(
    "@modelcontextprotocol/server-supabase"
    "@modelcontextprotocol/server-github" 
    "@modelcontextprotocol/server-browser"
    "@upstash/context7-mcp"
    "@21st-dev/magic-mcp"
)

for package in "${packages[@]}"; do
    if npm list -g "$package" >/dev/null 2>&1; then
        echo "✅ $package - INSTALADO"
    else
        echo "❌ $package - NÃO ENCONTRADO"
    fi
done

echo ""
echo "🔧 Verificando orchestrator:"
if [ -f "/app/scripts/mcp-orchestrator.js" ]; then
    echo "✅ mcp-orchestrator.js - ENCONTRADO"
else
    echo "❌ mcp-orchestrator.js - NÃO ENCONTRADO"
fi

if [ -L "/usr/local/bin/mcp-orchestrator" ]; then
    echo "✅ Link simbólico - CONFIGURADO"
else
    echo "❌ Link simbólico - NÃO CONFIGURADO"
fi

echo ""
echo "🌐 Verificando variáveis de ambiente:"

vars=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "GITHUB_PERSONAL_ACCESS_TOKEN"
    "N8N_API_URL"
    "DOCKER_HOST"
)

for var in "${vars[@]}"; do
    if [ -n "${!var}" ]; then
        # Mascarar valores sensíveis
        if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"TOKEN"* ]]; then
            echo "✅ $var - CONFIGURADO (${!var:0:10}...)"
        else
            echo "✅ $var - CONFIGURADO (${!var})"
        fi
    else
        echo "⚠️  $var - NÃO CONFIGURADO"
    fi
done

echo ""
echo "🚀 Teste de inicialização rápida:"
echo "Para testar: npx mcp-orchestrator"
