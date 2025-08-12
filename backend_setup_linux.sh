#!/usr/bin/env bash
set -euo pipefail

# Posizionati nella root del progetto (dove sta questo .sh)
cd "$(dirname "$0")"

BACKEND="backend"

if [[ ! -d "$BACKEND" ]]; then
  echo "[ERRORE] Cartella '$BACKEND' non trovata." >&2
  exit 1
fi

cd "$BACKEND"

# Trova python3
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERRORE] python3 non trovato. Installa Python 3.11+." >&2
  exit 1
fi

# Crea venv se assente
if [[ ! -f ".venv/bin/activate" ]]; then
  echo "[+] Creo virtualenv ..."
  python3 -m venv .venv
fi

# Attiva venv
# shellcheck disable=SC1091
source .venv/bin/activate

# Aggiorna pip
python -m pip install --upgrade pip

# Installa pacchetti
if [[ -f "requirements.txt" ]]; then
  echo "[+] requirements.txt rilevato: installazione pacchetti..."
  pip install -r requirements.txt
else
  echo "[+] Installo pacchetti minimi..."
  pip install fastapi "uvicorn[standard]" sqlalchemy pydantic-settings python-multipart
  pip freeze > requirements.txt
fi

# Crea .env se manca
if [[ ! -f ".env" ]]; then
  cat > .env << 'EOF'
DATABASE_URL=sqlite:///./data.db
API_PREFIX=/api
CORS_ORIGINS=["http://localhost:5173"]
EOF
  echo "[+] Creato file .env"
fi

# Cartella storage per upload
mkdir -p app/storage

echo
echo "[OK] Backend pronto."
echo " - Avvio locale (facoltativo):"
echo "     source .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo
