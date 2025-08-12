export const API_BASE = import.meta.env.VITE_API_BASE as string;

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
export const api = {
  // Progetti
  listProjects: () => http<Project[]>("/projects"),
  createProject: (body: { name: string; code: string; owner?: string }) =>
    http<Project>("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  deleteProject: (projectId: number) =>
    http<{ deleted: true }>(`/projects/${projectId}`, { method: "DELETE" }),

  // Versioni
  listVersions: (projectId: number) =>
    http<Version[]>(`/projects/${projectId}/versions`),
  createVersion: (
    projectId: number,
    body: { codesys_version?: string; notes?: string; created_by?: string }
  ) =>
    http<Version>(`/projects/${projectId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  deleteVersion: (projectId: number, versionId: number) =>
    http<{ deleted: true }>(
      `/projects/${projectId}/versions/${versionId}`,
      { method: "DELETE" }
    ),

  // Artifacts per VERSIONE
  listVersionArtifacts: (versionId: number) =>
    http<
      Array<{
        artifact_id: number;
        kind: "project" | "projectarchive" | "xml";
        filename: string;
        size_bytes: number;
        uploaded_by?: string;
        uploaded_at: string;
        content_hash: string;
      }>
    >(`/versions/${versionId}/artifacts`),

  uploadVersionArtifact: (versionId: number, form: FormData) =>
    http<{ artifact_id: number; replaced: boolean }>(
      `/versions/${versionId}/artifacts`,
      { method: "POST", body: form }
    ),

  deleteVersionArtifact: (versionId: number, artifactId: number) =>
    http<{ deleted: true }>(
      `/versions/${versionId}/artifacts/${artifactId}`,
      { method: "DELETE" }
    ),

  downloadVersionArtifactUrl: (versionId: number, artifactId: number) =>
    `${API_BASE}/versions/${versionId}/artifacts/${artifactId}/download`,

  updateProject: (projectId: number, body: { name?: string; code?: string; owner?: string | null }) =>
  http<Project>(`/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),

};

export type Project = { id:number; name:string; code:string; owner?:string|null; created_at:string };
export type Version = { id:number; project_id:number; codesys_version?:string|null; status:string; notes?:string|null; created_by?:string|null; created_at:string };
