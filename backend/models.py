from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .db import Base
import enum

class ArtifactKind(str, enum.Enum):
    project = "project"
    projectarchive = "projectarchive"
    xml = "xml"

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    code: Mapped[str] = mapped_column(String(100), unique=True)
    owner: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    versions: Mapped[list["Version"]] = relationship(back_populates="project", cascade="all, delete")

class VersionStatus(str, enum.Enum):
    latest = "latest"
    archived = "archived"

class Version(Base):
    __tablename__ = "versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    codesys_version: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[VersionStatus] = mapped_column(default=VersionStatus.latest)
    notes: Mapped[str | None] = mapped_column(String(1000))
    created_by: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="versions")

class Artifact(Base):
    __tablename__ = "artifacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    kind: Mapped[ArtifactKind]
    filename: Mapped[str] = mapped_column(String(255))
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    storage_uri: Mapped[str] = mapped_column(String(1024))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    uploaded_by: Mapped[str | None] = mapped_column(String(100))
    uploaded_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
