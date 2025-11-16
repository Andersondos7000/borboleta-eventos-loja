@echo off
echo ====================================================
echo 🧪 TESTE DE WEBHOOK - ABACATEPAY
echo ====================================================
echo.

REM Verificar se o curl está disponível
where curl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: curl não está instalado!
    echo.
    echo Por favor, instale o curl ou use Git Bash
    pause
    exit /b 1
)

echo 📡 Enviando webhook de teste...
echo.
echo URL: https://recebimento-webh-dev-abacatepay.ultrahook.com
echo.

curl -X POST https://recebimento-webh-dev-abacatepay.ultrahook.com ^
  -H "Content-Type: application/json" ^
  -d "{\"event\":\"billing.paid\",\"data\":{\"pixQrCode\":{\"id\":\"test_%date:~-4%%time:~0,2%%time:~3,2%%time:~6,2%\",\"status\":\"paid\",\"amount\":1000,\"external_reference\":\"test-order-id\"}}}"

echo.
echo.
echo ====================================================
echo 📊 Verificar Resultado:
echo ====================================================
echo.
echo 1. Abra o dashboard: http://localhost:8086/admin/webhooks
echo 2. Clique em "Atualizar"
echo 3. O webhook de teste deve aparecer na lista
echo.
echo Se NÃO aparecer, verifique:
echo    - Ultrahook está rodando?
echo    - Função Edge está deployada?
echo    - Tabela webhooks existe no Supabase?
echo.
echo Veja o guia completo em: DIAGNOSTICO-WEBHOOK-ABACATEPAY.md
echo.
pause

