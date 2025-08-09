# Script de Restauração do Sistema Queren
# Criado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Descrição: Restaura o sistema a partir de um backup completo

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [string]$RestorePath = "C:\restore\queren",
    [switch]$InstallDependencies = $true,
    [switch]$SetupEnvironment = $true,
    [switch]$StartDev = $false,
    [switch]$Force = $false
)

# Função para log
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $LogMessage
    if (Test-Path $RestorePath) {
        Add-Content -Path (Join-Path $RestorePath "restore.log") -Value $LogMessage -ErrorAction SilentlyContinue
    }
}

# Função para criar diretório se não existir
function Ensure-Directory {
    param([string]$Path)
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Log "Diretório criado: $Path"
    }
}

# Função para verificar se comando existe
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Início da restauração
Write-Host "=== RESTAURAÇÃO DO SISTEMA QUEREN ===" -ForegroundColor Green
Write-Host "Backup: $BackupPath" -ForegroundColor Yellow
Write-Host "Destino: $RestorePath" -ForegroundColor Yellow

try {
    # Verificar se o backup existe
    if (!(Test-Path $BackupPath)) {
        throw "Arquivo de backup não encontrado: $BackupPath"
    }
    
    Write-Log "Iniciando restauração do sistema"
    
    # Verificar se o destino já existe
    if ((Test-Path $RestorePath) -and !$Force) {
        $response = Read-Host "O diretório de destino já existe. Deseja continuar? (s/N)"
        if ($response -ne 's' -and $response -ne 'S') {
            Write-Host "Restauração cancelada pelo usuário." -ForegroundColor Yellow
            exit 0
        }
    }
    
    # Criar diretório de restauração
    Ensure-Directory $RestorePath
    
    # 1. EXTRAIR BACKUP
    Write-Host "\n1. Extraindo backup..." -ForegroundColor Cyan
    
    if ($BackupPath.EndsWith(".zip")) {
        try {
            Expand-Archive -Path $BackupPath -DestinationPath $RestorePath -Force
            Write-Log "Backup extraído com sucesso"
        }
        catch {
            throw "Erro ao extrair backup: $($_.Exception.Message)"
        }
    }
    else {
        # Se não for ZIP, assumir que é um diretório
        robocopy $BackupPath $RestorePath /E /R:3 /W:1
        Write-Log "Backup copiado com sucesso"
    }
    
    # Verificar estrutura extraída
    $SourcePath = Join-Path $RestorePath "source"
    if (!(Test-Path $SourcePath)) {
        throw "Estrutura de backup inválida. Diretório 'source' não encontrado."
    }
    
    # 2. RESTAURAR CÓDIGO-FONTE
    Write-Host "\n2. Configurando código-fonte..." -ForegroundColor Cyan
    
    # Mover arquivos do source para o diretório principal
    $MainProjectPath = Join-Path $RestorePath "project"
    Ensure-Directory $MainProjectPath
    
    robocopy $SourcePath $MainProjectPath /E /R:3 /W:1
    Write-Log "Código-fonte restaurado"
    
    # 3. RESTAURAR CONFIGURAÇÕES
    Write-Host "\n3. Restaurando configurações..." -ForegroundColor Cyan
    
    $ConfigPath = Join-Path $RestorePath "config"
    if (Test-Path $ConfigPath) {
        # Copiar arquivos de configuração
        Get-ChildItem $ConfigPath | ForEach-Object {
            Copy-Item $_.FullName $MainProjectPath -Force
            Write-Log "Configuração restaurada: $($_.Name)"
        }
    }
    
    # 4. CONFIGURAR AMBIENTE
    if ($SetupEnvironment) {
        Write-Host "\n4. Configurando ambiente..." -ForegroundColor Cyan
        
        # Criar .env.local a partir do template
        $EnvTemplate = Join-Path $MainProjectPath ".env.example"
        $EnvLocal = Join-Path $MainProjectPath ".env.local"
        
        if ((Test-Path $EnvTemplate) -and !(Test-Path $EnvLocal)) {
            Copy-Item $EnvTemplate $EnvLocal
            Write-Log "Arquivo .env.local criado a partir do template"
            
            Write-Host "\n⚠️  ATENÇÃO: Configure as variáveis de ambiente em:" -ForegroundColor Yellow
            Write-Host "   $EnvLocal" -ForegroundColor Yellow
            Write-Host "   Especialmente:" -ForegroundColor Yellow
            Write-Host "   - SUPABASE_URL" -ForegroundColor Yellow
            Write-Host "   - SUPABASE_ANON_KEY" -ForegroundColor Yellow
            Write-Host "   - ABACATE_PAY_TOKEN" -ForegroundColor Yellow
        }
    }
    
    # 5. RESTAURAR SUPABASE
    Write-Host "\n5. Restaurando configurações Supabase..." -ForegroundColor Cyan
    
    $SupabasePath = Join-Path $RestorePath "supabase"
    $ProjectSupabasePath = Join-Path $MainProjectPath "supabase"
    
    if (Test-Path $SupabasePath) {
        Ensure-Directory $ProjectSupabasePath
        robocopy $SupabasePath $ProjectSupabasePath /E /R:3 /W:1
        Write-Log "Configurações Supabase restauradas"
    }
    
    # 6. INSTALAR DEPENDÊNCIAS
    if ($InstallDependencies) {
        Write-Host "\n6. Instalando dependências..." -ForegroundColor Cyan
        
        Push-Location $MainProjectPath
        
        try {
            # Verificar qual gerenciador de pacotes usar
            if (Test-Path "pnpm-lock.yaml") {
                if (Test-Command "pnpm") {
                    Write-Log "Instalando dependências com pnpm..."
                    pnpm install
                }
                else {
                    Write-Log "pnpm não encontrado, usando npm..." "WARN"
                    npm install
                }
            }
            elseif (Test-Path "bun.lockb") {
                if (Test-Command "bun") {
                    Write-Log "Instalando dependências com bun..."
                    bun install
                }
                else {
                    Write-Log "bun não encontrado, usando npm..." "WARN"
                    npm install
                }
            }
            else {
                Write-Log "Instalando dependências com npm..."
                npm install
            }
            
            Write-Log "Dependências instaladas com sucesso"
        }
        catch {
            Write-Log "Erro ao instalar dependências: $($_.Exception.Message)" "ERROR"
        }
        finally {
            Pop-Location
        }
    }
    
    # 7. VERIFICAR INTEGRIDADE
    Write-Host "\n7. Verificando integridade..." -ForegroundColor Cyan
    
    $PackageJson = Join-Path $MainProjectPath "package.json"
    $ViteConfig = Join-Path $MainProjectPath "vite.config.ts"
    $TsConfig = Join-Path $MainProjectPath "tsconfig.json"
    
    $IntegrityChecks = @(
        @{ File = $PackageJson; Name = "package.json" },
        @{ File = $ViteConfig; Name = "vite.config.ts" },
        @{ File = $TsConfig; Name = "tsconfig.json" }
    )
    
    foreach ($check in $IntegrityChecks) {
        if (Test-Path $check.File) {
            Write-Log "✅ $($check.Name) encontrado"
        }
        else {
            Write-Log "❌ $($check.Name) não encontrado" "WARN"
        }
    }
    
    # 8. CRIAR MANIFESTO DE RESTAURAÇÃO
    Write-Host "\n8. Criando manifesto de restauração..." -ForegroundColor Cyan
    
    $RestoreManifest = Join-Path $RestorePath "RESTORE_MANIFEST.md"
    
    $ManifestContent = @"
# Manifesto de Restauração - Sistema Queren

**Data da Restauração:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Backup Origem:** $BackupPath
**Diretório de Restauração:** $RestorePath
**Projeto Principal:** $MainProjectPath

## Status da Restauração

- ✅ Backup extraído
- ✅ Código-fonte restaurado
- ✅ Configurações aplicadas
- $(if ($SetupEnvironment) { '✅' } else { '⏭️' }) Ambiente configurado
- ✅ Supabase restaurado
- $(if ($InstallDependencies) { '✅' } else { '⏭️' }) Dependências instaladas
- ✅ Integridade verificada

## Próximos Passos

1. **Configurar Variáveis de Ambiente**
   - Editar: `$MainProjectPath\.env.local`
   - Configurar credenciais do Supabase
   - Configurar tokens de API

2. **Testar o Sistema**
   ```powershell
   cd "$MainProjectPath"
   npm run dev
   ```

3. **Verificar Funcionalidades**
   - Autenticação
   - Integração com AbacatePay
   - Conexão com banco de dados
   - MCP Services

## Arquivos Importantes

- **Projeto:** `$MainProjectPath`
- **Configuração:** `$MainProjectPath\.env.local`
- **Supabase:** `$MainProjectPath\supabase`
- **Documentação:** `$RestorePath\documentation`
- **Scripts:** `$RestorePath\scripts`

## Logs

- **Log de Restauração:** `$RestorePath\restore.log`
- **Backup Original:** `$BackupPath`

"@
    
    Set-Content -Path $RestoreManifest -Value $ManifestContent -Encoding UTF8
    Write-Log "Manifesto de restauração criado: $RestoreManifest"
    
    # 9. INICIAR DESENVOLVIMENTO (se solicitado)
    if ($StartDev) {
        Write-Host "\n9. Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
        
        Push-Location $MainProjectPath
        
        try {
            Write-Log "Iniciando servidor de desenvolvimento..."
            
            # Verificar se .env.local está configurado
            $EnvLocal = Join-Path $MainProjectPath ".env.local"
            if (!(Test-Path $EnvLocal)) {
                Write-Host "\n⚠️  AVISO: Arquivo .env.local não encontrado!" -ForegroundColor Red
                Write-Host "   Configure as variáveis de ambiente antes de iniciar." -ForegroundColor Red
            }
            else {
                # Iniciar servidor
                if (Test-Path "pnpm-lock.yaml" -and (Test-Command "pnpm")) {
                    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$MainProjectPath'; pnpm dev"
                }
                elseif (Test-Path "bun.lockb" -and (Test-Command "bun")) {
                    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$MainProjectPath'; bun dev"
                }
                else {
                    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$MainProjectPath'; npm run dev"
                }
                
                Write-Log "Servidor de desenvolvimento iniciado em nova janela"
            }
        }
        catch {
            Write-Log "Erro ao iniciar servidor: $($_.Exception.Message)" "ERROR"
        }
        finally {
            Pop-Location
        }
    }
    
    # RESUMO FINAL
    Write-Host "\n=== RESTAURAÇÃO CONCLUÍDA COM SUCESSO ===" -ForegroundColor Green
    Write-Host "Projeto restaurado em: $MainProjectPath" -ForegroundColor Yellow
    Write-Host "Manifesto: $RestoreManifest" -ForegroundColor Yellow
    
    if (!$StartDev) {
        Write-Host "\n📋 Para iniciar o desenvolvimento:" -ForegroundColor Cyan
        Write-Host "   cd \"$MainProjectPath\"" -ForegroundColor White
        Write-Host "   npm run dev" -ForegroundColor White
    }
    
    Write-Host "\n⚠️  Lembre-se de configurar:" -ForegroundColor Yellow
    Write-Host "   - Variáveis de ambiente (.env.local)" -ForegroundColor White
    Write-Host "   - Credenciais do Supabase" -ForegroundColor White
    Write-Host "   - Tokens de API" -ForegroundColor White
    
    Write-Log "Restauração completa finalizada com sucesso"
    
}
catch {
    Write-Host "\n=== ERRO NA RESTAURAÇÃO ===" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Log "ERRO CRÍTICO: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Host "\nPressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")