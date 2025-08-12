import { useEffect, useState } from "react";
import { api } from "./api";
import type { Project, Version } from "./api";

import "./index.css";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  // forms
  const [pname, setPname] = useState(""); const [pcode, setPcode] = useState(""); const [powner, setPowner] = useState("");
  const [ver, setVer] = useState(""); const [notes, setNotes] = useState(""); const [createdBy, setCreatedBy] = useState("");
  const [kind, setKind] = useState<"project"|"projectarchive"|"xml">("xml"); const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.listProjects().then(setProjects).catch(console.error); }, []);
  useEffect(() => { if (selected) api.listVersions(selected.id).then(setVersions); }, [selected]);

  async function createProject() {
    if (!pname || !pcode) return;
    setLoading(true);
    try {
      const p = await api.createProject({ name: pname, code: pcode, owner: powner || undefined });
      setProjects(prev => [p, ...prev]);
      setPname(""); setPcode(""); setPowner("");
    } finally { setLoading(false); }
  }

  async function createVersion() {
    if (!selected) return;
    setLoading(true);
    try {
      const v = await api.createVersion(selected.id, { codesys_version: ver || undefined, notes: notes || undefined, created_by: createdBy || undefined });
      setVersions(prev => [v, ...prev]);
      setVer(""); setNotes(""); setCreatedBy("");
    } finally { setLoading(false); }
  }

  async function upload() {
    if (!selected || !file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("uploaded_by", createdBy || "user");
      fd.append("f", file);
      const r = await api.uploadArtifact(selected.id, fd);
      alert(`Caricato! artifact_id=${r.artifact_id}\nSHA256=${r.content_hash}`);
      setFile(null);
    } finally { setLoading(false); }
  }

  return (
    <div className="app">
      <h1>Codesys Versioning</h1>
      <div className="grid">

        <div className="card">
          <h2>Progetti</h2>
          <div className="row mt8">
            <input className="input" placeholder="Nome" value={pname} onChange={e=>setPname(e.target.value)} />
            <input className="input" placeholder="Codice" value={pcode} onChange={e=>setPcode(e.target.value)} />
          </div>
          <div className="row mt8">
            <input className="input" placeholder="Owner (opz.)" value={powner} onChange={e=>setPowner(e.target.value)} />
            <button className="button" disabled={loading} onClick={createProject}>Crea</button>
          </div>

          <ul className="list mt16">
            {projects.map(p => (
              <li key={p.id} onClick={()=>setSelected(p)}>
                <div><strong>{p.name}</strong> <span className="label">({p.code})</span></div>
                <div className="label">Owner: {p.owner ?? "-"}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Versioni {selected ? <span className="badge">{selected.name}</span> : null}</h2>
          {!selected && <div className="label">Seleziona un progetto</div>}

          {selected && (
            <>
              <div className="row mt8">
                <input className="input" placeholder="CODESYS version es. 3.5.19.30" value={ver} onChange={e=>setVer(e.target.value)} />
                <input className="input" placeholder="Autore" value={createdBy} onChange={e=>setCreatedBy(e.target.value)} />
              </div>
              <textarea className="input mt8" placeholder="Note" value={notes} onChange={e=>setNotes(e.target.value)} />
              <div className="row mt8">
                <button className="button" disabled={loading} onClick={createVersion}>Aggiungi versione</button>
              </div>

              <div className="row mt16">
                <select className="select" value={kind} onChange={e=>setKind(e.target.value as any)}>
                  <option value="project">.project</option>
                  <option value="projectarchive">.projectarchive</option>
                  <option value="xml">.xml</option>
                </select>
                <input className="file" type="file" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
                <button className="button" disabled={loading || !file} onClick={upload}>Upload file</button>
              </div>

              <ul className="list mt16">
                {versions.map(v => (
                  <li key={v.id}>
                    <div className="row" style={{justifyContent:"space-between"}}>
                      <div>
                        <strong>{v.codesys_version ?? "n/d"}</strong> <span className="label">[{v.status}]</span>
                        <div className="label">Creata: {new Date(v.created_at).toLocaleString()}</div>
                        {v.notes && <div className="label">Note: {v.notes}</div>}
                      </div>
                    </div>
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
