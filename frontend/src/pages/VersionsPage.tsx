import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { Version } from "../api";

type ArtifactRow = {
  artifact_id: number;
  kind: "project" | "projectarchive" | "xml";
  filename: string;
  size_bytes: number;
  uploaded_by?: string;
  uploaded_at: string;
  content_hash: string;
};

export default function VersionsPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState<Version | null>(null);
  const [files, setFiles] = useState<ArtifactRow[]>([]);

  // form versione
  const [ver, setVer] = useState("");
  const [notes, setNotes] = useState("");
  const [author, setAuthor] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pid) return;
    api.listVersions(pid)
      .then(v => {
        setVersions(v);
        setSelected(v[0] ?? null);
      })
      .catch(console.error);
  }, [pid]);

  useEffect(() => {
    if (!selected) { setFiles([]); return; }
    api.listVersionArtifacts(selected.id).then(setFiles).catch(console.error);
  }, [selected]);

  const attachedCount = useMemo(() => new Set(files.map(f=>f.kind)).size, [files]);

  async function createVersion() {
    if (!pid) return;
    setLoading(true);
    try {
      const v = await api.createVersion(pid, {
        codesys_version: ver.trim() || undefined,
        notes: notes.trim() || undefined,
        created_by: author.trim() || undefined
      });
      setVersions(prev => [v, ...prev]);
      setSelected(v);
      setVer(""); setNotes("");
    } catch (e: any) {
      alert("Errore creazione versione: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function deleteVersion() {
    if (!pid || !selected) return;
    if (!confirm(`Eliminare la versione "${selected.codesys_version ?? "n/d"}" con i file associati?`)) return;
    setLoading(true);
    try {
      await api.deleteVersion(pid, selected.id);
      const vlist = await api.listVersions(pid);
      setVersions(vlist);
      setSelected(vlist[0] ?? null);
      if (vlist[0]) setFiles(await api.listVersionArtifacts(vlist[0].id));
      else setFiles([]);
    } catch (e: any) {
      alert("Errore eliminazione versione: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  return (
    <div className="split">
      {/* Colonna sinistra: elenco versioni + crea/elimina */}
      <div className="panel">
        <div className="row" style={{justifyContent:"space-between"}}>
          <div style={{fontWeight:800}}>Versioni</div>
          <div className="badge">{versions.length}</div>
        </div>

        <div className="row" style={{marginTop: 10}}>
          <input className="input" placeholder="CODESYS es. 3.5.1" value={ver} onChange={e=>setVer(e.target.value)} />
        </div>
        <div className="row" style={{marginTop: 8}}>
          <input className="input" placeholder="Autore" value={author} onChange={e=>setAuthor(e.target.value)} />
        </div>
        <div className="row" style={{marginTop: 8}}>
          <textarea className="input" placeholder="Note" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>
        <div className="row" style={{marginTop: 8}}>
          <button className="button" disabled={loading} onClick={createVersion}>Crea versione</button>
          <button className="button ghost" disabled={loading || !selected} onClick={deleteVersion}>Elimina versione</button>
        </div>

        <div className="hr"></div>

        <ul className="list">
          {versions.map(v => (
            <li key={v.id} className={`version-item ${selected?.id === v.id ? "active" : ""}`} onClick={()=>setSelected(v)} style={{cursor:"pointer"}}>
              <div style={{fontWeight:700}}>{v.codesys_version ?? "n/d"} <span className="badge">{v.status}</span></div>
              <div className="meta">Creata: {new Date(v.created_at).toLocaleString()}</div>
              {v.notes && <div className="meta">Note: {v.notes}</div>}
            </li>
          ))}
          {versions.length === 0 && <div className="meta">Nessuna versione presente.</div>}
        </ul>
      </div>

      {/* Colonna destra: dettaglio versione selezionata */}
      <div className="panel">
        {!selected && <div className="meta">Seleziona una versione per vedere i dettagli.</div>}
        {selected && (
          <>
            <div className="row" style={{justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:800, fontSize:18}}>v — {selected.codesys_version ?? "n/d"}</div>
                <div className="meta">Creato da {selected.created_by ?? "-"} • {new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <div className="badge">File: {attachedCount}/3</div>
            </div>

            <div className="hr"></div>
            <ArtifactPanel
              versionId={selected.id}
              files={files}
              onChanged={async () => setFiles(await api.listVersionArtifacts(selected.id))}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Artifact Panel con segmented selector ---------- */

function ArtifactPanel({
  versionId,
  files,
  onChanged,
}: {
  versionId: number;
  files: ArtifactRow[];
  onChanged: () => void | Promise<void>;
}) {
  // tab/segment selezionato
  const [tab, setTab] = useState<"project"|"projectarchive"|"xml">("xml");
  const [uploader, setUploader] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const current = useMemo(() => files.find(f => f.kind === tab), [files, tab]);

  const accept = useMemo(() => {
    switch (tab) {
      case "project": return ".project";
      case "projectarchive": return ".projectarchive";
      case "xml": return ".xml";
      default: return "";
    }
  }, [tab]);

  function fmtBytes(n: number) {
    const k=1024, sizes=["B","KB","MB","GB","TB"], i=Math.floor(Math.log(n)/Math.log(k))||0;
    return `${(n/Math.pow(k,i)).toFixed(i===0?0:1)} ${sizes[i]}`;
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("kind", tab); // usa la tab come tipo
      fd.append("uploaded_by", uploader.trim() || "user");
      fd.append("f", file);
      const res = await api.uploadVersionArtifact(versionId, fd);
      setFile(null);
      await onChanged();
      alert(res.replaced ? "File sostituito" : "File caricato");
    } catch (e: any) {
      alert("Errore upload: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  async function del(aid: number) {
    if (!confirm("Eliminare questo file?")) return;
    setLoading(true);
    try {
      await api.deleteVersionArtifact(versionId, aid);
      await onChanged();
    } catch (e: any) {
      alert("Errore eliminazione: " + (e?.message ?? e));
    } finally { setLoading(false); }
  }

  return (
    <div>
      {/* Header segmentato */}
      <div className="row" style={{justifyContent:"center", marginBottom: 12}}>
        <div className="segmented">
          <button className={`seg-btn ${tab === "project" ? "active" : ""}`} onClick={() => setTab("project")}>.project</button>
          <button className={`seg-btn ${tab === "projectarchive" ? "active" : ""}`} onClick={() => setTab("projectarchive")}>.projectarchive</button>
          <button className={`seg-btn ${tab === "xml" ? "active" : ""}`} onClick={() => setTab("xml")}>.xml</button>
        </div>
      </div>

      {/* Pannello del tipo selezionato */}
      {!current && (
        <div className="panel" style={{background:"transparent", border:"1px dashed #1d2a42"}}>
          <div style={{fontWeight:700, marginBottom:6}}>Nessun file {labelForKind(tab)} caricato.</div>
          <div className="meta">Carica un file {labelForKind(tab)} per questa versione.</div>
        </div>
      )}

      {current && (
        <div className="artifact-line" style={{marginBottom: 12}}>
          <div>
            <div style={{fontWeight:700}}>{labelForKind(current.kind)} — {current.filename}</div>
            <div className="meta">
              {fmtBytes(current.size_bytes)} • SHA256 {current.content_hash.slice(0,8)}… • Caricato {new Date(current.uploaded_at).toLocaleString()}
            </div>
          </div>
          <div className="row">
            <a className="button ghost" href={api.downloadVersionArtifactUrl(versionId, current.artifact_id)} target="_blank" rel="noreferrer">Download</a>
            <button className="button danger" onClick={()=>del(current.artifact_id)}>Elimina</button>
          </div>
        </div>
      )}

      {/* Uploader unificato per la tab attiva */}
      <div className="row">
        <input className="input" placeholder="Uploader (opz.)" value={uploader} onChange={e=>setUploader(e.target.value)} />
      </div>
      <div className="row" style={{marginTop:8}}>
        <input className="file" type="file" accept={accept} onChange={e=>setFile(e.target.files?.[0] ?? null)} />
        <button className="button" disabled={loading || !file} onClick={upload}>
          Carica / Sostituisci {labelForKind(tab)}
        </button>
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
