#!/usr/bin/env pwsh

# Script para deploy de Edge Functions (Windows)
# Uso: ./edge-functions.ps1

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

$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "staging" }
$FUNCTIONS_DIR = "./supabase/functions"

Write-Host "🚀 Deploy de Edge Functions - $ENVIRONMENT" -ForegroundColor Cyan

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

# 4. Listar funções existentes
Write-Host "📋 Funções existentes:" -ForegroundColor Yellow
supabase functions list --linked

# 5. Deploy de funções
if (Test-Path $FUNCTIONS_DIR) {
    $functions = Get-ChildItem -Path $FUNCTIONS_DIR -Directory
    
    if ($functions.Count -gt 0) {
        Write-Host "🔄 Iniciando deploy de $($functions.Count) funções..." -ForegroundColor Yellow
        
        foreach ($function in $functions) {
            $functionName = $function.Name
            Write-Host "  📦 Deploying: $functionName" -ForegroundColor Cyan
            
            try {
                supabase functions deploy $functionName --project-ref $env:PROJECT_REF
                Write-Host "  ✅ Deploy concluído: $functionName" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Erro no deploy: $functionName - $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "ℹ️ Nenhuma função encontrada no diretório $FUNCTIONS_DIR" -ForegroundColor Blue
    }
} else {
    Write-Host "⚠️ Diretório de funções não encontrado: $FUNCTIONS_DIR" -ForegroundColor Yellow
}

# 6. Verificar funções após deploy
Write-Host "📋 Funções após deploy:" -ForegroundColor Yellow
supabase functions list --linked

Write-Host "✅ Deploy de Edge Functions concluído" -ForegroundColor Green