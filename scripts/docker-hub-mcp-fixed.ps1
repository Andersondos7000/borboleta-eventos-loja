# 🐳 Docker Hub MCP Gateway - Setup Script
# Autor: Borboleta Eventos Team
# Versão: 3.0.0

param(
    [string]$Action = "start",
    [string]$DockerHubRegistry = "andersondos7000/borboleta-eventos-loja",
    [switch]$Debug = $false
)

# Configurações globais
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Banner
Write-Host @"
🦋==================================================🦋
    DOCKER HUB MCP GATEWAY - BORBOLETA EVENTOS
    Integração Enterprise com Docker Hub + MCP
    Versão: 3.0.0 | PowerShell Automation
🦋==================================================🦋
"@ -ForegroundColor Magenta

function Initialize-DockerHubMCP {
    Write-Host "🐳 Inicializando Docker Hub MCP Gateway..." -ForegroundColor Cyan
    
    # Verificar se Docker está instalado
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker não encontrado. Por favor, instale o Docker Desktop."
        exit 1
    }
    
    # Verificar se Docker está rodando
    try {
        docker info | Out-Null
        Write-Host "✅ Docker está rodando" -ForegroundColor Green
    }
    catch {
        Write-Error "Docker não está rodando. Por favor, inicie o Docker Desktop."
        exit 1
    }
    
    # Criar network MCP
    Write-Host "🌐 Criando network MCP..." -ForegroundColor Yellow
    docker network create mcp-network --driver bridge 2>$null | Out-Null
    
    Write-Host "✅ Inicialização completa!" -ForegroundColor Green
}

function Start-MCPGateway {
    Write-Host "🚀 Iniciando Docker Hub MCP Gateway Stack..." -ForegroundColor Cyan
    
    try {
        # Iniciar stack MCP Gateway
        docker-compose -f docker-compose.mcp-hub.yml up -d
        
        Write-Host "⏳ Aguardando inicialização dos serviços..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Verificar status dos serviços
        Write-Host "📊 Status dos Serviços MCP:" -ForegroundColor Cyan
        docker-compose -f docker-compose.mcp-hub.yml ps
        
        # Testar MCP Gateway
        Write-Host "🧪 Testando MCP Gateway..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
            Write-Host "✅ MCP Gateway está respondendo:" -ForegroundColor Green
            Write-Host ($response | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        }
        catch {
            Write-Warning "⚠️ MCP Gateway ainda não está respondendo. Pode levar alguns segundos..."
        }
        
        Write-Host "🎉 Docker Hub MCP Gateway Stack iniciado com sucesso!" -ForegroundColor Green
        Write-Host "🌐 MCP Gateway: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "📊 MCP Dashboard: http://localhost:3000/dashboard" -ForegroundColor Cyan
        
    }
    catch {
        Write-Error "Erro ao iniciar MCP Gateway Stack: $_"
        exit 1
    }
}

function Deploy-ToDockerHub {
    Write-Host "🚢 Fazendo deploy para Docker Hub..." -ForegroundColor Cyan
    
    try {
        # Build da imagem
        Write-Host "🔨 Construindo imagem Docker..." -ForegroundColor Yellow
        $timestamp = Get-Date -Format "yyyy.MM.dd"
        $tagLatest = "${DockerHubRegistry}:latest"
        $tagTimestamp = "${DockerHubRegistry}:${timestamp}"
        
        docker build -f Dockerfile.hub -t $tagLatest -t $tagTimestamp .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Imagem construída com sucesso!" -ForegroundColor Green
            
            # Push para Docker Hub
            Write-Host "📤 Enviando para Docker Hub..." -ForegroundColor Yellow
            docker push $tagLatest
            docker push $tagTimestamp
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "🎉 Deploy realizado com sucesso!" -ForegroundColor Green
                Write-Host "🐳 Imagem disponível: $tagLatest" -ForegroundColor Cyan
                Write-Host "📅 Tag temporal: $tagTimestamp" -ForegroundColor Gray
            }
            else {
                Write-Error "Erro no push para Docker Hub"
            }
        }
        else {
            Write-Error "Erro na construção da imagem Docker"
        }
    }
    catch {
        Write-Error "Erro no deploy: $_"
        exit 1
    }
}

function Show-MCPStatus {
    Write-Host "📊 Status atual do Docker Hub MCP:" -ForegroundColor Cyan
    
    # Status dos containers
    Write-Host "`n🐳 Containers MCP:" -ForegroundColor Yellow
    docker ps --filter "network=mcp-network" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Status do MCP Gateway
    Write-Host "`n🌐 MCP Gateway Health:" -ForegroundColor Yellow
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 3
        Write-Host "✅ Status: $($health.status)" -ForegroundColor Green
        Write-Host "📊 Serviços MCP ativos: $($health.mcp_servers_count)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ MCP Gateway não está respondendo" -ForegroundColor Red
    }
    
    # Logs recentes
    Write-Host "`n📝 Logs recentes do MCP Gateway:" -ForegroundColor Yellow
    docker logs --tail=10 mcp-gateway 2>$null
}

function Stop-MCPGateway {
    Write-Host "🛑 Parando Docker Hub MCP Gateway..." -ForegroundColor Yellow
    
    docker-compose -f docker-compose.mcp-hub.yml down
    
    Write-Host "✅ MCP Gateway parado com sucesso!" -ForegroundColor Green
}

function Remove-MCPEnvironment {
    Write-Host "🗑️ Removendo ambiente MCP..." -ForegroundColor Red
    
    # Parar e remover containers
    docker-compose -f docker-compose.mcp-hub.yml down -v --remove-orphans
    
    # Remover network
    docker network rm mcp-network 2>$null | Out-Null
    
    # Remover imagens órfãs
    docker system prune -f
    
    Write-Host "✅ Ambiente MCP removido!" -ForegroundColor Green
}

# Função principal
function Main {
    Initialize-DockerHubMCP
    
    switch ($Action.ToLower()) {
        "start" {
            Start-MCPGateway
        }
        "deploy" {
            Deploy-ToDockerHub
        }
        "status" {
            Show-MCPStatus
        }
        "stop" {
            Stop-MCPGateway
        }
        "clean" {
            Remove-MCPEnvironment
        }
        "restart" {
            Stop-MCPGateway
            Start-Sleep -Seconds 3
            Start-MCPGateway
        }
        default {
            Write-Host @"
📚 Comandos disponíveis:
   .\docker-hub-mcp.ps1 start    - Iniciar MCP Gateway Stack
   .\docker-hub-mcp.ps1 deploy   - Deploy para Docker Hub
   .\docker-hub-mcp.ps1 status   - Mostrar status
   .\docker-hub-mcp.ps1 stop     - Parar serviços
   .\docker-hub-mcp.ps1 restart  - Reiniciar serviços
   .\docker-hub-mcp.ps1 clean    - Limpar ambiente
"@ -ForegroundColor Cyan
        }
    }
}

# Executar
try {
    Main
}
catch {
    Write-Error "Erro na execução: $_"
    exit 1
}
