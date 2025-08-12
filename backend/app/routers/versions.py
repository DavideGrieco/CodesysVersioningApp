from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/projects/{project_id}/versions", tags=["versions"])

@router.post("", response_model=schemas.VersionOut)
def create_version(project_id: int, body: schemas.VersionCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    latest = db.query(models.Version).filter_by(project_id=project_id, status=models.VersionStatus.latest).first()
    if latest: latest.status = models.VersionStatus.archived
    v = models.Version(project_id=project_id, codesys_version=body.codesys_version,
                       notes=body.notes, created_by=body.created_by)
    db.add(v); db.commit(); db.refresh(v)
    return v

@router.get("", response_model=list[schemas.VersionOut])
def list_versions(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Version).filter_by(project_id=project_id).order_by(models.Version.created_at.desc()).all()

import os
from .. import models

def _delete_version_payload(db: Session, version_id: int):
    links = db.query(models.VersionArtifact).filter_by(version_id=version_id).all()
    artifact_ids = [ln.artifact_id for ln in links]
    for ln in links: db.delete(ln)
    db.flush()
    for aid in artifact_ids:
        art = db.get(models.Artifact, aid)
        if not art: 
            continue
        path, ch = art.storage_uri, art.content_hash
        db.delete(art)
        db.flush()
        others = db.query(models.Artifact).filter(models.Artifact.content_hash == ch).count()
        if others == 0 and path and os.path.exists(path):
            try: os.remove(path)
            except Exception:
                pass

@router.delete("/{version_id}")
def delete_version(project_id: int, version_id: int, db: Session = Depends(get_db)):
    v = db.get(models.Version, version_id)
    if not v or v.project_id != project_id:
        raise HTTPException(404, "Version not found")

    was_latest = (v.status == models.VersionStatus.latest)
    _delete_version_payload(db, version_id)
    db.delete(v)
    db.commit()

    # Se era la latest, promuovi la più recente rimasta
    if was_latest:
        remaining = db.query(models.Version)\
                      .filter_by(project_id=project_id)\
                      .order_by(models.Version.created_at.desc()).all()
        if remaining:
            for i, rv in enumerate(remaining):
                rv.status = models.VersionStatus.latest if i == 0 else models.VersionStatus.archived
            db.commit()

    return {"deleted": True}
