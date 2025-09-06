# Configuração
$PROJECT_REF = if ($env:PROJECT_REF) { $env:PROJECT_REF } else { "" }
$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "staging" }
$DRY_RUN = if ($env:DRY_RUN) { $env:DRY_RUN } else { "false" }

# Validações
if ([string]::IsNullOrEmpty($env:SUPABASE_ACCESS_TOKEN)) {
    Write-Host "❌ Token não definido"
    exit 1
}

if ([string]::IsNullOrEmpty($PROJECT_REF)) {
    Write-Host "❌ PROJECT_REF não definido"
    exit 1
}

Write-Host "🤖 Agente Supabase Deploy - $ENVIRONMENT"

# 1. Verificar CLI e token
supabase --version
supabase whoami

# 2. Vincular projeto
supabase link --project-ref $PROJECT_REF

# 3. Verificar status
supabase status

# 4. Verificar diferenças
Write-Host "🔍 Verificando diff..."
try {
    supabase db diff --linked
} catch {
    Write-Host "⚠️ Diferenças detectadas"
}

# 5. Aplicar migrações
Write-Host "📋 Migrações:"
supabase migration list --linked

if ($DRY_RUN -eq "false") {
    Write-Host "🔄 Aplicando migrações..."
    supabase db push --linked
    
    # Atualizar local após push
    supabase db pull --linked
}

# 6. Gerar tipos
Write-Host "📄 Gerando tipos..."
if (-not (Test-Path -Path "src")) {
    New-Item -ItemType Directory -Path "src" | Out-Null
}
supabase gen types typescript --linked > src/database.types.ts

# 7. Testes
Write-Host "🧪 Executando testes..."
supabase db lint --linked
supabase test db --linked

Write-Host "✅ Deploy concluído!"