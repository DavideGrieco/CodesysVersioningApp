@echo off
setlocal ENABLEDELAYEDEXPANSION

REM === Posizionati nella root del progetto (dove sta questo .bat) ===
cd /d "%~dp0"

REM === Cartella backend ===
set BACKEND=backend

if not exist "%BACKEND%" (
  echo [ERRORE] Cartella "%BACKEND%" non trovata. Crea la struttura /backend e riprova.
  exit /b 1
)

cd "%BACKEND%"

REM === Trova Python ===
where python >nul 2>&1
if errorlevel 1 (
  echo [ERRORE] Python non trovato nel PATH. Installa Python 3.11+ e riprova.
  exit /b 1
)

REM === Crea venv se non esiste ===
if not exist ".venv\Scripts\activate.bat" (
  echo [+] Creo virtualenv ...
  python -m venv .venv
)

REM === Attiva venv ===
call ".venv\Scripts\activate.bat"
if errorlevel 1 (
  echo [ERRORE] Impossibile attivare la virtualenv.
  exit /b 1
)

REM === Aggiorna pip ===
python -m pip install --upgrade pip

REM === Installa pacchetti (se c'e' requirements.txt lo usa, altrimenti installa il set minimo e lo genera) ===
if exist requirements.txt (
  echo [+] requirements.txt rilevato: installazione pacchetti...
  pip install -r requirements.txt
) else (
  echo [+] Installo pacchetti minimi...
  pip install fastapi "uvicorn[standard]" sqlalchemy pydantic-settings python-multipart
  pip freeze > requirements.txt
)

REM === Crea .env se non esiste (imposta SQLite locale) ===
if not exist ".env" (
  echo DATABASE_URL=sqlite:///./data.db>.env
  echo API_PREFIX=/api>>.env
  echo CORS_ORIGINS=["http://localhost:5173"]>>.env
  echo [+] Creato file .env
)

REM === Crea cartella storage per gli upload se non esiste ===
if not exist "app\storage" (
  mkdir "app\storage"
)

echo.
echo [OK] Backend pronto.
echo - Avvio locale (facoltativo):
echo     .venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
echo.

endlocal
