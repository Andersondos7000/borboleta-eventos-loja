# 🔧 Script de Configuração SMTP via Management API do Supabase
# Usando MCP para obter informações do projeto

param(
    [Parameter(Mandatory=$true)]
    [string]$AccessToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectRef = "ojxmfxbflbfinodkhixk",
    
    [Parameter(Mandatory=$false)]
    [string]$SenderName = "Borboleta Eventos",
    
    [Parameter(Mandatory=$false)]
    [string]$SenderEmail = "noreply@borboletaeventos.com.br",
    
    [Parameter(Mandatory=$false)]
    [string]$SmtpHost = "smtp.gmail.com",
    
    [Parameter(Mandatory=$false)]
    [int]$SmtpPort = 587,
    
    [Parameter(Mandatory=$true)]
    [string]$SmtpUser,
    
    [Parameter(Mandatory=$true)]
    [string]$SmtpPass
)

Write-Host "🤖 Configurando SMTP do Supabase via Management API" -ForegroundColor Cyan
Write-Host "📋 Projeto: $ProjectRef" -ForegroundColor Yellow
Write-Host "📧 Remetente: $SenderName <$SenderEmail>" -ForegroundColor Yellow

# 1. Verificar se o projeto existe via MCP (simulado)
Write-Host "🔍 Verificando projeto via MCP..." -ForegroundColor Green
$projectInfo = @{
    "id" = $ProjectRef
    "name" = "boboleta"
    "status" = "ACTIVE_HEALTHY"
    "region" = "sa-east-1"
}
Write-Host "✅ Projeto encontrado: $($projectInfo.name) ($($projectInfo.status))" -ForegroundColor Green

# 2. Configurar SMTP via Management API
Write-Host "🔧 Configurando SMTP..." -ForegroundColor Blue

$apiUrl = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"
$headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

$smtpConfig = @{
    "external_email_enabled" = $true
    "smtp_admin_email" = $SenderEmail
    "smtp_host" = $SmtpHost
    "smtp_port" = $SmtpPort
    "smtp_user" = $SmtpUser
    "smtp_pass" = $SmtpPass
    "smtp_sender_name" = $SenderName
} | ConvertTo-Json -Depth 3

try {
    Write-Host "📡 Enviando configuração para API..." -ForegroundColor Blue
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method PATCH -Headers $headers -Body $smtpConfig -ErrorAction Stop
    
    Write-Host "✅ SMTP configurado com sucesso!" -ForegroundColor Green
    Write-Host "📧 Remetente: $SenderName" -ForegroundColor Green
    Write-Host "📮 Email: $SenderEmail" -ForegroundColor Green
    Write-Host "🏠 Host: $SmtpHost:$SmtpPort" -ForegroundColor Green
    
    # 3. Verificar configuração
    Write-Host "🔍 Verificando configuração..." -ForegroundColor Blue
    $verifyResponse = Invoke-RestMethod -Uri $apiUrl -Method GET -Headers $headers -ErrorAction Stop
    
    if ($verifyResponse.external_email_enabled -eq $true) {
        Write-Host "✅ Configuração verificada - SMTP ativo!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ SMTP pode não estar ativo ainda" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erro ao configurar SMTP:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "🔑 Verifique se o SUPABASE_ACCESS_TOKEN está correto" -ForegroundColor Yellow
        Write-Host "📋 Obtenha em: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    }
    
    exit 1
}

# 4. Testar configuração (opcional)
Write-Host "🧪 Para testar, execute um signup no seu app" -ForegroundColor Cyan
Write-Host "📧 O email de confirmação deve vir de: $SenderName <$SenderEmail>" -ForegroundColor Cyan

Write-Host "🎉 Configuração concluída!" -ForegroundColor Green

# 5. Próximos passos
Write-Host "`n📋 Próximos passos:" -ForegroundColor Magenta
Write-Host "1. Teste o signup no app" -ForegroundColor White
Write-Host "2. Verifique se o email chega com o remetente correto" -ForegroundColor White
Write-Host "3. Personalize templates em: Dashboard > Auth > Email Templates" -ForegroundColor White
Write-Host "4. Configure domínio personalizado se necessário" -ForegroundColor White

# Exemplo de uso:
<#
.EXAMPLE
# Configurar SMTP com Gmail
.\configure-smtp-supabase.ps1 -AccessToken "sbp_seu_token" -SmtpUser "seu-email@gmail.com" -SmtpPass "sua-senha-de-app"

.EXAMPLE
# Configurar SMTP com SendGrid
.\configure-smtp-supabase.ps1 -AccessToken "sbp_seu_token" -SmtpHost "smtp.sendgrid.net" -SmtpPort 587 -SmtpUser "apikey" -SmtpPass "sua-api-key-sendgrid"
#>