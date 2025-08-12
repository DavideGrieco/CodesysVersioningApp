import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Project } from "../api";

export default function ProjectsSidebar({
  projects,
  onRefresh,
}: {
  projects: Project[];
  onRefresh: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Calcola l'ID attivo UNA SOLA VOLTA (nessun hook nel loop)
  const activeId = useMemo(() => {
    const m = location.pathname.match(/^\/projects\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  // create form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [owner, setOwner] = useState("");

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ename, setEname] = useState("");
  const [ecode, setEcode] = useState("");
  const [eowner, setEowner] = useState("");

  const [loading, setLoading] = useState(false);

  async function createProject() {
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    try {
      await api.createProject({ name: name.trim(), code: code.trim(), owner: owner.trim() || undefined });
      setName(""); setCode(""); setOwner("");
      await onRefresh();
    } catch (e: any) { alert("Errore creazione progetto: " + (e?.message ?? e)); }
    finally { setLoading(false); }
  }

  async function deleteProject(id: number, pname: string, e?: React.MouseEvent) {
    e?.stopPropagation(); e?.preventDefault();
    if (!confirm(`Eliminare il progetto "${pname}" con tutte le versioni e i file?`)) return;
    setLoading(true);
    try {
      await api.deleteProject(id);
      await onRefresh();
      navigate("/", { replace: true });
    } catch (e: any) { alert("Errore eliminazione progetto: " + (e?.message ?? e)); }
    finally { setLoading(false); }
  }

  function startEdit(p: Project, e?: React.MouseEvent) {
    e?.stopPropagation(); e?.preventDefault();
    setEditingId(p.id);
    setEname(p.name);
    setEcode(p.code);
    setEowner(p.owner ?? "");
  }

  async function saveEdit(id: number, e?: React.MouseEvent) {
    e?.stopPropagation(); e?.preventDefault();
    setLoading(true);
    try {
      await api.updateProject(id, {
        name: ename.trim() || undefined,
        code: ecode.trim() || undefined,
        owner: eowner.trim() || null,
      });
      setEditingId(null);
      await onRefresh();
    } catch (e: any) { alert("Errore aggiornamento progetto: " + (e?.message ?? e)); }
    finally { setLoading(false); }
  }

  function cancelEdit(e?: React.MouseEvent) {
    e?.stopPropagation(); e?.preventDefault();
    setEditingId(null);
  }

  return (
    <div>
      {/* Create */}
      <div className="side-form">
        <div className="row"><input className="input" placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="row"><input className="input" placeholder="Codice" value={code} onChange={e=>setCode(e.target.value)} /></div>
        <div className="row"><input className="input" placeholder="Owner (opz.)" value={owner} onChange={e=>setOwner(e.target.value)} /></div>
        <div className="row"><button className="button" disabled={loading} onClick={createProject}>Crea</button></div>
      </div>

      <div className="hr"></div>

      {/* List */}
      <div className="project-list">
        {projects.map(p => {
          const isActive = activeId === p.id;
          const isEditing = editingId === p.id;

          return (
            <div
              key={p.id}
              className={`project-item ${isActive ? "active" : ""}`}
              onClick={() => navigate(`/projects/${p.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>
                  {p.name} <span className="meta">({p.code})</span>
                </div>
                <div className="meta">Owner: {p.owner ?? "-"}</div>
              </div>

              {!isEditing && (
                <div className="project-actions">
                  {/* edit */}
                  <button className="icon-btn" title="Modifica progetto" onClick={(e) => startEdit(p, e)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#9cc0ff">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  {/* delete */}
                  <button className="icon-btn" title="Elimina progetto" onClick={(e) => deleteProject(p.id, p.name, e)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff9ca0">
                      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/>
                    </svg>
                  </button>
                </div>
              )}

              {isEditing && (
                <div style={{ width: "100%", marginTop: 8 }}>
                  <div className="edit-row">
                    <input className="input" placeholder="Nome" value={ename} onChange={e=>setEname(e.target.value)} />
                    <input className="input" placeholder="Codice" value={ecode} onChange={e=>setEcode(e.target.value)} />
                    <input className="input edit-row-full" placeholder="Owner (opz.)" value={eowner} onChange={e=>setEowner(e.target.value)} />
                  </div>
                  <div className="row" style={{ marginTop: 6, justifyContent: "flex-end", gap: 6 }}>
                    <button className="icon-btn" title="Annulla" onClick={cancelEdit}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffb4b4">
                        <path d="M18.3 5.71 12 12.01l-6.29-6.3-1.42 1.42L10.59 13.4l-6.3 6.29 1.42 1.42L12 14.83l6.29 6.29 1.42-1.42-6.3-6.29 6.3-6.29z"/>
                      </svg>
                    </button>
                    <button className="icon-btn" title="Salva" onClick={(e) => saveEdit(p.id, e)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#9cf0b3">
                        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {projects.length === 0 && <div className="meta">Nessun progetto ancora presente.</div>}
      </div>
    </div>
  );
}
