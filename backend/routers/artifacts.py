import hashlib, os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models
from ..models import ArtifactKind

router = APIRouter(prefix="/projects/{project_id}/artifacts", tags=["artifacts"])

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

@router.post("")
async def upload_artifact(
    project_id: int,
    kind: ArtifactKind = Form(...),
    uploaded_by: str | None = Form(None),
    f: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not db.query(models.Project).get(project_id):
        raise HTTPException(404, "Project not found")

    content = await f.read()
    sha = hashlib.sha256(content).hexdigest()
    sub = os.path.join(STORAGE_DIR, sha[:2]); os.makedirs(sub, exist_ok=True)
    path = os.path.join(sub, sha)
    if not os.path.exists(path):
        with open(path, "wb") as out: out.write(content)

    art = models.Artifact(
        project_id=project_id, kind=kind, filename=f.filename,
        content_hash=sha, storage_uri=path, size_bytes=len(content),
        uploaded_by=uploaded_by,
    )
    db.add(art); db.commit()
    return {"artifact_id": art.id, "content_hash": sha, "stored": path}
