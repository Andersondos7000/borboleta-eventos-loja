# Script para implementar políticas RLS (Row Level Security) para tabelas críticas no Supabase

# Definir cores para saída
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

# Função para exibir mensagens de status
function Write-Status {
    param (
        [string]$Message,
        [string]$Status,
        [string]$Color = $Green
    )
    Write-Host "[$($Color)$($Status)$($Reset)] $Message"
}

# Função para verificar variáveis de ambiente
function Test-EnvVar {
    param (
        [string]$Name,
        [switch]$Required
    )
    
    $value = [Environment]::GetEnvironmentVariable($Name, "Process")
    
    if ([string]::IsNullOrEmpty($value)) {
        if ($Required) {
            Write-Status "Variável $Name não definida" "ERRO" $Red
            return $false
        } else {
            Write-Status "Variável $Name não definida" "AVISO" $Yellow
            return $false
        }
    } else {
        $maskedValue = if ($Name -eq "SUPABASE_ACCESS_TOKEN") { $value.Substring(0, 4) + "..." + $value.Substring($value.Length - 4) } else { $value }
        Write-Status "Variável $Name = $maskedValue" "OK"
        return $true
    }
}

# Função para confirmar ação em produção
function Confirm-ProductionAction {
    param (
        [string]$Action
    )
    
    if ($env:ENVIRONMENT -eq "production") {
        Write-Host "`n⚠️ ATENÇÃO: Você está prestes a $Action no ambiente de PRODUÇÃO!" -ForegroundColor Red
        Write-Host "Esta ação pode afetar dados reais e usuários em produção." -ForegroundColor Yellow
        
        $confirmation = Read-Host "Tem certeza que deseja continuar? (S/N)"
        
        if ($confirmation -ne "S") {
            Write-Host "Operação cancelada pelo usuário." -ForegroundColor Yellow
            return $false
        }
    }
    
    return $true
}

Write-Host "🔒 Implementação de Políticas RLS - Supabase" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Configuração
$env:ENVIRONMENT = if ([string]::IsNullOrEmpty($env:ENVIRONMENT)) { "staging" } else { $env:ENVIRONMENT }
$env:DRY_RUN = if ([string]::IsNullOrEmpty($env:DRY_RUN)) { "false" } else { $env:DRY_RUN }

# 1. Verificar variáveis de ambiente
Write-Host "`n📋 Verificando variáveis de ambiente..." -ForegroundColor Cyan

$tokenOk = Test-EnvVar -Name "SUPABASE_ACCESS_TOKEN" -Required
$projectRefOk = Test-EnvVar -Name "PROJECT_REF" -Required
Test-EnvVar -Name "ENVIRONMENT"
Test-EnvVar -Name "DRY_RUN"

if (-not ($tokenOk -and $projectRefOk)) {
    Write-Host "`n❌ Operação falhou: Variáveis de ambiente obrigatórias não definidas" -ForegroundColor Red
    Write-Host "Configure as variáveis de ambiente necessárias e tente novamente:" -ForegroundColor Yellow
    Write-Host "  $env:USERPROFILE\.supabase\access-token" -ForegroundColor Yellow
    Write-Host "  \$env:PROJECT_REF = 'seu_project_ref'" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar CLI do Supabase
Write-Host "`n📋 Verificando CLI do Supabase..." -ForegroundColor Cyan

try {
    $supabaseVersion = supabase --version
    Write-Status "Supabase CLI $supabaseVersion" "OK"
} catch {
    Write-Status "Supabase CLI não encontrado" "ERRO" $Red
    Write-Host "Instale a CLI do Supabase: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# 3. Verificar autenticação
Write-Host "`n📋 Verificando autenticação..." -ForegroundColor Cyan

try {
    $whoami = supabase whoami
    if ($whoami -match "You are authenticated as") {
        Write-Status "Autenticado com sucesso" "OK"
    } else {
        Write-Status "Falha na autenticação" "ERRO" $Red
        exit 1
    }
} catch {
    Write-Status "Falha na autenticação" "ERRO" $Red
    Write-Host "Verifique seu token de acesso e tente novamente" -ForegroundColor Yellow
    exit 1
}

# 4. Vincular projeto
Write-Host "`n📋 Vinculando projeto..." -ForegroundColor Cyan

try {
    supabase link --project-ref $env:PROJECT_REF
    Write-Status "Projeto vinculado com sucesso" "OK"
} catch {
    Write-Status "Falha ao vincular projeto" "ERRO" $Red
    Write-Host "Verifique a referência do projeto e tente novamente" -ForegroundColor Yellow
    exit 1
}

# 5. Verificar status
Write-Host "`n📋 Verificando status do projeto..." -ForegroundColor Cyan

try {
    $status = supabase status
    Write-Status "Status obtido com sucesso" "OK"
    Write-Host $status
    
    # Extrair URL do banco de dados
    $dbUrl = ($status | Select-String -Pattern "DB URL: (.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    
    if (-not $dbUrl) {
        Write-Status "URL do banco de dados não encontrada" "ERRO" $Red
        exit 1
    }
} catch {
    Write-Status "Falha ao obter status" "ERRO" $Red
    exit 1
}

# 6. Verificar tabelas críticas
Write-Host "`n📋 Verificando tabelas críticas..." -ForegroundColor Cyan

$criticalTables = @("customers", "orders", "payments", "tickets")
$existingTables = @()

try {
    foreach ($table in $criticalTables) {
        $query = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');"
        $exists = psql "$dbUrl" -t -c "$query" | ForEach-Object { $_.Trim() }
        
        if ($exists -eq "t") {
            Write-Status "Tabela encontrada: $table" "OK"
            $existingTables += $table
        } else {
            Write-Status "Tabela não encontrada: $table" "AVISO" $Yellow
        }
    }
    
    if ($existingTables.Count -eq 0) {
        Write-Status "Nenhuma tabela crítica encontrada" "ERRO" $Red
        Write-Host "Verifique se as tabelas foram criadas corretamente" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Status "Falha ao verificar tabelas" "ERRO" $Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 7. Verificar RLS atual
Write-Host "`n📋 Verificando RLS atual..." -ForegroundColor Cyan

$tablesWithoutRLS = @()

try {
    foreach ($table in $existingTables) {
        $query = @"
        SELECT relrowsecurity FROM pg_class 
        WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
"@
        
        $rlsEnabled = psql "$dbUrl" -t -c "$query" | ForEach-Object { $_.Trim() }
        
        if ($rlsEnabled -eq "t") {
            Write-Status "RLS já ativo: $table" "OK"
        } else {
            Write-Status "RLS inativo: $table" "AVISO" $Yellow
            $tablesWithoutRLS += $table
        }
    }
} catch {
    Write-Status "Falha ao verificar RLS" "ERRO" $Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 8. Confirmar implementação de RLS
if ($tablesWithoutRLS.Count -gt 0) {
    Write-Host "`n📋 Tabelas sem RLS: $($tablesWithoutRLS -join ", ")" -ForegroundColor Cyan
    
    if (-not (Confirm-ProductionAction "implementar RLS")) {
        exit 0
    }
    
    if ($env:DRY_RUN -eq "true") {
        Write-Host "`n🔍 Modo de simulação (DRY_RUN=true)" -ForegroundColor Yellow
        Write-Host "As seguintes alterações seriam aplicadas:" -ForegroundColor Yellow
        
        foreach ($table in $tablesWithoutRLS) {
            Write-Host "  - Ativar RLS na tabela $table" -ForegroundColor Yellow
            Write-Host "  - Criar políticas para $table" -ForegroundColor Yellow
        }
        
        Write-Host "`n✅ Simulação concluída. Defina DRY_RUN=false para aplicar as alterações." -ForegroundColor Green
        exit 0
    }
    
    # 9. Implementar RLS
    Write-Host "`n📋 Implementando RLS..." -ForegroundColor Cyan
    
    # Criar migração para RLS
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $migrationName = "implement_rls_policies_$timestamp"
    
    $migrationSql = @"
-- Implementação de políticas RLS para tabelas críticas

"@
    
    foreach ($table in $tablesWithoutRLS) {
        $migrationSql += @"
-- Ativar RLS na tabela $table
ALTER TABLE public.$table ENABLE ROW LEVEL SECURITY;

-- Política para administradores (acesso total)
CREATE POLICY "Administradores têm acesso total a $table" ON public.$table
    USING (auth.uid() IN (SELECT user_id FROM public.administrators))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.administrators));

"@
        
        # Adicionar políticas específicas por tabela
        switch ($table) {
            "customers" {
                $migrationSql += @"
-- Política para usuários verem apenas seus próprios dados
CREATE POLICY "Usuários podem ver apenas seus próprios dados" ON public.customers
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para usuários atualizarem apenas seus próprios dados
CREATE POLICY "Usuários podem atualizar apenas seus próprios dados" ON public.customers
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

"@
            }
            "orders" {
                $migrationSql += @"
-- Política para usuários verem apenas seus próprios pedidos
CREATE POLICY "Usuários podem ver apenas seus próprios pedidos" ON public.orders
    FOR SELECT
    USING (auth.uid() = customer_id);

-- Política para usuários criarem seus próprios pedidos
CREATE POLICY "Usuários podem criar seus próprios pedidos" ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

"@
            }
            "payments" {
                $migrationSql += @"
-- Política para usuários verem apenas seus próprios pagamentos
CREATE POLICY "Usuários podem ver apenas seus próprios pagamentos" ON public.payments
    FOR SELECT
    USING (auth.uid() IN (SELECT customer_id FROM public.orders WHERE id = order_id));

"@
            }
            "tickets" {
                $migrationSql += @"
-- Política para usuários verem apenas seus próprios ingressos
CREATE POLICY "Usuários podem ver apenas seus próprios ingressos" ON public.tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para usuários atualizarem apenas seus próprios ingressos
CREATE POLICY "Usuários podem atualizar apenas seus próprios ingressos" ON public.tickets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

"@
            }
        }
    }
    
    try {
        # Criar diretório de migrações se não existir
        $migrationsDir = "./supabase/migrations"
        if (-not (Test-Path $migrationsDir)) {
            New-Item -ItemType Directory -Path $migrationsDir -Force | Out-Null
        }
        
        # Salvar migração em arquivo
        $migrationFile = "$migrationsDir/$timestamp" + "_$migrationName.sql"
        Set-Content -Path $migrationFile -Value $migrationSql
        
        Write-Status "Migração criada: $migrationFile" "OK"
        
        # Aplicar migração
        Write-Host "`n📋 Aplicando migração..." -ForegroundColor Cyan
        supabase db push --linked
        
        Write-Status "Migração aplicada com sucesso" "OK"
    } catch {
        Write-Status "Falha ao aplicar migração" "ERRO" $Red
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n✅ Todas as tabelas críticas já têm RLS ativado." -ForegroundColor Green
}

# 10. Verificar políticas RLS
Write-Host "`n📋 Verificando políticas RLS..." -ForegroundColor Cyan

try {
    foreach ($table in $existingTables) {
        $query = @"
        SELECT polname, polpermissive, polroles, polcmd, polqual, polwithcheck
        FROM pg_policy
        WHERE polrelid = 'public.$table'::regclass;
"@
        
        $policies = psql "$dbUrl" -c "$query"
        
        Write-Host "Políticas para $table:" -ForegroundColor Cyan
        Write-Host $policies
    }
    
    Write-Status "Verificação de políticas concluída" "OK"
} catch {
    Write-Status "Falha ao verificar políticas" "AVISO" $Yellow
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Resumo
Write-Host "`n✅ Implementação de RLS concluída com sucesso!" -ForegroundColor Green

if ($tablesWithoutRLS.Count -gt 0) {
    Write-Host "RLS foi ativado para as seguintes tabelas: $($tablesWithoutRLS -join ", ")" -ForegroundColor Green
} else {
    Write-Host "Todas as tabelas críticas já tinham RLS ativado." -ForegroundColor Green
}

Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute ./validate.ps1 para validar as políticas RLS" -ForegroundColor Cyan
Write-Host "2. Execute ./monitor.ps1 para monitorar a saúde do banco de dados" -ForegroundColor Cyan
Write-Host "3. Verifique os logs de acesso para garantir que as políticas estão funcionando corretamente" -ForegroundColor Cyan