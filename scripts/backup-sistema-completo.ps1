# Script de Backup Completo do Sistema Queren
# Criado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Descrição: Backup completo incluindo código, configurações, banco de dados e documentação

param(
    [string]$BackupPath = "C:\backups\queren",
    [switch]$IncludeDatabase = $true,
    [switch]$CompressBackup = $true,
    [switch]$Verbose = $false
)

# Configurações
$ProjectPath = "C:\xampps\htdocs\queren"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "queren_backup_$Timestamp"
$FullBackupPath = Join-Path $BackupPath $BackupName

# Função para log
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $LogMessage
    Add-Content -Path (Join-Path $FullBackupPath "backup.log") -Value $LogMessage
}

# Função para criar diretório se não existir
function Ensure-Directory {
    param([string]$Path)
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Log "Diretório criado: $Path"
    }
}

# Início do backup
Write-Host "=== BACKUP COMPLETO DO SISTEMA QUEREN ===" -ForegroundColor Green
Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow
Write-Host "Destino: $FullBackupPath" -ForegroundColor Yellow

try {
    # Criar diretório de backup
    Ensure-Directory $FullBackupPath
    
    Write-Log "Iniciando backup completo do sistema"
    
    # 1. BACKUP DO CÓDIGO-FONTE
    Write-Host "\n1. Fazendo backup do código-fonte..." -ForegroundColor Cyan
    $SourceBackupPath = Join-Path $FullBackupPath "source"
    Ensure-Directory $SourceBackupPath
    
    # Copiar arquivos principais (excluindo node_modules, .git, etc.)
    $ExcludeDirs = @(
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        "coverage",
        ".nyc_output",
        "logs",
        "*.log",
        ".env.local",
        ".env.production"
    )
    
    robocopy $ProjectPath $SourceBackupPath /E /XD $ExcludeDirs /XF "*.log" "*.tmp" /R:3 /W:1 /MT:8
    Write-Log "Backup do código-fonte concluído"
    
    # 2. BACKUP DAS CONFIGURAÇÕES
    Write-Host "\n2. Fazendo backup das configurações..." -ForegroundColor Cyan
    $ConfigBackupPath = Join-Path $FullBackupPath "config"
    Ensure-Directory $ConfigBackupPath
    
    # Arquivos de configuração importantes
    $ConfigFiles = @(
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "bun.lockb",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
        "vite.config.ts",
        "tailwind.config.ts",
        "postcss.config.js",
        "eslint.config.js",
        "components.json",
        ".env.example",
        ".env.local.template",
        ".env.mcp.example",
        "docker-compose*.yml",
        "Dockerfile*",
        "mcp-config.json",
        "mcp_config.json"
    )
    
    foreach ($file in $ConfigFiles) {
        $sourcePath = Join-Path $ProjectPath $file
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $ConfigBackupPath -Force
            Write-Log "Configuração copiada: $file"
        }
    }
    
    # 3. BACKUP DA DOCUMENTAÇÃO
    Write-Host "\n3. Fazendo backup da documentação..." -ForegroundColor Cyan
    $DocsBackupPath = Join-Path $FullBackupPath "documentation"
    Ensure-Directory $DocsBackupPath
    
    # Copiar todos os arquivos .md e diretório docs
    Get-ChildItem $ProjectPath -Filter "*.md" | Copy-Item -Destination $DocsBackupPath -Force
    if (Test-Path (Join-Path $ProjectPath "docs")) {
        robocopy (Join-Path $ProjectPath "docs") (Join-Path $DocsBackupPath "docs") /E /R:3 /W:1
    }
    Write-Log "Backup da documentação concluído"
    
    # 4. BACKUP DOS SCRIPTS
    Write-Host "\n4. Fazendo backup dos scripts..." -ForegroundColor Cyan
    $ScriptsBackupPath = Join-Path $FullBackupPath "scripts"
    Ensure-Directory $ScriptsBackupPath
    
    if (Test-Path (Join-Path $ProjectPath "scripts")) {
        robocopy (Join-Path $ProjectPath "scripts") $ScriptsBackupPath /E /R:3 /W:1
        Write-Log "Backup dos scripts concluído"
    }
    
    # 5. BACKUP DO SUPABASE (configurações e migrações)
    Write-Host "\n5. Fazendo backup das configurações Supabase..." -ForegroundColor Cyan
    $SupabaseBackupPath = Join-Path $FullBackupPath "supabase"
    Ensure-Directory $SupabaseBackupPath
    
    if (Test-Path (Join-Path $ProjectPath "supabase")) {
        robocopy (Join-Path $ProjectPath "supabase") $SupabaseBackupPath /E /XD ".temp" /R:3 /W:1
        Write-Log "Backup das configurações Supabase concluído"
    }
    
    # 6. BACKUP DOS WORKFLOWS
    Write-Host "\n6. Fazendo backup dos workflows..." -ForegroundColor Cyan
    $WorkflowsBackupPath = Join-Path $FullBackupPath "workflows"
    Ensure-Directory $WorkflowsBackupPath
    
    if (Test-Path (Join-Path $ProjectPath "workflows")) {
        robocopy (Join-Path $ProjectPath "workflows") $WorkflowsBackupPath /E /R:3 /W:1
    }
    if (Test-Path (Join-Path $ProjectPath ".github")) {
        robocopy (Join-Path $ProjectPath ".github") (Join-Path $WorkflowsBackupPath "github") /E /R:3 /W:1
    }
    Write-Log "Backup dos workflows concluído"
    
    # 7. BACKUP DO BANCO DE DADOS (se solicitado)
    if ($IncludeDatabase) {
        Write-Host "\n7. Fazendo backup do banco de dados..." -ForegroundColor Cyan
        $DatabaseBackupPath = Join-Path $FullBackupPath "database"
        Ensure-Directory $DatabaseBackupPath
        
        # Copiar arquivos SQL
        Get-ChildItem $ProjectPath -Filter "*.sql" | Copy-Item -Destination $DatabaseBackupPath -Force
        
        # Tentar fazer dump do Supabase (se configurado)
        if ($env:SUPABASE_ACCESS_TOKEN -and $env:SUPABASE_URL) {
            try {
                Write-Log "Tentando fazer backup do banco Supabase..."
                # Aqui você pode adicionar comandos específicos para backup do Supabase
                # Por exemplo, usando a CLI do Supabase ou APIs
                Write-Log "Backup do banco de dados preparado (arquivos SQL copiados)"
            }
            catch {
                Write-Log "Erro ao fazer backup do banco: $($_.Exception.Message)" "ERROR"
            }
        }
        else {
            Write-Log "Variáveis de ambiente do Supabase não encontradas. Apenas arquivos SQL foram copiados." "WARN"
        }
    }
    
    # 8. CRIAR MANIFESTO DO BACKUP
    Write-Host "\n8. Criando manifesto do backup..." -ForegroundColor Cyan
    $ManifestPath = Join-Path $FullBackupPath "MANIFEST.md"
    
    $ManifestContent = @"
# Manifesto do Backup - Sistema Queren

**Data do Backup:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Versão:** $Timestamp
**Localização:** $FullBackupPath

## Conteúdo do Backup

### 1. Código-Fonte (`source/`)
- Todos os arquivos do projeto (exceto node_modules, .git, dist, build)
- Componentes React/TypeScript
- Configurações do Vite
- Estilos e assets

### 2. Configurações (`config/`)
- package.json e lock files
- Configurações TypeScript
- Configurações de build (Vite, Tailwind, PostCSS)
- Configurações Docker
- Configurações MCP

### 3. Documentação (`documentation/`)
- Todos os arquivos .md do projeto
- Diretório docs/ completo
- Guias de configuração
- Documentação técnica

### 4. Scripts (`scripts/`)
- Scripts PowerShell de automação
- Scripts de teste
- Scripts de configuração
- Scripts de deploy

### 5. Supabase (`supabase/`)
- Configurações do Supabase
- Migrações de banco
- Edge Functions
- Configurações de autenticação

### 6. Workflows (`workflows/`)
- Workflows GitHub Actions
- Workflows N8N
- Configurações de CI/CD

### 7. Banco de Dados (`database/`)
- Arquivos SQL de estrutura
- Scripts de migração
- Dados de teste

## Informações do Sistema

- **SO:** $($env:OS)
- **Usuário:** $($env:USERNAME)
- **Máquina:** $($env:COMPUTERNAME)
- **PowerShell:** $($PSVersionTable.PSVersion)

## Como Restaurar

1. Extrair o backup para um diretório limpo
2. Restaurar as configurações de ambiente (.env)
3. Instalar dependências: `npm install` ou `pnpm install`
4. Configurar Supabase com as credenciais corretas
5. Executar migrações de banco se necessário
6. Iniciar o servidor de desenvolvimento: `npm run dev`

## Verificação de Integridade

- **Total de arquivos:** $(Get-ChildItem $FullBackupPath -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count)
- **Tamanho total:** $([math]::Round((Get-ChildItem $FullBackupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)) MB

"@
    
    Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8
    Write-Log "Manifesto criado: $ManifestPath"
    
    # 9. COMPRESSÃO (se solicitada)
    if ($CompressBackup) {
        Write-Host "\n9. Comprimindo backup..." -ForegroundColor Cyan
        $ZipPath = "$FullBackupPath.zip"
        
        try {
            Compress-Archive -Path $FullBackupPath -DestinationPath $ZipPath -CompressionLevel Optimal -Force
            Write-Log "Backup comprimido: $ZipPath"
            
            # Remover diretório não comprimido
            Remove-Item $FullBackupPath -Recurse -Force
            Write-Log "Diretório temporário removido"
            
            $FinalPath = $ZipPath
        }
        catch {
            Write-Log "Erro na compressão: $($_.Exception.Message)" "ERROR"
            $FinalPath = $FullBackupPath
        }
    }
    else {
        $FinalPath = $FullBackupPath
    }
    
    # RESUMO FINAL
    Write-Host "\n=== BACKUP CONCLUÍDO COM SUCESSO ===" -ForegroundColor Green
    Write-Host "Localização: $FinalPath" -ForegroundColor Yellow
    Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow
    
    if (Test-Path $FinalPath) {
        if ($CompressBackup -and $FinalPath.EndsWith(".zip")) {
            $Size = [math]::Round((Get-Item $FinalPath).Length / 1MB, 2)
            Write-Host "Tamanho: $Size MB (comprimido)" -ForegroundColor Yellow
        }
        else {
            $Size = [math]::Round((Get-ChildItem $FinalPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
            Write-Host "Tamanho: $Size MB" -ForegroundColor Yellow
        }
    }
    
    Write-Log "Backup completo finalizado com sucesso"
    
}
catch {
    Write-Host "\n=== ERRO NO BACKUP ===" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Log "ERRO CRÍTICO: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Host "\nPressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")