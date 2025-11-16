# Script PowerShell para corrigir order_items de roupas para pedidos específicos
# Uso: .\scripts\corrigir-pedidos-roupas.ps1 -CustomerExternalId "cust_bnNnB52Z5FJxtjmDQLbe5tEZ"

param(
    [string]$CustomerExternalId = "cust_bnNnB52Z5FJxtjmDQLbe5tEZ"
)

Write-Host "🚀 Iniciando correção de order_items para roupas..." -ForegroundColor Green
Write-Host "   Customer ID: $CustomerExternalId" -ForegroundColor Yellow
Write-Host ""

# Carregar variáveis de ambiente
$env:VITE_SUPABASE_URL = $env:VITE_SUPABASE_URL ?? ""
$env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY ?? ""

if (-not $env:VITE_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Erro: Variáveis de ambiente não configuradas" -ForegroundColor Red
    Write-Host "   Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    exit 1
}

# Executar o script TypeScript
Write-Host "📦 Executando script de correção..." -ForegroundColor Cyan

# Verificar se o Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Erro: Node.js não está instalado" -ForegroundColor Red
    exit 1
}

# Verificar se o ts-node está instalado
if (-not (Get-Command ts-node -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando ts-node..." -ForegroundColor Yellow
    npm install -g ts-node typescript @types/node
}

# Executar o script
$scriptPath = Join-Path $PSScriptRoot "corrigir-order-items-roupas.ts"
node --loader ts-node/esm $scriptPath $CustomerExternalId

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Correção concluída com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erro ao executar correção" -ForegroundColor Red
    exit 1
}



