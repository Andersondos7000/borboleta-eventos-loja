#!/usr/bin/env pwsh

# Script de validação para Supabase (Windows)
# Uso: ./validate.ps1

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

Write-Host "🔍 Validação Avançada" -ForegroundColor Cyan

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

# 4. Verificar diferenças
Write-Host "🔍 Verificando diferenças..." -ForegroundColor Yellow
supabase db diff --linked
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Diferenças detectadas" -ForegroundColor Yellow
}

# 5. Listar migrações
Write-Host "📋 Migrações:" -ForegroundColor Yellow
supabase migration list --linked

# 6. Verificar RLS em tabelas críticas
Write-Host "🔒 Verificando RLS..." -ForegroundColor Yellow
$criticalTables = @("customers", "orders", "payments", "tickets")

$dbUrl = (supabase status | Select-String "DB URL").ToString().Split(" ")[-1]

foreach ($table in $criticalTables) {
    $query = "SELECT relrowsecurity FROM pg_class WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')"
    $result = & psql $dbUrl -t -c $query
    $result = $result.Trim()
    
    if ($result -eq "t") {
        Write-Host "✅ RLS ativo: $table" -ForegroundColor Green
    } else {
        Write-Host "⚠️ RLS inativo: $table" -ForegroundColor Yellow
    }
}

# 7. Verificar foreign keys
Write-Host "🔗 Verificando foreign keys..." -ForegroundColor Yellow
$query = "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND NOT pg_catalog.pg_constraint_is_valid(oid)"
$fkViolations = & psql $dbUrl -t -c $query
$fkViolations = $fkViolations.Trim()

if ($fkViolations -eq "0") {
    Write-Host "✅ Foreign keys válidas" -ForegroundColor Green
} else {
    Write-Host "❌ $fkViolations foreign keys violadas" -ForegroundColor Red
}

# 8. Performance checks
Write-Host "📊 Verificando performance..." -ForegroundColor Yellow
supabase inspect db outliers --linked > "$reportsDir/outliers.txt"
supabase inspect db bloat --linked > "$reportsDir/bloat.txt"
supabase inspect db vacuum-stats --linked > "$reportsDir/vacuum.txt"

Write-Host "✅ Validação concluída" -ForegroundColor Green