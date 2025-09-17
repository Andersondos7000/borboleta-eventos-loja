# Script para aplicar migration de permissoes de usuario
# Executa a migration que configura permissoes para admin, certificados e validados removerem usuarios

Write-Host "Aplicando Migration de Permissoes de Usuario..." -ForegroundColor Cyan
Write-Host "" 

# Verificar se Supabase CLI esta instalado
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI nao encontrado. Instale com: npm install -g supabase" -ForegroundColor Red
    exit 1
}

# Verificar se esta logado
try {
    $loginStatus = supabase projects list 2>&1
    if ($loginStatus -match "Not logged in") {
        Write-Host "Nao esta logado no Supabase. Execute: supabase login" -ForegroundColor Red
        exit 1
    }
    Write-Host "Autenticado no Supabase" -ForegroundColor Green
} catch {
    Write-Host "Erro ao verificar login. Execute: supabase login" -ForegroundColor Red
    exit 1
}

# Verificar se migration existe
$migrationFile = "supabase\migrations\20250105000002_setup_user_deletion_permissions.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "Arquivo de migration nao encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Migration encontrada: $migrationFile" -ForegroundColor Green
Write-Host ""

# Aplicar migration
Write-Host "Aplicando migration no banco de dados..." -ForegroundColor Yellow
try {
    # Primeiro, fazer push das migrations
    Write-Host "Fazendo push das migrations..." -ForegroundColor Blue
    supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migration aplicada com sucesso!" -ForegroundColor Green
        Write-Host ""
        
        # Verificar se fotosartdesign@gmail.com foi definido como admin
        Write-Host "Verificando status do admin..." -ForegroundColor Blue
        
        # Criar script SQL temporario para verificacao
        $verifyScript = @'
SELECT 
    ''Verificacao de Permissoes'' as titulo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = ''fotosartdesign@gmail.com'' AND role = ''admin'') 
        THEN ''fotosartdesign@gmail.com e ADMIN''
        ELSE ''fotosartdesign@gmail.com NAO e admin''
    END as status_admin,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = ''can_delete_users'')
        THEN ''Funcao can_delete_users criada''
        ELSE ''Funcao can_delete_users nao encontrada''
    END as status_funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = ''delete_user_complete'')
        THEN ''Funcao delete_user_complete criada''
        ELSE ''Funcao delete_user_complete nao encontrada''
    END as status_delete_funcao;
'@
        
        $verifyScript | Out-File -FilePath "temp_verify.sql" -Encoding UTF8
        
        Write-Host "Executando verificacao..." -ForegroundColor Blue
        supabase db query --file temp_verify.sql
        
        # Limpar arquivo temporario
        Remove-Item "temp_verify.sql" -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "CONFIGURACAO CONCLUIDA!" -ForegroundColor Green
        Write-Host ""
        Write-Host "RESUMO DAS PERMISSOES CONFIGURADAS:" -ForegroundColor Cyan
        Write-Host "   - Admin: Pode remover qualquer usuario" -ForegroundColor White
        Write-Host "   - Certificados: Podem remover outros usuarios" -ForegroundColor White
        Write-Host "   - Validados: Podem remover outros usuarios" -ForegroundColor White
        Write-Host "   - fotosartdesign@gmail.com: Definido como ADMIN" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "FUNCOES DISPONIVEIS:" -ForegroundColor Cyan
        Write-Host "   - can_delete_users(user_id): Verifica permissoes" -ForegroundColor White
        Write-Host "   - delete_user_complete(user_id): Remove usuario completamente" -ForegroundColor White
        Write-Host "   - list_users_for_management(): Lista usuarios (so para privilegiados)" -ForegroundColor White
        Write-Host ""
        Write-Host "EXEMPLO DE USO NO CODIGO:" -ForegroundColor Cyan
        Write-Host "   SELECT delete_user_complete('user-uuid-here');" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "Erro ao aplicar migration" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Erro durante aplicacao da migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verificar se ha outras migrations pendentes
Write-Host "Verificando outras migrations pendentes..." -ForegroundColor Blue
try {
    $migrationStatus = supabase migration list
    Write-Host $migrationStatus
} catch {
    Write-Host "Nao foi possivel verificar status das migrations" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Script concluido com sucesso!" -ForegroundColor Green
Write-Host "Para mais informacoes, consulte a documentacao em doc/" -ForegroundColor Blue