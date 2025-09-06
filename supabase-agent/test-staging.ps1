# Script para testar o ambiente de staging do Supabase

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

Write-Host "🧪 Teste de Ambiente Supabase - Staging" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 1. Verificar variáveis de ambiente
Write-Host "`n📋 Verificando variáveis de ambiente..." -ForegroundColor Cyan

$tokenOk = Test-EnvVar -Name "SUPABASE_ACCESS_TOKEN" -Required
$projectRefOk = Test-EnvVar -Name "PROJECT_REF" -Required
Test-EnvVar -Name "ENVIRONMENT"
Test-EnvVar -Name "DRY_RUN"

if (-not ($tokenOk -and $projectRefOk)) {
    Write-Host "`n❌ Teste falhou: Variáveis de ambiente obrigatórias não definidas" -ForegroundColor Red
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
} catch {
    Write-Status "Falha ao obter status" "ERRO" $Red
    exit 1
}

# 6. Verificar diferenças
Write-Host "`n📋 Verificando diferenças..." -ForegroundColor Cyan

try {
    $diff = supabase db diff --linked
    if ($diff) {
        Write-Status "Diferenças encontradas" "INFO" $Yellow
        Write-Host $diff
    } else {
        Write-Status "Nenhuma diferença encontrada" "OK"
    }
} catch {
    Write-Status "Falha ao verificar diferenças" "ERRO" $Red
    exit 1
}

# 7. Listar migrações
Write-Host "`n📋 Listando migrações..." -ForegroundColor Cyan

try {
    $migrations = supabase migration list --linked
    Write-Status "Migrações listadas com sucesso" "OK"
    Write-Host $migrations
} catch {
    Write-Status "Falha ao listar migrações" "ERRO" $Red
    exit 1
}

# 8. Testar conexão com o banco de dados
Write-Host "`n📋 Testando conexão com o banco de dados..." -ForegroundColor Cyan

try {
    $dbUrl = ($status | Select-String -Pattern "DB URL: (.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    
    if ($dbUrl) {
        $testQuery = "SELECT current_database() as db_name, current_user as user_name;"
        $result = psql "$dbUrl" -c "$testQuery" -t
        
        if ($result) {
            Write-Status "Conexão com o banco de dados bem-sucedida" "OK"
            Write-Host $result
        } else {
            Write-Status "Falha ao executar consulta no banco de dados" "ERRO" $Red
            exit 1
        }
    } else {
        Write-Status "URL do banco de dados não encontrada" "ERRO" $Red
        exit 1
    }
} catch {
    Write-Status "Falha ao conectar ao banco de dados" "ERRO" $Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Resumo do teste
Write-Host "`n✅ Teste de ambiente concluído com sucesso!" -ForegroundColor Green
Write-Host "O ambiente de staging está configurado corretamente e pronto para uso." -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute ./deploy.ps1 para aplicar migrações" -ForegroundColor Cyan
Write-Host "2. Execute ./validate.ps1 para validação avançada" -ForegroundColor Cyan
Write-Host "3. Execute ./monitor.ps1 para monitorar a saúde do banco de dados" -ForegroundColor Cyan