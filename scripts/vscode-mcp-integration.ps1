# VS Code + MCP Integration Automation Script
# This script sets up the complete MCP ecosystem with VS Code integration

param(
    [Parameter(Mandatory=$false)]
    [string]$Action = "setup",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

# Configuration
$ProjectPath = "c:\xampp\htdocs\borboleta-eventos-loja"
$DockerContainer = "borboleta-eventos-loja-app-1"
$SupabaseProject = "pxcvoiffnandpdyotped"

Write-Host "🚀 VS Code + MCP Integration Automation" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor Green

function Test-DockerContainer {
    $container = docker ps --filter "name=$DockerContainer" --format "table {{.Names}}" | Select-String $DockerContainer
    return $null -ne $container
}

function Start-MCPOrchestrator {
    Write-Host "⚡ Starting MCP Orchestrator (7 Servers)..." -ForegroundColor Yellow
    
    if (Test-DockerContainer) {
        docker exec -d $DockerContainer bash -c "cd /app; node scripts/mcp-orchestrator-simple.cjs"
        Write-Host "✅ MCP Orchestrator started successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Docker container not found: $DockerContainer" -ForegroundColor Red
        return $false
    }
}

function Deploy-SupabaseFunctions {
    Write-Host "🔧 Deploying Supabase Edge Functions..." -ForegroundColor Yellow
    
    if (Test-DockerContainer) {
        $result = docker exec -i $DockerContainer bash -c "cd /app; supabase functions deploy"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Supabase functions deployed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Supabase deployment failed" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Docker container not found: $DockerContainer" -ForegroundColor Red
        return $false
    }
}

function Test-PaymentAPI {
    Write-Host "💳 Testing AbacatePay API integration..." -ForegroundColor Yellow
    
    $testPayload = @{
        orderId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        amount = 1000
        description = "Test payment via VS Code MCP"
    } | ConvertTo-Json -Compress

    if (Test-DockerContainer) {
        $escapedPayload = $testPayload.Replace('"', '\"')
        $curlCommand = "curl -s -X POST 'https://$SupabaseProject.supabase.co/functions/v1/create-abacate-payment' -H 'Authorization: Bearer `$SUPABASE_ANON_KEY' -H 'Content-Type: application/json' -d '$escapedPayload'"
        $result = docker exec -i $DockerContainer bash -c "cd /app; $curlCommand"
        
        Write-Host "API Response: $result" -ForegroundColor Gray
        
        if ($result -match '"url"') {
            Write-Host "✅ Payment API test successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Payment API test failed" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Docker container not found: $DockerContainer" -ForegroundColor Red
        return $false
    }
}

function Check-MCPStatus {
    Write-Host "📊 Checking MCP Status..." -ForegroundColor Yellow
    
    if (Test-DockerContainer) {
        $processes = docker exec -i $DockerContainer bash -c "ps aux | grep -E '(mcp|node)' | grep -v grep"
        Write-Host "MCP Processes:" -ForegroundColor Gray
        Write-Host $processes -ForegroundColor White
        
        $processCount = ($processes -split "`n" | Where-Object { $_ -match "mcp|node" }).Count
        Write-Host "Active MCP processes: $processCount" -ForegroundColor Green
        return $processCount -gt 0
    } else {
        Write-Host "❌ Docker container not found: $DockerContainer" -ForegroundColor Red
        return $false
    }
}

function Setup-VSCodeIntegration {
    Write-Host "🔧 Setting up VS Code integration..." -ForegroundColor Yellow
    
    # Verify VS Code configuration files exist
    $vscodeDir = Join-Path $ProjectPath ".vscode"
    $tasksFile = Join-Path $vscodeDir "tasks.json"
    $settingsFile = Join-Path $vscodeDir "settings.json" 
    $mcpConfigFile = Join-Path $vscodeDir "mcp-integration.json"
    
    $configExists = (Test-Path $tasksFile) -and (Test-Path $settingsFile) -and (Test-Path $mcpConfigFile)
    
    if ($configExists) {
        Write-Host "✅ VS Code configuration files found" -ForegroundColor Green
        
        # Test if VS Code can load the workspace
        try {
            code $ProjectPath --wait
            Write-Host "✅ VS Code workspace loaded successfully" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "❌ Failed to open VS Code workspace" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ VS Code configuration files missing" -ForegroundColor Red
        return $false
    }
}

function Show-Status {
    Write-Host "`n📋 Current Status:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    
    $dockerStatus = Test-DockerContainer
    Write-Host "Docker Container: $(if($dockerStatus){'✅ Running'}else{'❌ Stopped'})" -ForegroundColor $(if($dockerStatus){'Green'}else{'Red'})
    
    $mcpStatus = Check-MCPStatus
    Write-Host "MCP Orchestrator: $(if($mcpStatus){'✅ Active'}else{'❌ Inactive'})" -ForegroundColor $(if($mcpStatus){'Green'}else{'Red'})
    
    Write-Host "`n🔧 Available Actions:"
    Write-Host "  setup     - Complete setup and start all services"
    Write-Host "  start     - Start MCP orchestrator"
    Write-Host "  deploy    - Deploy Supabase functions"
    Write-Host "  test      - Test payment API"
    Write-Host "  status    - Show current status"
    Write-Host "  vscode    - Open VS Code with MCP integration"
}

# Main execution logic
switch ($Action.ToLower()) {
    "setup" {
        Write-Host "🚀 Complete Setup Starting..." -ForegroundColor Cyan
        $success = $true
        
        $success = $success -and (Start-MCPOrchestrator)
        Start-Sleep -Seconds 3
        
        $success = $success -and (Deploy-SupabaseFunctions)
        Start-Sleep -Seconds 2
        
        $success = $success -and (Test-PaymentAPI)
        
        if ($success) {
            Write-Host "`n🎉 Setup completed successfully!" -ForegroundColor Green
            Write-Host "You can now use VS Code with full MCP integration." -ForegroundColor Green
        } else {
            Write-Host "`n❌ Setup failed. Check the errors above." -ForegroundColor Red
        }
    }
    
    "start" {
        Start-MCPOrchestrator
    }
    
    "deploy" {
        Deploy-SupabaseFunctions
    }
    
    "test" {
        Test-PaymentAPI
    }
    
    "status" {
        Show-Status
    }
    
    "vscode" {
        Setup-VSCodeIntegration
    }
    
    default {
        Show-Status
    }
}

Write-Host "`n✨ Script completed." -ForegroundColor Cyan
