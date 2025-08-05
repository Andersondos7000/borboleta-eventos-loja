# Script PowerShell para configurar o banco de dados Supabase
Write-Host "🔧 Configurando banco de dados Supabase..." -ForegroundColor Green

# Verificar se supabase CLI está instalado
try {
    $null = supabase --version
    Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g supabase
}

# Navegar para o diretório do projeto
Set-Location "c:\xampp\htdocs\borboleta-eventos-loja"

# Verificar se está logado no Supabase
try {
    Write-Host "🔐 Verificando autenticação Supabase..." -ForegroundColor Yellow
    $null = supabase projects list 2>$null
    Write-Host "✅ Autenticado no Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ Não autenticado no Supabase. Execute: supabase login" -ForegroundColor Red
    exit 1
}

# Aplicar migrações
Write-Host "📊 Aplicando migrações do banco de dados..." -ForegroundColor Yellow
try {
    supabase db push
    Write-Host "✅ Migrações aplicadas com sucesso" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao aplicar migrações: $($_.Exception.Message)" -ForegroundColor Red
}

# Deploy das Edge Functions
Write-Host "🚀 Fazendo deploy das Edge Functions..." -ForegroundColor Yellow
try {
    supabase functions deploy create-abacate-payment
    Write-Host "✅ Edge Function deployed com sucesso" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao fazer deploy da Edge Function: $($_.Exception.Message)" -ForegroundColor Red
}

# Configurar variáveis de ambiente das Edge Functions
Write-Host "⚙️ Configurando variáveis de ambiente..." -ForegroundColor Yellow
try {
    supabase secrets set ABACATE_PAY_API_KEY=abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n
    Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao configurar variáveis: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host "🔍 Para testar: acesse /checkout na aplicação" -ForegroundColor Cyan
Write-Host "📋 Para ver logs das functions:" -ForegroundColor Cyan
Write-Host "    supabase functions logs create-abacate-payment" -ForegroundColor White
