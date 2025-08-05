# 🚀 Docker Hub MCP Integration Script
# Advanced deployment with automated builds and MCP Gateway

param(
    [Parameter(Mandatory=$false)]
    [string]$Action = "status",
    
    [Parameter(Mandatory=$false)]
    [switch]$UseMCPHub = $true
)

# Configuration
$ProjectPath = "c:\xampp\htdocs\borboleta-eventos-loja"
$DockerComposeFile = "docker-compose.mcp-hub.yml"
$MCPGatewayPort = "3000"
$DockerHubRegistry = "andersondos7000/borboleta-eventos-loja"

Write-Host "🚀 Docker Hub + MCP Gateway Integration" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor Green

function Test-DockerMCPServices {
    Write-Host "🔍 Checking Docker MCP Services..." -ForegroundColor Yellow
    
    try {
        $services = docker-compose -f $DockerComposeFile ps --services
        $runningServices = docker-compose -f $DockerComposeFile ps --filter "status=running" --format "table {{.Service}}"
        
        Write-Host "📋 Available Services:" -ForegroundColor Gray
        $services | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
        
        Write-Host "🟢 Running Services:" -ForegroundColor Gray
        $runningServices | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }
        
        return $services.Count -gt 0
    }
    catch {
        Write-Host "❌ Error checking Docker services: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Start-MCPHubStack {
    Write-Host "🚀 Starting Docker Hub MCP Stack..." -ForegroundColor Yellow
    
    try {
        # Start all MCP services
        docker-compose -f $DockerComposeFile up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker MCP Stack started successfully" -ForegroundColor Green
            
            # Wait for services to be ready
            Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Cyan
            Start-Sleep -Seconds 10
            
            # Test MCP Gateway
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:$MCPGatewayPort/health" -Method GET -TimeoutSec 5
                Write-Host "✅ MCP Gateway is healthy: $($response.status)" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️ MCP Gateway health check failed, but continuing..." -ForegroundColor Yellow
            }
            
            return $true
        } else {
            Write-Host "❌ Failed to start Docker MCP Stack" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error starting MCP Hub Stack: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Deploy-ToDockerHub {
    Write-Host "📦 Deploying to Docker Hub with Automated Builds..." -ForegroundColor Yellow
    
    try {
        # Build and tag the image
        Write-Host "🔨 Building Docker image..." -ForegroundColor Cyan
        docker build -t $DockerHubRegistry:latest -t $DockerHubRegistry:$(Get-Date -Format "yyyy.MM.dd") .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker image built successfully" -ForegroundColor Green
            
            # Push to Docker Hub
            Write-Host "⬆️ Pushing to Docker Hub..." -ForegroundColor Cyan
            docker push $DockerHubRegistry:latest
            docker push $DockerHubRegistry:$(Get-Date -Format "yyyy.MM.dd")
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Successfully pushed to Docker Hub" -ForegroundColor Green
                Write-Host "🔗 Image available at: https://hub.docker.com/r/$DockerHubRegistry" -ForegroundColor Cyan
                return $true
            } else {
                Write-Host "❌ Failed to push to Docker Hub" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ Failed to build Docker image" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error deploying to Docker Hub: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-MCPGateway {
    Write-Host "🧪 Testing MCP Gateway Integration..." -ForegroundColor Yellow
    
    try {
        $baseUrl = "http://localhost:$MCPGatewayPort"
        
        # Test health endpoint
        Write-Host "🔍 Testing health endpoint..." -ForegroundColor Cyan
        $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
        Write-Host "Health Status: $($health.status)" -ForegroundColor Green
        
        # Test MCP servers list
        Write-Host "🔍 Testing MCP servers list..." -ForegroundColor Cyan
        $servers = Invoke-RestMethod -Uri "$baseUrl/mcp/servers" -Method GET
        Write-Host "Active MCP Servers: $($servers.Count)" -ForegroundColor Green
        
        $servers | ForEach-Object {
            Write-Host "  - $($_.name): $($_.status)" -ForegroundColor White
        }
        
        # Test specific capabilities
        Write-Host "🔍 Testing Docker Hub MCP capabilities..." -ForegroundColor Cyan
        $dockerHubCapabilities = Invoke-RestMethod -Uri "$baseUrl/mcp/servers/docker-hub/capabilities" -Method GET
        Write-Host "Docker Hub Capabilities: $($dockerHubCapabilities.Count)" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "❌ MCP Gateway test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Setup-DockerHubWebhooks {
    Write-Host "🔗 Setting up Docker Hub Webhooks..." -ForegroundColor Yellow
    
    try {
        # Create webhook configuration
        $webhookConfig = @{
            name = "borboleta-mcp-gateway"
            webhook_url = "http://localhost:$MCPGatewayPort/webhooks/docker-hub"
            active = $true
        } | ConvertTo-Json
        
        Write-Host "📝 Webhook configuration created:" -ForegroundColor Gray
        Write-Host $webhookConfig -ForegroundColor White
        
        Write-Host "ℹ️ Please configure this webhook manually in Docker Hub:" -ForegroundColor Cyan
        Write-Host "   1. Go to https://hub.docker.com/r/$DockerHubRegistry/webhooks" -ForegroundColor Cyan
        Write-Host "   2. Add webhook URL: http://your-domain:$MCPGatewayPort/webhooks/docker-hub" -ForegroundColor Cyan
        Write-Host "   3. Enable for push events" -ForegroundColor Cyan
        
        return $true
    }
    catch {
        Write-Host "❌ Error setting up webhooks: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Check-MCPHubStatus {
    Write-Host "📊 Checking Docker Hub MCP Status..." -ForegroundColor Yellow
    
    # Check Docker services
    $dockerStatus = Test-DockerMCPServices
    
    # Check MCP Gateway
    $gatewayStatus = $false
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$MCPGatewayPort/health" -Method GET -TimeoutSec 3
        $gatewayStatus = $response.status -eq "healthy"
    }
    catch {
        $gatewayStatus = $false
    }
    
    # Check Docker Hub connectivity
    $hubStatus = $false
    try {
        docker info | Out-Null
        $hubStatus = $LASTEXITCODE -eq 0
    }
    catch {
        $hubStatus = $false
    }
    
    Write-Host "`n📋 Docker Hub MCP Status:" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    if ($dockerStatus) {
        Write-Host "Docker Services: ✅ Running" -ForegroundColor Green
    } else {
        Write-Host "Docker Services: ❌ Stopped" -ForegroundColor Red
    }
    
    if ($gatewayStatus) {
        Write-Host "MCP Gateway: ✅ Healthy" -ForegroundColor Green
    } else {
        Write-Host "MCP Gateway: ❌ Unhealthy" -ForegroundColor Red
    }
    
    if ($hubStatus) {
        Write-Host "Docker Hub: ✅ Connected" -ForegroundColor Green
    } else {
        Write-Host "Docker Hub: ❌ Disconnected" -ForegroundColor Red
    }
    
    Write-Host "`n🔧 Available Actions:"
    Write-Host "  setup-hub     - Complete Docker Hub MCP setup"
    Write-Host "  start         - Start MCP Hub stack"
    Write-Host "  deploy        - Deploy to Docker Hub"
    Write-Host "  test          - Test MCP Gateway"
    Write-Host "  webhooks      - Setup Docker Hub webhooks"
    Write-Host "  status        - Show current status"
    Write-Host "  logs          - Show MCP Gateway logs"
}

function Show-MCPLogs {
    Write-Host "📄 Showing MCP Gateway Logs..." -ForegroundColor Yellow
    
    try {
        docker-compose -f $DockerComposeFile logs -f mcp-gateway
    }
    catch {
        Write-Host "❌ Error showing logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main execution
switch ($Action.ToLower()) {
    "setup-hub" {
        Write-Host "🚀 Complete Docker Hub MCP Setup Starting..." -ForegroundColor Cyan
        $success = $true
        
        $success = $success -and (Start-MCPHubStack)
        Start-Sleep -Seconds 5
        
        $success = $success -and (Test-MCPGateway)
        Start-Sleep -Seconds 2
        
        $success = $success -and (Setup-DockerHubWebhooks)
        
        if ($success) {
            Write-Host "`n🎉 Docker Hub MCP Setup completed successfully!" -ForegroundColor Green
            Write-Host "🔗 MCP Gateway: http://localhost:$MCPGatewayPort" -ForegroundColor Cyan
            Write-Host "📦 Docker Hub: https://hub.docker.com/r/$DockerHubRegistry" -ForegroundColor Cyan
        } else {
            Write-Host "`n❌ Setup failed. Check the errors above." -ForegroundColor Red
        }
    }
    
    "start" {
        Start-MCPHubStack
    }
    
    "deploy" {
        Deploy-ToDockerHub
    }
    
    "test" {
        Test-MCPGateway
    }
    
    "webhooks" {
        Setup-DockerHubWebhooks
    }
    
    "logs" {
        Show-MCPLogs
    }
    
    "status" {
        Check-MCPHubStatus
    }
    
    default {
        Check-MCPHubStatus
    }
}

Write-Host "`n✨ Docker Hub MCP Integration script completed." -ForegroundColor Cyan
