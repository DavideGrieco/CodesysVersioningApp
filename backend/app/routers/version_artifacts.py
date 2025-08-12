import hashlib, os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from ..db import get_db
from .. import models
from ..models import ArtifactKind, Version, Artifact, VersionArtifact

router = APIRouter(prefix="/versions/{version_id}/artifacts", tags=["version_artifacts"])

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

def _ensure_version(db: Session, version_id: int) -> models.Version:
    v = db.get(Version, version_id)
    if not v:
        raise HTTPException(404, "Version not found")
    return v

@router.get("")
def list_version_artifacts(version_id: int, db: Session = Depends(get_db)):
    _ensure_version(db, version_id)
    q = (
        db.query(VersionArtifact, Artifact)
        .join(Artifact, VersionArtifact.artifact_id == Artifact.id)
        .filter(VersionArtifact.version_id == version_id)
        .all()
    )
    return [
        {
            "va_version_id": va.version_id,
            "artifact_id": a.id,
            "kind": a.kind,
            "filename": a.filename,
            "size_bytes": a.size_bytes,
            "uploaded_by": a.uploaded_by,
            "uploaded_at": a.uploaded_at,
            "content_hash": a.content_hash,
        } for va, a in q
    ]

@router.post("")
async def upload_or_replace(
    version_id: int,
    kind: ArtifactKind = Form(...),
    uploaded_by: str | None = Form(None),
    f: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    v = _ensure_version(db, version_id)

    # cerca se esiste già un artifact di questo tipo per questa versione
    existing = (
        db.query(Artifact)
        .join(VersionArtifact, VersionArtifact.artifact_id == Artifact.id)
        .filter(and_(VersionArtifact.version_id == version_id, Artifact.kind == kind))
        .first()
    )

    content = await f.read()
    sha = hashlib.sha256(content).hexdigest()
    sub = os.path.join(STORAGE_DIR, sha[:2]); os.makedirs(sub, exist_ok=True)
    path = os.path.join(sub, sha)
    if not os.path.exists(path):
        with open(path, "wb") as out: out.write(content)

    if existing:
        # sostituzione: aggiorna record esistente
        existing.filename = f.filename
        existing.content_hash = sha
        existing.storage_uri = path
        existing.size_bytes = len(content)
        existing.uploaded_by = uploaded_by
        db.commit()
        return {"artifact_id": existing.id, "replaced": True}

    # creazione nuovo artifact associato alla versione
    art = Artifact(
        project_id=v.project_id,
        kind=kind,
        filename=f.filename,
        content_hash=sha,
        storage_uri=path,
        size_bytes=len(content),
        uploaded_by=uploaded_by,
    )
    db.add(art); db.flush()

    link = VersionArtifact(version_id=version_id, artifact_id=art.id)
    db.add(link); db.commit()
    return {"artifact_id": art.id, "replaced": False}

@router.get("/{artifact_id}/download")
def download(version_id: int, artifact_id: int, db: Session = Depends(get_db)):
    _ensure_version(db, version_id)
    art = db.get(Artifact, artifact_id)
    if not art:
        raise HTTPException(404, "Artifact not found")
    # opzionale: verifica che l'artifact appartenga alla versione
    link = db.query(VersionArtifact).filter_by(version_id=version_id, artifact_id=artifact_id).first()
    if not link:
        raise HTTPException(404, "Artifact not linked to this version")
    if not os.path.exists(art.storage_uri):
        raise HTTPException(410, "Stored file missing on disk")
    return FileResponse(
        art.storage_uri,
        media_type="application/octet-stream",
        filename=art.filename,
    )

@router.delete("/{artifact_id}")
def delete_artifact(version_id: int, artifact_id: int, db: Session = Depends(get_db)):
    _ensure_version(db, version_id)
    link = db.query(VersionArtifact).filter_by(version_id=version_id, artifact_id=artifact_id).first()
    if not link:
        raise HTTPException(404, "Artifact not linked to this version")
    art = db.get(Artifact, artifact_id)
    db.delete(link)
    db.delete(art)
    db.commit()
    # opzionale: rimuovere anche il file fisico (ATTENZIONE: se fai deduplica per hash, il file potrebbe essere condiviso)
    try:
        if art and os.path.exists(art.storage_uri):
            os.remove(art.storage_uri)
    except Exception:
        pass
    return {"deleted": True}
