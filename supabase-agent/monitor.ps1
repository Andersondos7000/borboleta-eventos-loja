#!/usr/bin/env pwsh

# Script de monitoramento para Supabase (Windows)
# Uso: ./monitor.ps1

# Configuração de erro
$ErrorActionPreference = "Stop"

# Verificar variáveis de ambiente
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Error "❌ SUPABASE_ACCESS_TOKEN não definido"
    exit 1
}

if (-not $env:PROJECT_REF) {
    Write-Error "❌ PROJECT_REF não definido"
    exit 1
}

# Diretório para relatórios
$reportsDir = "./reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "staging" }
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "📊 Monitoramento de Banco de Dados - $ENVIRONMENT" -ForegroundColor Cyan

# 1. Verificar CLI e token
Write-Host "🔑 Verificando autenticação..." -ForegroundColor Yellow
supabase --version
supabase whoami

# 2. Vincular projeto
Write-Host "🔗 Vinculando projeto..." -ForegroundColor Yellow
supabase link --project-ref $env:PROJECT_REF

# 3. Verificar status
Write-Host "📊 Verificando status..." -ForegroundColor Yellow
supabase status

# 4. Verificar performance
Write-Host "📈 Verificando performance..." -ForegroundColor Yellow

# Queries lentas
Write-Host "🐢 Queries lentas:" -ForegroundColor Yellow
supabase inspect db outliers --linked > "$reportsDir/outliers_$TIMESTAMP.txt"

# Tabelas inchadas
Write-Host "🎈 Tabelas inchadas:" -ForegroundColor Yellow
supabase inspect db bloat --linked > "$reportsDir/bloat_$TIMESTAMP.txt"

# Deadlocks
Write-Host "🔒 Deadlocks:" -ForegroundColor Yellow
supabase inspect db locks --linked > "$reportsDir/locks_$TIMESTAMP.txt"

# Saúde autovacuum
Write-Host "🧹 Saúde autovacuum:" -ForegroundColor Yellow
supabase inspect db vacuum-stats --linked > "$reportsDir/vacuum_$TIMESTAMP.txt"

# 5. Verificar logs
Write-Host "📜 Verificando logs..." -ForegroundColor Yellow
supabase logs --project-ref $env:PROJECT_REF --service postgres > "$reportsDir/postgres_logs_$TIMESTAMP.txt"
supabase logs --project-ref $env:PROJECT_REF --service api > "$reportsDir/api_logs_$TIMESTAMP.txt"
supabase logs --project-ref $env:PROJECT_REF --service auth > "$reportsDir/auth_logs_$TIMESTAMP.txt"

# 6. Verificar advisors de segurança
Write-Host "🔐 Verificando advisors de segurança..." -ForegroundColor Yellow
supabase inspect db advisors --linked > "$reportsDir/advisors_$TIMESTAMP.txt"

Write-Host "✅ Monitoramento concluído. Relatórios disponíveis em $reportsDir" -ForegroundColor Green