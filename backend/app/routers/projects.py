from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas

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
