# 🚀 Setup MCP Windows - Borboleta Eventos
# PowerShell script para configurar MCP no Windows

Write-Host "🔧 Configurando Model Context Protocol (MCP) para Windows..." -ForegroundColor Green

# Verificar se Docker está rodando
$dockerRunning = docker ps 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ Docker não está rodando. Inicie o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Construindo container da aplicação..." -ForegroundColor Yellow
docker-compose build

Write-Host "🚀 Iniciando container da aplicação..." -ForegroundColor Yellow  
docker-compose up -d

# Aguardar container inicializar
Write-Host "⏳ Aguardando container inicializar (10s)..." -ForegroundColor Yellow
Start-Sleep 10

# Verificar se container está rodando
$containerRunning = docker ps --filter "name=borboleta-eventos-loja-app-1" --format "table {{.Names}}" | Select-String "borboleta-eventos-loja-app-1"
if (-not $containerRunning) {
    Write-Host "❌ Container não está rodando. Verifique os logs:" -ForegroundColor Red
    docker-compose logs app
    exit 1
}

Write-Host "✅ Container está rodando!" -ForegroundColor Green

Write-Host "🔧 Executando setup MCP dentro do container..." -ForegroundColor Yellow
docker exec borboleta-eventos-loja-app-1 bash /app/scripts/setup-mcp.sh

Write-Host "🔍 Verificando instalação..." -ForegroundColor Yellow
docker exec borboleta-eventos-loja-app-1 bash /app/scripts/verify-mcp.sh

Write-Host ""
Write-Host "✅ Setup MCP concluído!" -ForegroundColor Green
Write-Host "📋 Para usar MCP, configure o arquivo mcp_config.json conforme documentação" -ForegroundColor Cyan
Write-Host "🚀 Para testar: docker exec -it borboleta-eventos-loja-app-1 npx mcp-orchestrator" -ForegroundColor Cyan
