# Script PowerShell para executar a correção de valores no Supabase
# Este script conecta no Supabase e executa o SQL de normalização

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CORREÇÃO DE VALORES - NORMALIZAÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo SQL existe
if (-not (Test-Path "corrigir-todos-valores-centavos.sql")) {
    Write-Host "❌ Erro: Arquivo 'corrigir-todos-valores-centavos.sql' não encontrado!" -ForegroundColor Red
    Write-Host "Execute este script na raiz do projeto." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivo SQL encontrado" -ForegroundColor Green
Write-Host ""

# Instruções
Write-Host "📋 INSTRUÇÕES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abra o Supabase Dashboard no navegador" -ForegroundColor White
Write-Host "2. Vá em: SQL Editor" -ForegroundColor White
Write-Host "3. Copie e cole o conteúdo do arquivo:" -ForegroundColor White
Write-Host "   corrigir-todos-valores-centavos.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Clique em 'Run' ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host ""
Write-Host "O script irá:" -ForegroundColor Yellow
Write-Host "  ✓ Criar backups de segurança" -ForegroundColor Green
Write-Host "  ✓ Normalizar todos os valores para centavos" -ForegroundColor Green
Write-Host "  ✓ Mostrar relatório detalhado" -ForegroundColor Green
Write-Host ""

# Perguntar se deseja abrir o arquivo
$resposta = Read-Host "Deseja abrir o arquivo SQL agora? (S/N)"

if ($resposta -eq "S" -or $resposta -eq "s") {
    Write-Host ""
    Write-Host "📂 Abrindo arquivo SQL..." -ForegroundColor Cyan
    
    # Abrir o arquivo no editor padrão
    if (Get-Command "code" -ErrorAction SilentlyContinue) {
        # Se VS Code está disponível
        code "corrigir-todos-valores-centavos.sql"
        Write-Host "✅ Arquivo aberto no VS Code" -ForegroundColor Green
    } else {
        # Abrir no editor padrão do Windows
        Invoke-Item "corrigir-todos-valores-centavos.sql"
        Write-Host "✅ Arquivo aberto no editor padrão" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📚 Para mais detalhes, leia:" -ForegroundColor Yellow
Write-Host "   SOLUCAO_DEFINITIVA_VALORES.md" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

