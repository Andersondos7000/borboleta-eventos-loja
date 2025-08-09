# Script de Verificacao de Integridade do Backup
# Sistema Queren - Backup Integrity Checker

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [switch]$Detailed = $false
)

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Test-Component {
    param(
        [string]$Path,
        [string]$Name,
        [bool]$Required = $true
    )
    
    $exists = Test-Path $Path
    $status = if ($exists) { "OK" } else { if ($Required) { "ERRO" } else { "AVISO" } }
    $color = if ($exists) { "Green" } else { if ($Required) { "Red" } else { "Yellow" } }
    
    Write-Status "[$status] $Name" $color
    
    return @{
        Name = $Name
        Exists = $exists
        Required = $Required
    }
}

Write-Host "=== VERIFICACAO DE INTEGRIDADE DO BACKUP ===" -ForegroundColor Cyan
Write-Host "Backup: $BackupPath" -ForegroundColor Yellow

try {
    if (!(Test-Path $BackupPath)) {
        throw "Arquivo de backup nao encontrado: $BackupPath"
    }
    
    Write-Status "Iniciando verificacao..."
    $results = @()
    
    # Extrair ZIP temporariamente
    if ($BackupPath.EndsWith(".zip")) {
        Write-Status "Extraindo backup ZIP..." "Cyan"
        
        $tempPath = Join-Path $env:TEMP "backup_check_$(Get-Date -Format 'yyyyMMddHHmmss')"
        New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
        
        Expand-Archive -Path $BackupPath -DestinationPath $tempPath -Force
        
        # Encontrar o diretório raiz do backup (pode estar em um subdiretório)
        $backupSubDir = Get-ChildItem $tempPath -Directory | Where-Object { $_.Name -like "*backup*" } | Select-Object -First 1
        if ($backupSubDir) {
            $backupRoot = $backupSubDir.FullName
        } else {
            $backupRoot = $tempPath
        }
    }
    else {
        $backupRoot = $BackupPath
    }
    
    Write-Host "`n1. Verificando estrutura principal..." -ForegroundColor Cyan
    
    # Componentes principais
    $results += Test-Component (Join-Path $backupRoot "source") "Codigo-fonte" $true
    $results += Test-Component (Join-Path $backupRoot "config") "Configuracoes" $true
    $results += Test-Component (Join-Path $backupRoot "documentation") "Documentacao" $true
    $results += Test-Component (Join-Path $backupRoot "MANIFEST.md") "Manifesto" $true
    
    Write-Host "`n2. Verificando codigo-fonte..." -ForegroundColor Cyan
    
    $sourcePath = Join-Path $backupRoot "source"
    if (Test-Path $sourcePath) {
        $results += Test-Component (Join-Path $sourcePath "src") "Diretorio src" $true
        $results += Test-Component (Join-Path $sourcePath "public") "Diretorio public" $true
        $results += Test-Component (Join-Path $sourcePath "package.json") "package.json" $true
    }
    
    Write-Host "`n3. Verificando configuracoes..." -ForegroundColor Cyan
    
    $configPath = Join-Path $backupRoot "config"
    if (Test-Path $configPath) {
        $results += Test-Component (Join-Path $configPath "package.json") "Config package.json" $true
        $results += Test-Component (Join-Path $configPath "vite.config.ts") "Config vite" $true
    }
    
    Write-Host "`n4. Estatisticas..." -ForegroundColor Cyan
    
    $totalFiles = (Get-ChildItem $backupRoot -Recurse -File | Measure-Object).Count
    $totalSize = [math]::Round((Get-ChildItem $backupRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    
    Write-Status "Total de arquivos: $totalFiles" "Cyan"
    Write-Status "Tamanho total: $totalSize MB" "Cyan"
    
    Write-Host "`n=== RESUMO ===" -ForegroundColor Green
    
    $totalChecks = $results.Count
    $passedChecks = ($results | Where-Object { $_.Exists }).Count
    $requiredChecks = ($results | Where-Object { $_.Required }).Count
    $passedRequired = ($results | Where-Object { $_.Required -and $_.Exists }).Count
    
    Write-Status "Total de verificacoes: $totalChecks"
    Write-Status "Verificacoes aprovadas: $passedChecks" "Green"
    Write-Status "Componentes obrigatorios: $requiredChecks"
    Write-Status "Obrigatorios aprovados: $passedRequired" "Green"
    
    $requiredPercentage = if ($requiredChecks -gt 0) { [math]::Round(($passedRequired / $requiredChecks) * 100, 1) } else { 100 }
    
    Write-Status "Componentes criticos: $requiredPercentage%" "Cyan"
    
    if ($requiredPercentage -eq 100) {
        Write-Host "`nBACKUP INTEGRO - Todos os componentes criticos presentes" -ForegroundColor Green
    }
    elseif ($requiredPercentage -ge 80) {
        Write-Host "`nBACKUP PARCIALMENTE INTEGRO" -ForegroundColor Yellow
    }
    else {
        Write-Host "`nBACKUP COMPROMETIDO" -ForegroundColor Red
    }
    
    # Componentes ausentes
    $missingRequired = $results | Where-Object { $_.Required -and !$_.Exists }
    if ($missingRequired.Count -gt 0) {
        Write-Host "`nComponentes criticos ausentes:" -ForegroundColor Red
        foreach ($missing in $missingRequired) {
            Write-Host "  - $($missing.Name)" -ForegroundColor Red
        }
    }
    
    Write-Status "Verificacao concluida"
    
}
catch {
    Write-Host "`nERRO: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    # Limpar arquivos temporarios
    if ($tempPath -and (Test-Path $tempPath)) {
        Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`nPressione Enter para continuar..." -ForegroundColor Gray
Read-Host