# Configuração
$PROJECT_REF = if ($env:PROJECT_REF) { $env:PROJECT_REF } else { "" }
$BACKUP_DIR = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "backups" }

# Validações
if ([string]::IsNullOrEmpty($env:SUPABASE_ACCESS_TOKEN)) {
    Write-Host "❌ Token não definido"
    exit 1
}

if ([string]::IsNullOrEmpty($PROJECT_REF)) {
    Write-Host "❌ PROJECT_REF não definido"
    exit 1
}

Write-Host "📦 Criando backup do banco de dados"

# Criar diretório de backup
if (-not (Test-Path -Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# Timestamp para o nome do arquivo
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\backup_$TIMESTAMP.sql"

# Vincular projeto
Write-Host "🔗 Vinculando projeto..."
supabase link --project-ref $PROJECT_REF

# Verificar status
Write-Host "📊 Verificando status..."
supabase status

# Criar backup do schema
Write-Host "📄 Criando backup do schema..."
supabase db dump --linked > "$BACKUP_DIR\schema_$TIMESTAMP.sql"

# Criar backup de tabelas críticas
Write-Host "📄 Criando backup de tabelas críticas..."
$CRITICAL_TABLES = @("customers", "orders", "payments", "tickets")

foreach ($table in $CRITICAL_TABLES) {
    Write-Host "  - Tabela: $table"
    $TABLE_BACKUP_FILE = "$BACKUP_DIR\${table}_$TIMESTAMP.csv"
    
    # Exportar dados da tabela para CSV
    $DB_URL = (supabase status | Select-String -Pattern 'DB URL' | ForEach-Object { $_.ToString().Split(' ')[2] })
    
    if (-not [string]::IsNullOrEmpty($DB_URL)) {
        try {
            # Usar psql para exportar dados para CSV
            $EXPORT_COMMAND = "\COPY (SELECT * FROM public.$table) TO '$TABLE_BACKUP_FILE' WITH CSV HEADER"
            psql "$DB_URL" -c "$EXPORT_COMMAND"
            Write-Host "    ✅ Backup criado: $TABLE_BACKUP_FILE"
        } catch {
            Write-Host "    ⚠️ Erro ao criar backup da tabela $table: $_"
        }
    } else {
        Write-Host "    ⚠️ Não foi possível obter a URL do banco de dados"
    }
}

Write-Host "✅ Backup concluído. Arquivos disponíveis em $BACKUP_DIR"