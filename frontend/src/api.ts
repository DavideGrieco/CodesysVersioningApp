export const API_BASE = import.meta.env.VITE_API_BASE as string;

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
export const api = {
  listProjects: () => http<Project[]>("/projects"),
  
  createProject: (body: {name: string; code: string; owner?: string}) =>
    http<Project>("/projects", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)}),
  
  listVersions: (pid: number) => http<Version[]>(`/projects/${pid}/versions`),
  
  createVersion: (pid: number, body: {codesys_version?: string; notes?: string; created_by?: string}) =>
    http<Version>(`/projects/${pid}/versions`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)}),
  
  uploadArtifact: (pid: number, form: FormData) =>
    http<{artifact_id:number;content_hash:string;stored:string}>(`/projects/${pid}/artifacts`, { method:"POST", body: form }),
  
  listVersionArtifacts: (vid: number) =>
    http<Array<{artifact_id:number; kind:"project"|"projectarchive"|"xml"; filename:string; size_bytes:number; uploaded_by?:string; uploaded_at:string; content_hash:string;}>>(`/versions/${vid}/artifacts`),

  uploadVersionArtifact: (vid: number, form: FormData) =>
    http<{artifact_id:number; replaced:boolean}>(`/versions/${vid}/artifacts`, { method:"POST", body: form }),

  deleteVersionArtifact: (vid: number, aid: number) =>
    http<{deleted:true}>(`/versions/${vid}/artifacts/${aid}`, { method:"DELETE" }),

  downloadVersionArtifactUrl: (vid: number, aid: number) =>
    `${API_BASE}/versions/${vid}/artifacts/${aid}/download`,
};

export type Project = { id:number; name:string; code:string; owner?:string|null; created_at:string };
export type Version = { id:number; project_id:number; codesys_version?:string|null; status:string; notes?:string|null; created_by?:string|null; created_at:string };
