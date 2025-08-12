from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
import os


router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=schemas.ProjectOut)
def create_project(body: schemas.ProjectCreate, db: Session = Depends(get_db)):
    if db.query(models.Project).filter((models.Project.code==body.code)|(models.Project.name==body.name)).first():
        raise HTTPException(400, "Project with same code/name exists")
    p = models.Project(name=body.name, code=body.code, owner=body.owner)
    db.add(p); db.commit(); db.refresh(p)
    return p

@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    # Elimina versioni e relativi artifact
    versions = db.query(models.Version).filter_by(project_id=project_id).all()
    for v in versions:
        # copia del helper per evitare import incrociati
        links = db.query(models.VersionArtifact).filter_by(version_id=v.id).all()
        artifact_ids = [ln.artifact_id for ln in links]
        for ln in links: db.delete(ln)
        db.flush()
        for aid in artifact_ids:
            art = db.get(models.Artifact, aid)
            if not art: continue
            path, ch = art.storage_uri, art.content_hash
            db.delete(art)
            db.flush()
            others = db.query(models.Artifact).filter(models.Artifact.content_hash == ch).count()
            if others == 0 and path and os.path.exists(path):
                try: os.remove(path)
                except Exception:
                    pass
        db.delete(v)

    db.delete(p)
    db.commit()
    return {"deleted": True}

@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(project_id: int, body: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    # unicità name/code se modificati
    if body.name and body.name != p.name:
        if db.query(models.Project).filter(models.Project.name == body.name).first():
            raise HTTPException(400, "Project name already exists")
        p.name = body.name
    if body.code and body.code != p.code:
        if db.query(models.Project).filter(models.Project.code == body.code).first():
            raise HTTPException(400, "Project code already exists")
        p.code = body.code
    if body.owner is not None:
        p.owner = body.owner

    db.commit(); db.refresh(p)
    return p
