# ====================================================================
# SCRIPT DE PARADA - SISTEMA DE WEBHOOKS QUERENHAPUQUE
# ====================================================================
# Finaliza todos os processos relacionados ao sistema de webhooks
# Execute: .\stop-webhooks.ps1
# ====================================================================

Write-Host "====================================================" -ForegroundColor Red
Write-Host "🛑 PARANDO SISTEMA DE WEBHOOKS" -ForegroundColor Red
Write-Host "====================================================" -ForegroundColor Red
Write-Host ""

# Verificar se existe arquivo com PIDs
$pidFile = "$PSScriptRoot\webhook-processes.json"

if (Test-Path $pidFile) {
    Write-Host "📄 Lendo PIDs salvos..." -ForegroundColor Yellow
    
    try {
        $pids = Get-Content $pidFile | ConvertFrom-Json
        
        Write-Host "   React PID: $($pids.React)" -ForegroundColor Gray
        Write-Host "   Ultrahook PID: $($pids.Ultrahook)" -ForegroundColor Gray
        Write-Host "   Iniciado em: $($pids.Timestamp)" -ForegroundColor Gray
        Write-Host ""
        
        # Finalizar processos
        foreach ($pidName in @("React", "Ultrahook")) {
            $pid = $pids.$pidName
            
            if ($pid) {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                
                if ($process) {
                    Write-Host "🛑 Finalizando $pidName (PID: $pid)..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force
                    Write-Host "   ✅ $pidName finalizado" -ForegroundColor Green
                } else {
                    Write-Host "   ⏭️  $pidName já estava finalizado" -ForegroundColor Gray
                }
            }
        }
        
        # Remover arquivo de PIDs
        Remove-Item $pidFile
        Write-Host ""
        Write-Host "✅ Arquivo de PIDs removido" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️  Erro ao ler arquivo de PIDs" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Arquivo de PIDs não encontrado" -ForegroundColor Yellow
    Write-Host "   Finalizando processos manualmente..." -ForegroundColor Gray
    Write-Host ""
}

# Finalizar todos os processos relacionados (fallback)
Write-Host "🔍 Procurando processos relacionados..." -ForegroundColor Yellow
Write-Host ""

# Processos Node.js rodando na porta 8086
$nodeProcesses = Get-NetTCPConnection -LocalPort 8086 -ErrorAction SilentlyContinue | 
                 Select-Object -ExpandProperty OwningProcess -Unique

if ($nodeProcesses) {
    foreach ($pid in $nodeProcesses) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "   🛑 Finalizando processo na porta 8086 (PID: $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
            Write-Host "      ✅ Finalizado" -ForegroundColor Green
        }
    }
}

# Processos Ultrahook (Ruby)
$rubyProcesses = Get-Process ruby -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*ultrahook*"
}

if ($rubyProcesses) {
    foreach ($process in $rubyProcesses) {
        Write-Host "   🛑 Finalizando Ultrahook (PID: $($process.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force
        Write-Host "      ✅ Finalizado" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "✅ SISTEMA PARADO COM SUCESSO!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Para reiniciar:" -ForegroundColor Cyan
Write-Host "   .\start-webhooks.ps1" -ForegroundColor White
Write-Host ""

