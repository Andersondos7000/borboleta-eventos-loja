# Script PowerShell para testar o MCP n8n
Write-Host "TESTANDO MCP DO N8N..." -ForegroundColor Cyan
Write-Host ""

# Configurar variaveis de ambiente
$env:N8N_API_URL = "https://n8n.ouvir.online"
$env:N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MmE5OTNiYy0wMmU0LTQwZDQtYTM4ZS0zNDY1MGQ4Nzc1ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5NDcxNjYxfQ.29ElzDO-7iyhQZbeamedFx9PeLRn8bpWOBExmL4sQlA"
$env:MCP_MODE = "stdio"
$env:LOG_LEVEL = "info"

Write-Host "Configuracao:" -ForegroundColor Yellow
Write-Host "   API URL: $env:N8N_API_URL"
Write-Host "   API Key: [CONFIGURADA]"
Write-Host ""

# Iniciar processo MCP
Write-Host "Iniciando MCP n8n..." -ForegroundColor Green

try {
    $mcpProcess = Start-Process -FilePath "npx" -ArgumentList "n8n-mcp" -NoNewWindow -PassThru -RedirectStandardOutput "mcp-output.txt" -RedirectStandardError "mcp-error.txt"
    
    # Aguardar um pouco para o processo inicializar
    Start-Sleep -Seconds 5
    
    # Verificar se o processo esta rodando
    if ($mcpProcess.HasExited) {
        Write-Host "ERRO: Processo MCP falhou ao iniciar" -ForegroundColor Red
        if (Test-Path "mcp-error.txt") {
            Write-Host "Erro:" -ForegroundColor Red
            Get-Content "mcp-error.txt"
        }
        exit 1
    }
    
    Write-Host "MCP n8n iniciado com sucesso!" -ForegroundColor Green
    Write-Host "Process ID: $($mcpProcess.Id)"
    
    # Aguardar mais um pouco
    Start-Sleep -Seconds 3
    
    # Verificar saida
    if (Test-Path "mcp-output.txt") {
        Write-Host ""
        Write-Host "SAIDA DO MCP:" -ForegroundColor Yellow
        Get-Content "mcp-output.txt"
    }
    
    if (Test-Path "mcp-error.txt") {
        Write-Host ""
        Write-Host "LOGS/ERROS:" -ForegroundColor Yellow
        Get-Content "mcp-error.txt"
    }
    
    # Finalizar processo
    Write-Host ""
    Write-Host "Finalizando processo MCP..." -ForegroundColor Yellow
    $mcpProcess.Kill()
    $mcpProcess.WaitForExit()
    
    Write-Host "TESTE FINALIZADO" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERRO: $_" -ForegroundColor Red
} finally {
    # Limpar arquivos temporarios
    Remove-Item "mcp-output.txt" -ErrorAction SilentlyContinue
    Remove-Item "mcp-error.txt" -ErrorAction SilentlyContinue
}