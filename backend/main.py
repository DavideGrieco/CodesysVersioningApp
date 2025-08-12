from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db import Base, engine
from .routers import projects, versions, artifacts

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Codesys Versioning API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix=settings.API_PREFIX)
app.include_router(versions.router, prefix=settings.API_PREFIX)
app.include_router(artifacts.router, prefix=settings.API_PREFIX)

@app.get("/healthz")
def health(): return {"ok": True}
