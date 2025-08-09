# 🐳 Docker Hub MCP Gateway - Simple Setup
# Versão: 3.0.0

param([string]$Action = "start")

Write-Host "🦋 DOCKER HUB MCP GATEWAY - BORBOLETA EVENTOS" -ForegroundColor Magenta

switch ($Action) {
    "start" {
        Write-Host "🚀 Iniciando Docker Hub MCP Gateway..." -ForegroundColor Cyan
        
        # Criar network se não existir
        docker network create mcp-network 2>$null
        
        # Iniciar stack MCP
        docker-compose -f docker-compose.mcp-hub.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MCP Gateway iniciado com sucesso!" -ForegroundColor Green
            Write-Host "🌐 Acesse: http://localhost:3000" -ForegroundColor Cyan
            
            # Aguardar inicialização
            Start-Sleep -Seconds 5
            
            # Mostrar status
            Write-Host "📊 Status dos serviços:" -ForegroundColor Yellow
            docker-compose -f docker-compose.mcp-hub.yml ps
        }
        else {
            Write-Host "❌ Erro ao iniciar MCP Gateway" -ForegroundColor Red
        }
    }
    
    "status" {
        Write-Host "📊 Status do MCP Gateway:" -ForegroundColor Cyan
        docker-compose -f docker-compose.mcp-hub.yml ps
        
        Write-Host "`n🌐 Testando conectividade..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 3
            Write-Host "✅ MCP Gateway: Online" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ MCP Gateway: Offline" -ForegroundColor Red
        }
    }
    
    "stop" {
        Write-Host "🛑 Parando MCP Gateway..." -ForegroundColor Yellow
        docker-compose -f docker-compose.mcp-hub.yml down
        Write-Host "✅ Serviços parados!" -ForegroundColor Green
    }
    
    "deploy" {
        Write-Host "🚢 Deploy para Docker Hub..." -ForegroundColor Cyan
        
        $registry = "andersondos7000/borboleta-eventos-loja"
        $tag = Get-Date -Format "yyyy.MM.dd"
        
        # Build
        Write-Host "🔨 Construindo imagem..." -ForegroundColor Yellow
        docker build -f Dockerfile.hub -t "${registry}:latest" -t "${registry}:${tag}" .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Imagem construída!" -ForegroundColor Green
            
            # Push
            Write-Host "📤 Enviando para Docker Hub..." -ForegroundColor Yellow
            docker push "${registry}:latest"
            docker push "${registry}:${tag}"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "🎉 Deploy realizado com sucesso!" -ForegroundColor Green
            }
        }
    }
    
    default {
        Write-Host @"
📚 Comandos disponíveis:
   start  - Iniciar MCP Gateway
   status - Ver status
   stop   - Parar serviços
   deploy - Deploy para Docker Hub
"@ -ForegroundColor Cyan
    }
}
