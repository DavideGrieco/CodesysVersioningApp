import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { Project, Version } from "./api";
import "./index.css";

type ArtifactRow = {
  artifact_id: number;
  kind: "project" | "projectarchive" | "xml";
  filename: string;
  size_bytes: number;
  uploaded_by?: string;
  uploaded_at: string;
  content_hash: string;
};

export default function App() {
  // Progetti
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Versioni
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  // Artifacts della versione selezionata
  const [files, setFiles] = useState<ArtifactRow[]>([]);

  // Form: progetto
  const [pname, setPname] = useState("");
  const [pcode, setPcode] = useState("");
  const [powner, setPowner] = useState("");

  // Form: versione
  const [ver, setVer] = useState("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  // Upload unico (aggiunge o sostituisce se lo stesso "kind" esiste)
  const [kind, setKind] = useState<"project" | "projectarchive" | "xml">("xml");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const fmtBytes = (n: number) => {
    if (!n && n !== 0) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(n) / Math.log(k)) || 0;
    return `${(n / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const attachedCount = useMemo(() => {
    const kinds = new Set(files.map(f => f.kind));
    return kinds.size; // quanti dei 3 tipi sono presenti
  }, [files]);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setVersions([]);
      setSelectedVersion(null);
      setFiles([]);
      return;
    }
    api.listVersions(selectedProject.id)
      .then((v) => {
        setVersions(v);
        if (v.length) setSelectedVersion(v[0]);
      })
      .catch(console.error);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedVersion) {
      setFiles([]);
      return;
    }
    api.listVersionArtifacts(selectedVersion.id).then(setFiles).catch(console.error);
  }, [selectedVersion]);

  // === Actions ===
  async function createProject() {
    if (!pname.trim() || !pcode.trim()) return;
    setLoading(true);
    try {
      const p = await api.createProject({ name: pname.trim(), code: pcode.trim(), owner: powner.trim() || undefined });
      setProjects(prev => [p, ...prev]);
      setPname(""); setPcode(""); setPowner("");
    } catch (e: any) {
      alert("Errore creazione progetto: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function deleteProject() {
    if (!selectedProject) return;
    if (!confirm(`Eliminare il progetto "${selectedProject.name}" con TUTTE le versioni e i file?`)) return;
    setLoading(true);
    try {
      await api.deleteProject(selectedProject.id);
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      setSelectedProject(null);
      setVersions([]);
      setSelectedVersion(null);
      setFiles([]);
    } catch (e: any) {
      alert("Errore eliminazione progetto: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function createVersion() {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const v = await api.createVersion(selectedProject.id, {
        codesys_version: ver.trim() || undefined,
        notes: notes.trim() || undefined,
        created_by: createdBy.trim() || undefined
      });
      setVersions(prev => [v, ...prev]);
      setSelectedVersion(v);
      setVer(""); setNotes("");
    } catch (e: any) {
      alert("Errore creazione versione: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function deleteVersion() {
    if (!selectedProject || !selectedVersion) return;
    if (!confirm(`Eliminare la versione "${selectedVersion.codesys_version ?? "n/d"}" con i file associati?`)) return;
    setLoading(true);
    try {
      await api.deleteVersion(selectedProject.id, selectedVersion.id);
      const vlist = await api.listVersions(selectedProject.id);
      setVersions(vlist);
      setSelectedVersion(vlist[0] ?? null);
      if (vlist[0]) {
        const data = await api.listVersionArtifacts(vlist[0].id);
        setFiles(data);
      } else {
        setFiles([]);
      }
    } catch (e: any) {
      alert("Errore eliminazione versione: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function uploadForSelectedVersion() {
    if (!selectedVersion || !file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("uploaded_by", createdBy.trim() || "user");
      fd.append("f", file);
      const res = await api.uploadVersionArtifact(selectedVersion.id, fd);
      const wasReplace = !!res?.replaced;
      setFile(null);
      const data = await api.listVersionArtifacts(selectedVersion.id);
      setFiles(data);
      alert(wasReplace ? "File sostituito." : "File aggiunto.");
    } catch (e: any) {
      alert("Errore upload: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function deleteArtifact(aid: number) {
    if (!selectedVersion) return;
    if (!confirm("Eliminare questo file dalla versione?")) return;
    setLoading(true);
    try {
      await api.deleteVersionArtifact(selectedVersion.id, aid);
      const data = await api.listVersionArtifacts(selectedVersion.id);
      setFiles(data);
    } catch (e: any) {
      alert("Errore eliminazione file: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  // accept filter per il file picker
  const accept = useMemo(() => {
    switch (kind) {
      case "project": return ".project";
      case "projectarchive": return ".projectarchive";
      case "xml": return ".xml";
      default: return "";
    }
  }, [kind]);

  return (
    <div className="app">
      <h1>Codesys Versioning</h1>

      <div className="grid">
        {/* Colonna Progetti */}
        <div className="card">
          <h2>Progetti</h2>
          <div className="row mt8">
            <input className="input" placeholder="Nome" value={pname} onChange={e=>setPname(e.target.value)} />
            <input className="input" placeholder="Codice" value={pcode} onChange={e=>setPcode(e.target.value)} />
          </div>
          <div className="row mt8">
            <input className="input" placeholder="Owner (opz.)" value={powner} onChange={e=>setPowner(e.target.value)} />
            <button className="button" disabled={loading} onClick={createProject}>Crea</button>
            <button className="button" disabled={loading || !selectedProject} onClick={deleteProject}>Elimina progetto</button>
          </div>

          <ul className="list mt16">
            {projects.map(p => (
              <li key={p.id} onClick={() => { setSelectedProject(p); setSelectedVersion(null); }}>
                <div><strong>{p.name}</strong> <span className="label">({p.code})</span></div>
                <div className="label">Owner: {p.owner ?? "-"}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonna Versioni + File */}
        <div className="card">
          <h2>
            Versioni {selectedProject ? <span className="badge">{selectedProject.name}</span> : null}
          </h2>
          {!selectedProject && <div className="label">Seleziona un progetto</div>}

          {selectedProject && (
            <>
              {/* Creazione nuova versione */}
              <div className="row mt8">
                <input className="input" placeholder="CODESYS version es. 3.5.1" value={ver} onChange={e=>setVer(e.target.value)} />
                <input className="input" placeholder="Autore" value={createdBy} onChange={e=>setCreatedBy(e.target.value)} />
              </div>
              <textarea className="input mt8" placeholder="Note" value={notes} onChange={e=>setNotes(e.target.value)} />
              <div className="row mt8">
                <button className="button" disabled={loading} onClick={createVersion}>Aggiungi versione</button>
                <button className="button" disabled={loading || !selectedVersion} onClick={deleteVersion}>Elimina versione</button>
              </div>

              {/* Elenco versioni */}
              <ul className="list mt16">
                {versions.map(v => (
                  <li key={v.id} onClick={() => setSelectedVersion(v)} style={{ border: selectedVersion?.id === v.id ? "1px solid #0d6efd" : "1px solid #eee", padding: 12 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <strong>{v.codesys_version ?? "n/d"}</strong> <span className="label">[{v.status}]</span>
                        <div className="label">Creata: {new Date(v.created_at).toLocaleString()}</div>
                        {v.notes && <div className="label">Note: {v.notes}</div>}
                      </div>
                      {selectedVersion?.id === v.id && (
                        <div className="label">File allegati: <strong>{attachedCount}/3</strong></div>
                      )}
                    </div>

                    {/* Se selezionata: mostra file e azioni */}
                    {selectedVersion?.id === v.id && (
                      <div className="mt8">
                        <div className="label">File della versione</div>
                        <ul className="list">
                          {files.length === 0 && (<li className="label">Nessun file caricato.</li>)}
                          {files.map(f => (
                            <li key={f.artifact_id} className="row" style={{ justifyContent: "space-between" }}>
                              <div>
                                <strong>{labelForKind(f.kind)}</strong> — {f.filename}{" "}
                                <span className="label">({fmtBytes(f.size_bytes)}) • SHA256: {f.content_hash.slice(0,8)}…</span>
                              </div>
                              <div className="row">
                                <a className="button" href={api.downloadVersionArtifactUrl(v.id, f.artifact_id)} target="_blank" rel="noreferrer">Download</a>
                                <button className="button" onClick={() => deleteArtifact(f.artifact_id)}>Elimina</button>
                              </div>
                            </li>
                          ))}
                        </ul>

                        {/* Upload unico: aggiunge o sostituisce se quel tipo esiste */}
                        <div className="row mt16">
                          <select className="select" value={kind} onChange={e=>setKind(e.target.value as any)}>
                            <option value="project">.project</option>
                            <option value="projectarchive">.projectarchive</option>
                            <option value="xml">.xml</option>
                          </select>
                          <input className="file" type="file" accept={accept} onChange={e=>setFile(e.target.files?.[0] ?? null)} />
                          <button className="button" disabled={loading || !file} onClick={uploadForSelectedVersion}>
                            Carica / Sostituisci
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function labelForKind(k: "project" | "projectarchive" | "xml") {
  switch (k) {
    case "project": return ".project";
    case "projectarchive": return ".projectarchive";
    case "xml": return ".xml";
    default: return k;
  }
}
