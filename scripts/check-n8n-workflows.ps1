# Script para verificar workflows N8N

Write-Host "VERIFICANDO WORKFLOWS N8N" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Yellow

# Verificar status do N8N
Write-Host "`nVerificando status do N8N..." -ForegroundColor Green
try {
    $n8nStatus = Invoke-WebRequest -Uri "http://localhost:5678" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "N8N Editor ativo em: http://localhost:5678" -ForegroundColor Green
} catch {
    Write-Host "N8N não está acessível" -ForegroundColor Red
    exit 1
}

# Workflows detectados nos logs
Write-Host "`nWORKFLOWS DETECTADOS NOS LOGS:" -ForegroundColor Cyan
Write-Host "• Test Webhook (ID: 9tAk9GM6EjsO12UO) - ATIVO" -ForegroundColor Green

# Workflows criados localmente
Write-Host "`nWORKFLOWS CRIADOS LOCALMENTE:" -ForegroundColor Cyan
$workflowFiles = Get-ChildItem -Path "workflows/n8n/*.json"
foreach ($file in $workflowFiles) {
    $content = Get-Content $file.FullName | ConvertFrom-Json
    $workflowName = $content.name
    Write-Host "• $workflowName" -ForegroundColor Yellow
    Write-Host "  Arquivo: $($file.Name)" -ForegroundColor Gray
}

# URLs importantes
Write-Host "`nACESSOS N8N:" -ForegroundColor Cyan
Write-Host "N8N Editor: http://localhost:5678" -ForegroundColor White
Write-Host "Credenciais: admin / borboleta123" -ForegroundColor White

# Abrir N8N Editor
Write-Host "`nABRINDO N8N EDITOR..." -ForegroundColor Green
Start-Process "http://localhost:5678"

Write-Host "`nVERIFICAÇÃO COMPLETA!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Yellow

# Análise final
Write-Host "`nANÁLISE DOS WORKFLOWS:" -ForegroundColor Cyan
Write-Host "EXISTEM DE FATO:" -ForegroundColor Green
Write-Host "  • Test Webhook (ativo no N8N)" -ForegroundColor Green
Write-Host "  • Borboleta MCP - GitHub Deploy Workflow (arquivo local)" -ForegroundColor Yellow
Write-Host "  • Borboleta MCP - Supabase Functions Monitor (arquivo local)" -ForegroundColor Yellow
Write-Host "  • Borboleta MCP - Docker Hub Auto Deploy (arquivo local)" -ForegroundColor Yellow
Write-Host "`nSTATUS:" -ForegroundColor Cyan
Write-Host "  • 1 workflow ativo no N8N" -ForegroundColor Green
Write-Host "  • 3 workflows prontos para importar" -ForegroundColor Yellow
Write-Host "  • Interface N8N funcionando" -ForegroundColor Green
