from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class ArtifactKind(str, Enum):
    project = "project"
    projectarchive = "projectarchive"
    xml = "xml"

class ProjectCreate(BaseModel):
    name: str
    code: str
    owner: str | None = None

class ProjectOut(BaseModel):
    id: int; name: str; code: str; owner: str | None; created_at: datetime
    class Config: from_attributes = True

class ProjectUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    owner: str | None = None


class VersionCreate(BaseModel):
    codesys_version: str | None = None
    notes: str | None = None
    created_by: str | None = None

class VersionOut(BaseModel):
    id: int; project_id: int; codesys_version: str | None; status: str
    notes: str | None; created_by: str | None; created_at: datetime
    class Config: from_attributes = True
