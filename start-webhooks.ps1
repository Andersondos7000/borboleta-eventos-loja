# ====================================================================
# SCRIPT DE INICIALIZAÇÃO - SISTEMA DE WEBHOOKS QUERENHAPUQUE
# ====================================================================
# Versão PowerShell - Mais robusto que o .bat
# Execute: .\start-webhooks.ps1
# ====================================================================

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO SISTEMA DE WEBHOOKS - QUERENHAPUQUE" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se um comando existe
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Função para verificar se uma porta está em uso
function Test-Port {
    param($Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connections
}

# ====================================================================
# 1. VERIFICAR PRÉ-REQUISITOS
# ====================================================================

Write-Host "🔍 Verificando pré-requisitos..." -ForegroundColor Yellow
Write-Host ""

# Verificar Node.js
if (-not (Test-Command "node")) {
    Write-Host "❌ ERRO: Node.js não está instalado!" -ForegroundColor Red
    Write-Host "   Baixe em: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js detectado: $(node --version)" -ForegroundColor Green

# Verificar npm
if (-not (Test-Command "npm")) {
    Write-Host "❌ ERRO: npm não está instalado!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm detectado: $(npm --version)" -ForegroundColor Green

# Verificar Ultrahook
if (-not (Test-Command "ultrahook")) {
    Write-Host "❌ ERRO: Ultrahook não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Instale com:" -ForegroundColor Yellow
    Write-Host "   gem install ultrahook" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Se 'gem' não funcionar, instale Ruby:" -ForegroundColor Yellow
    Write-Host "   https://rubyinstaller.org/" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ Ultrahook detectado" -ForegroundColor Green

Write-Host ""

# ====================================================================
# 2. VERIFICAR PORTAS
# ====================================================================

Write-Host "🔌 Verificando portas..." -ForegroundColor Yellow

if (Test-Port 8086) {
    Write-Host "⚠️  Porta 8086 já está em uso" -ForegroundColor Yellow
    Write-Host "   A aplicação React pode já estar rodando" -ForegroundColor Gray
} else {
    Write-Host "✅ Porta 8086 disponível" -ForegroundColor Green
}

Write-Host ""

# ====================================================================
# 3. VERIFICAR SE ULTRAHOOK JÁ ESTÁ RODANDO
# ====================================================================

Write-Host "🔍 Verificando Ultrahook..." -ForegroundColor Yellow

$ultrahookProcess = Get-Process ruby -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*ultrahook*"
}

if ($ultrahookProcess) {
    Write-Host "⚠️  Ultrahook já está rodando (PID: $($ultrahookProcess.Id))" -ForegroundColor Yellow
    Write-Host "   Deseja reiniciar? (S/N): " -NoNewline -ForegroundColor Cyan
    $resposta = Read-Host
    
    if ($resposta -eq "S" -or $resposta -eq "s") {
        Write-Host "   Finalizando processo antigo..." -ForegroundColor Yellow
        Stop-Process -Id $ultrahookProcess.Id -Force
        Start-Sleep -Seconds 2
        Write-Host "   ✅ Processo finalizado" -ForegroundColor Green
    } else {
        Write-Host "   ⏭️  Mantendo processo existente" -ForegroundColor Gray
    }
}

Write-Host ""

# ====================================================================
# 4. INICIAR APLICAÇÃO REACT
# ====================================================================

Write-Host "1️⃣  Iniciando aplicação React (porta 8086)..." -ForegroundColor Cyan

$reactProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PSScriptRoot'; npm run dev"
) -PassThru -WindowStyle Normal

Write-Host "   ✅ React iniciado (PID: $($reactProcess.Id))" -ForegroundColor Green
Write-Host "   💻 Aguardando servidor subir..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host ""

# ====================================================================
# 5. INICIAR ULTRAHOOK
# ====================================================================

Write-Host "2️⃣  Iniciando Ultrahook (túnel de webhooks)..." -ForegroundColor Cyan

$ultrahookTarget = "https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/webhook-abacatepay"
$ultrahookSubdomain = "webh-dev-abacatepay"

$ultrahookProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "ultrahook $ultrahookSubdomain $ultrahookTarget"
) -PassThru -WindowStyle Normal

Write-Host "   ✅ Ultrahook iniciado (PID: $($ultrahookProcess.Id))" -ForegroundColor Green
Write-Host "   🌐 Aguardando túnel conectar..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""

# ====================================================================
# 6. TESTAR CONEXÕES
# ====================================================================

Write-Host "🧪 Testando conexões..." -ForegroundColor Yellow
Write-Host ""

# Testar React
try {
    $reactTest = Invoke-WebRequest -Uri "http://localhost:8086" -UseBasicParsing -TimeoutSec 5
    if ($reactTest.StatusCode -eq 200) {
        Write-Host "   ✅ React: Respondendo (Status 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  React: Não respondeu ainda (pode levar alguns segundos)" -ForegroundColor Yellow
}

# Testar Ultrahook (ping básico)
try {
    $ultrahookTest = Invoke-WebRequest -Uri "https://recebimento-webh-dev-abacatepay.ultrahook.com" -Method HEAD -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Ultrahook: Túnel ativo" -ForegroundColor Green
} catch {
    Write-Host "   ⏳ Ultrahook: Aguardando conexão..." -ForegroundColor Gray
}

Write-Host ""

# ====================================================================
# 7. RESUMO E INSTRUÇÕES
# ====================================================================

Write-Host "====================================================" -ForegroundColor Green
Write-Host "✅ SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 DASHBOARD ADMIN:" -ForegroundColor Cyan
Write-Host "   http://localhost:8086/admin/webhooks" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URL PÚBLICA ULTRAHOOK:" -ForegroundColor Cyan
Write-Host "   https://recebimento-webh-dev-abacatepay.ultrahook.com" -ForegroundColor White
Write-Host ""
Write-Host "🔧 CONFIGURE NO ABACATEPAY:" -ForegroundColor Cyan
Write-Host "   https://dashboard.abacatepay.com/developers/webhooks" -ForegroundColor White
Write-Host "   Endpoint ID: webh_dev_Kmj1ukdAR1WcfXHH6hDQyMdj" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   NÃO FECHE as janelas do PowerShell que foram abertas!" -ForegroundColor Yellow
Write-Host "   Fechar = Sistema para de funcionar" -ForegroundColor Yellow
Write-Host ""
Write-Host "🧪 TESTAR WEBHOOK:" -ForegroundColor Cyan
Write-Host "   .\testar-webhook.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🛑 PARAR SISTEMA:" -ForegroundColor Cyan
Write-Host "   Feche as janelas do PowerShell ou pressione Ctrl+C" -ForegroundColor White
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

# Salvar PIDs para facilitar gerenciamento
$pids = @{
    React = $reactProcess.Id
    Ultrahook = $ultrahookProcess.Id
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

$pids | ConvertTo-Json | Out-File "$PSScriptRoot\webhook-processes.json" -Encoding UTF8

Write-Host "💾 PIDs salvos em: webhook-processes.json" -ForegroundColor Gray
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

