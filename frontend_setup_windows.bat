@echo off
setlocal ENABLEDELAYEDEXPANSION

cd /d "%~dp0"

set FRONTEND=frontend

if not exist "%FRONTEND%" (
  echo [ERRORE] Cartella "%FRONTEND%" non trovata.
  exit /b 1
)

cd "%FRONTEND%"

REM === Verifica Node/NPM ===
where node >nul 2>&1
if errorlevel 1 (
  echo [ERRORE] Node.js non trovato. Installa Node 18+.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRORE] npm non trovato. Installa Node 18+.
  exit /b 1
)

REM === Se manca package.json, puoi bootstrap-pare Vite (decommenta se vuoi) ===
if not exist "package.json" (
  echo [ATTENZIONE] package.json non trovato. Creazione progetto Vite disabilitata in questo script.
  echo            Crea prima il progetto (npm create vite@latest . -- --template react-ts) e rilancia.
  exit /b 1
)

echo [+] npm install ...
npm install

REM === Crea .env.local se non esiste ===
if not exist ".env.local" (
  echo VITE_API_BASE=http://localhost:8000/api>.env.local
  echo [+] Creato .env.local
)

echo.
echo [OK] Frontend pronto.
echo - Avvio dev (facoltativo):
echo     npm run dev
echo.

endlocal
