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
