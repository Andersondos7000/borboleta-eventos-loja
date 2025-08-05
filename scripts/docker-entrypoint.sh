#!/bin/bash
# Docker Hub MCP Integration Entrypoint Script
set -e

echo "🚀 Starting Borboleta Eventos Loja with MCP Integration..."

# Check if MCP Gateway is available
if [ "$MCP_ENABLED" = "true" ]; then
    echo "🔗 MCP Integration enabled, checking gateway connectivity..."
    
    # Wait for MCP Gateway to be ready
    timeout=60
    counter=0
    
    while [ $counter -lt $timeout ]; do
        if curl -s "$MCP_GATEWAY_URL/health" > /dev/null 2>&1; then
            echo "✅ MCP Gateway is ready at $MCP_GATEWAY_URL"
            break
        fi
        
        echo "⏳ Waiting for MCP Gateway... ($counter/$timeout)"
        sleep 2
        counter=$((counter + 1))
    done
    
    if [ $counter -eq $timeout ]; then
        echo "⚠️ MCP Gateway not available, continuing without MCP integration"
        export MCP_ENABLED=false
    else
        echo "🔌 Registering with MCP Gateway..."
        
        # Register this service with MCP Gateway
        curl -s -X POST "$MCP_GATEWAY_URL/register" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "borboleta-eventos-loja",
                "type": "client",
                "port": 5173,
                "capabilities": ["web", "api", "payments"],
                "health_endpoint": "/health"
            }' || echo "⚠️ Failed to register with MCP Gateway"
    fi
fi

# Initialize Supabase if needed
if [ ! -z "$VITE_SUPABASE_URL" ]; then
    echo "🗄️ Initializing Supabase connection..."
    
    # Test Supabase connectivity
    if curl -s "$VITE_SUPABASE_URL/rest/v1/" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY" > /dev/null 2>&1; then
        echo "✅ Supabase connection successful"
    else
        echo "⚠️ Supabase connection failed"
    fi
fi

# Setup health endpoint for Docker Hub health checks
echo "🏥 Setting up health check endpoint..."
mkdir -p /app/public
cat > /app/public/health <<EOF
{
    "status": "healthy",
    "timestamp": "$(date -Iseconds)",
    "version": "${VERSION:-3.0.0}",
    "mcp_enabled": "${MCP_ENABLED:-false}",
    "services": {
        "app": "running",
        "mcp_gateway": "${MCP_ENABLED:-false}",
        "supabase": "$([ ! -z "$VITE_SUPABASE_URL" ] && echo "configured" || echo "not_configured")"
    }
}
EOF

# Create startup script for development
if [ "$NODE_ENV" = "development" ]; then
    echo "🛠️ Starting in development mode..."
    exec pnpm dev --host 0.0.0.0 --port 5173
else
    echo "🚀 Starting in production mode..."
    
    # Serve built application with simple HTTP server
    if [ -d "/app/dist" ]; then
        echo "📦 Serving built application..."
        cd /app/dist
        exec npx serve -s . -l 5173
    else
        echo "⚠️ No built application found, starting development server..."
        cd /app
        exec pnpm dev --host 0.0.0.0 --port 5173
    fi
fi
