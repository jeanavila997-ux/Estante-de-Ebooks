@echo off
chcp 65001 >nul
title Estante de Ebooks - Desktop + iPhone

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "dist\main\main\db\connection.js" (
  echo.
  echo  Compilando o app pela primeira vez... ^(npm run build^)
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo  [ERRO] Falha na compilacao.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  ===========================================
echo   Estante de Ebooks - Desktop + iPhone
echo  ===========================================
echo.
echo  Abrindo app de desktop...
echo  Abrindo servidor mobile na rede local...
echo.

start "Estante Desktop" "node_modules\electron\dist\electron.exe" "."
start "Estante iPhone" node "mobile\server.cjs"

echo  Ambos os processos foram iniciados.
echo  No iPhone ^(mesma rede Wi-Fi^), abra o Safari em:
echo.
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  if not defined IP set "IP=%%a"
)
set "IP=%IP: =%"
echo     http://%IP%:8080
echo.
echo  Para instalar no iPhone: Compartilhar -^> Adicionar a Tela de Inicio.
echo  Deixe esta janela aberta. Para encerrar, feche-a ou pressione Ctrl+C.
echo.
pause
