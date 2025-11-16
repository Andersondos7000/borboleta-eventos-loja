@echo off
echo ====================================================
echo 🚀 INICIANDO SISTEMA DE WEBHOOKS - QUERENHAPUQUE
echo ====================================================
echo.

REM Verificar se o Ultrahook está instalado
where ultrahook >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: Ultrahook não está instalado!
    echo.
    echo 📥 Instale com: gem install ultrahook
    echo.
    pause
    exit /b 1
)

echo ✅ Ultrahook detectado
echo.

echo 1️⃣  Iniciando aplicação React (porta 8086)...
start "React App" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 3 /nobreak >nul

echo 2️⃣  Iniciando Ultrahook (túnel de webhooks)...
start "Ultrahook Tunnel" cmd /k "ultrahook webh-dev-abacatepay https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/webhook-abacatepay"
timeout /t 3 /nobreak >nul

echo.
echo ====================================================
echo ✅ SISTEMA INICIADO COM SUCESSO!
echo ====================================================
echo.
echo 📊 Dashboard Admin:
echo    http://localhost:8086/admin/webhooks
echo.
echo 🌐 URL Pública Ultrahook:
echo    https://recebimento-webh-dev-abacatepay.ultrahook.com
echo.
echo 🔧 Configure esta URL no painel AbacatePay:
echo    https://dashboard.abacatepay.com/developers/webhooks
echo.
echo ⚠️  IMPORTANTE: Mantenha as janelas abertas!
echo    - Fechar as janelas = sistema para de funcionar
echo.
echo 🧪 Teste manual:
echo    curl -X POST https://recebimento-webh-dev-abacatepay.ultrahook.com -d '{}'
echo.
echo ====================================================
pause

