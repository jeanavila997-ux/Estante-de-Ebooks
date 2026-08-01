@echo off
chcp 65001 >nul
title Estante de Ebooks - versao iPhone
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
)

node "mobile\server.cjs"
echo.
echo  O servidor foi encerrado.
pause
