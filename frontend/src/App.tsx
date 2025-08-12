import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { api } from "./api";
import type { Project } from "./api";
import ProjectsSidebar from "./components/ProjectsSidebar";
import VersionsPage from "./pages/VersionsPage";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.listProjects().then(setProjects).catch(console.error);
  }, []);

  // Se non c'è path e ho progetti, porta al primo
  useEffect(() => {
    if (location.pathname === "/" && projects.length) {
      navigate(`/projects/${projects[0].id}`, { replace: true });
    }
  }, [projects, location.pathname, navigate]);

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2l9 4.9v9.2L12 21l-9-4.9V6.9L12 2zm0 2.2L5 7.1v7.8l7 3.8 7-3.8V7.1l-7-2.9z"/></svg>
          Codesys Versioning
        </div>
      </header>

      <aside className="sidebar">
        <div className="section-title">Progetti</div>
        <ProjectsSidebar
          projects={projects}
          onRefresh={async () => setProjects(await api.listProjects())}
        />
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<div className="panel">Seleziona un progetto dalla sidebar.</div>} />
          <Route path="/projects/:projectId" element={<VersionsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
