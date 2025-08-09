# 🚀 MCP Orchestrator Stack Manager
# Gerenciamento completo da stack MCP com Orchestrator

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "test", "clean")]
    [string]$Action = "status"
)

# Configuração
$ProjectPath = "c:\xampps\htdocs\queren"
$DockerComposeFile = "docker-compose.mcp-orchestrator.yml"
$Services = @("mcp-orchestrator", "dockerhub-mcp", "n8n", "app")

Write-Host "🚀 MCP Orchestrator Stack Manager" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor Green
Write-Host "Project: $ProjectPath" -ForegroundColor Gray
Write-Host ""

function Test-DockerRunning {
    try {
        docker version | Out-Null
        return $true
    }
    catch {
        Write-Host "❌ Docker não está rodando!" -ForegroundColor Red
        return $false
    }
}

function Test-EnvFile {
    $envFile = Join-Path $ProjectPath ".env.mcp"
    if (-not (Test-Path $envFile)) {
        Write-Host "⚠️ Arquivo .env.mcp não encontrado!" -ForegroundColor Yellow
        Write-Host "Criando arquivo de exemplo..." -ForegroundColor Gray
        
        $envContent = @"
# Docker Hub MCP Configuration
HUB_PAT_TOKEN=your_docker_hub_pat_token_here
DOCKER_HUB_USERNAME=your_docker_hub_username_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# GitHub Configuration
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
"@
        Set-Content -Path $envFile -Value $envContent
        Write-Host "✅ Arquivo .env.mcp criado. Configure as variáveis antes de continuar." -ForegroundColor Green
        return $false
    }
    return $true
}

function Start-MCPStack {
    Write-Host "🚀 Iniciando MCP Orchestrator Stack..." -ForegroundColor Yellow
    
    if (-not (Test-DockerRunning)) { return $false }
    if (-not (Test-EnvFile)) { return $false }
    
    try {
        # Parar serviços existentes se estiverem rodando
        docker-compose -f $DockerComposeFile down --remove-orphans
        
        # Iniciar stack
        docker-compose -f $DockerComposeFile up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Stack iniciada com sucesso!" -ForegroundColor Green
            
            # Aguardar serviços ficarem prontos
            Write-Host "⏳ Aguardando serviços ficarem prontos..." -ForegroundColor Cyan
            Start-Sleep -Seconds 15
            
            # Testar conectividade
            Test-MCPServices
            
            Write-Host ""
            Write-Host "🌐 URLs disponíveis:" -ForegroundColor Cyan
            Write-Host "  • MCP Orchestrator: http://localhost:3000" -ForegroundColor White
            Write-Host "  • Docker Hub MCP: http://localhost:3001" -ForegroundColor White
            Write-Host "  • N8N: http://localhost:5678" -ForegroundColor White
            Write-Host "  • App: http://localhost:5173" -ForegroundColor White
            
            return $true
        } else {
            Write-Host "❌ Falha ao iniciar a stack" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Erro ao iniciar stack: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Stop-MCPStack {
    Write-Host "🛑 Parando MCP Orchestrator Stack..." -ForegroundColor Yellow
    
    try {
        docker-compose -f $DockerComposeFile down
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Stack parada com sucesso!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Falha ao parar a stack" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Erro ao parar stack: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Get-MCPStatus {
    Write-Host "📊 Status da MCP Orchestrator Stack:" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $containers = docker-compose -f $DockerComposeFile ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
        
        if ($containers) {
            Write-Host $containers
        } else {
            Write-Host "❌ Nenhum container encontrado" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "🔍 Verificando conectividade dos serviços:" -ForegroundColor Cyan
        Test-MCPServices
    }
    catch {
        Write-Host "❌ Erro ao verificar status: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-MCPServices {
    $services = @(
        @{ Name = "MCP Orchestrator"; Url = "http://localhost:3000"; Port = 3000 },
        @{ Name = "Docker Hub MCP"; Url = "http://localhost:3001"; Port = 3001 },
        @{ Name = "N8N"; Url = "http://localhost:5678"; Port = 5678 },
        @{ Name = "App"; Url = "http://localhost:5173"; Port = 5173 }
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.Url -Method GET -TimeoutSec 5 -UseBasicParsing
            Write-Host "  ✅ $($service.Name) - OK (Status: $($response.StatusCode))" -ForegroundColor Green
        }
        catch {
            # Verificar se a porta está em uso
            $portInUse = Get-NetTCPConnection -LocalPort $service.Port -ErrorAction SilentlyContinue
            if ($portInUse) {
                Write-Host "  🟡 $($service.Name) - Porta $($service.Port) em uso, mas serviço pode estar inicializando" -ForegroundColor Yellow
            } else {
                Write-Host "  ❌ $($service.Name) - Não disponível" -ForegroundColor Red
            }
        }
    }
}

function Show-MCPLogs {
    Write-Host "📋 Logs da MCP Orchestrator Stack:" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        docker-compose -f $DockerComposeFile logs --tail=50 -f
    }
    catch {
        Write-Host "❌ Erro ao exibir logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-MCPIntegration {
    Write-Host "🧪 Testando integração MCP..." -ForegroundColor Yellow
    Write-Host ""
    
    # Testar Docker Hub MCP
    Write-Host "🐳 Testando Docker Hub MCP:" -ForegroundColor Cyan
    try {
        $dockerhubTest = docker run --rm -i -e HUB_PAT_TOKEN -e DOCKER_HUB_USERNAME mcp/dockerhub:latest --transport=stdio --username=$env:DOCKER_HUB_USERNAME
        Write-Host "  ✅ Docker Hub MCP respondendo" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ Erro no Docker Hub MCP: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Testar conectividade entre serviços
    Write-Host "🔗 Testando conectividade entre serviços:" -ForegroundColor Cyan
    $networkTest = docker network ls | Select-String "mcp-network"
    if ($networkTest) {
        Write-Host "  ✅ Rede mcp-network ativa" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Rede mcp-network não encontrada" -ForegroundColor Red
    }
}

function Clean-MCPStack {
    Write-Host "🧹 Limpando MCP Orchestrator Stack..." -ForegroundColor Yellow
    
    try {
        # Parar e remover containers
        docker-compose -f $DockerComposeFile down --volumes --remove-orphans
        
        # Remover imagens órfãs
        docker image prune -f
        
        # Remover volumes órfãos
        docker volume prune -f
        
        Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erro durante limpeza: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Executar ação
switch ($Action) {
    "start" { Start-MCPStack }
    "stop" { Stop-MCPStack }
    "restart" { 
        Stop-MCPStack
        Start-Sleep -Seconds 3
        Start-MCPStack
    }
    "status" { Get-MCPStatus }
    "logs" { Show-MCPLogs }
    "test" { Test-MCPIntegration }
    "clean" { Clean-MCPStack }
    default {
        Write-Host @"
🚀 MCP Orchestrator Stack Manager

Uso: .\mcp-orchestrator-stack.ps1 -Action <ação>

Ações disponíveis:
  start   - Iniciar a stack completa
  stop    - Parar a stack
  restart - Reiniciar a stack
  status  - Verificar status dos serviços
  logs    - Exibir logs em tempo real
  test    - Testar integração MCP
  clean   - Limpar containers e volumes
"@ -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "✨ Operação concluída!" -ForegroundColor Green