# 🐳 Docker Hub MCP Gateway Starter (com N8N)
Write-Host "🦋 INICIANDO DOCKER HUB MCP GATEWAY + N8N" -ForegroundColor Magenta

# Verificar Docker
Write-Host "🔍 Verificando Docker..." -ForegroundColor Yellow
docker --version

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker não encontrado!" -ForegroundColor Red
    exit 1
}

# Criar network
Write-Host "🌐 Criando network MCP..." -ForegroundColor Yellow
docker network create mcp-network 2>$null

# Iniciar stack completo (incluindo N8N)
Write-Host "🚀 Iniciando MCP Gateway Stack + N8N..." -ForegroundColor Cyan
docker-compose -f docker-compose.n8n-simple.yml up -d

# Verificar status
Write-Host "⏳ Aguardando inicialização..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "📊 Status dos serviços:" -ForegroundColor Cyan
docker-compose -f docker-compose.n8n-simple.yml ps

Write-Host "`n✅ MCP Gateway + N8N iniciados!" -ForegroundColor Green
Write-Host "🌐 MCP Gateway: http://localhost:3005" -ForegroundColor Cyan
Write-Host "🔧 N8N Workflows: http://localhost:5678" -ForegroundColor Yellow
Write-Host "📱 Borboleta App: http://localhost:8812" -ForegroundColor Magenta
