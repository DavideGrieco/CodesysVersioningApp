cd /home/dave/CodesysVersioningApp/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn[standard] sqlalchemy pydantic-settings python-multipart
pip freeze > requirements.txt
