# 🚀 Setup MCP - Borboleta Eventos

echo "🔧 Configurando Model Context Protocol (MCP) no container..."

# Verificar se estamos dentro do container
if [ ! -f /.dockerenv ]; then
    echo "❌ Este script deve ser executado dentro do container Docker!"
    exit 1
fi

echo "📦 Instalando servidores MCP globalmente..."

# Instalar servidores MCP oficiais
npm install -g @modelcontextprotocol/server-supabase@latest
npm install -g @modelcontextprotocol/server-github@latest
npm install -g @modelcontextprotocol/server-browser@latest
npm install -g @upstash/context7-mcp@latest
npm install -g @21st-dev/magic-mcp@latest

# Tentar instalar playwright-mcp-server (pode não estar disponível)
npm install -g playwright-mcp-server@latest || echo "⚠️  playwright-mcp-server não disponível"

echo "🔗 Criando link simbólico para o orchestrator..."
ln -sf /app/scripts/mcp-orchestrator.js /usr/local/bin/mcp-orchestrator
chmod +x /usr/local/bin/mcp-orchestrator

echo "✅ Setup MCP concluído!"
echo "🚀 Para iniciar: npx mcp-orchestrator"
