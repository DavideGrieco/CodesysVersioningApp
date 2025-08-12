#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

FRONTEND="frontend"

if [[ ! -d "$FRONTEND" ]]; then
  echo "[ERRORE] Cartella '$FRONTEND' non trovata." >&2
  exit 1
fi

cd "$FRONTEND"

# Verifica Node/NPM
if ! command -v node >/dev/null 2>&1; then
  echo "[ERRORE] Node.js non trovato. Installa Node 18+." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERRORE] npm non trovato. Installa Node 18+." >&2
  exit 1
fi

# Se manca package.json, puoi bootstrap-pare Vite manualmente
if [[ ! -f "package.json" ]]; then
  echo "[ATTENZIONE] package.json non trovato."
  echo "            Crea prima il progetto (npm create vite@latest . -- --template react-ts) e rilancia."
  exit 1
fi

echo "[+] npm install ..."
npm install

# Crea .env.local se manca
if [[ ! -f ".env.local" ]]; then
  cat > .env.local << 'EOF'
VITE_API_BASE=http://localhost:8000/api
EOF
  echo "[+] Creato .env.local"
fi

echo
echo "[OK] Frontend pronto."
echo " - Avvio dev (facoltativo): npm run dev"
echo
