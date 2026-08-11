import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaFileLines } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const typeLabels = {
  drawing: "Drawing",
  report: "Report",
  boq: "BOQ",
  method_statement: "Method Statement",
  invoice_attachment: "Invoice Attachment",
  other: "Other",
};

const statusLabels = {
  draft: "مسودة",
  submitted: "مقدم",
  approved: "معتمد",
  rejected: "مرفوض",
};

export default function PortalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const [projectResult, documentResult] = await Promise.all([
      supabase.from("ict_delivery_projects").select("id,project_no,project_name").order("created_at", { ascending: false }),
      supabase.from("ict_project_documents").select("*").order("created_at", { ascending: false }),
    ]);

    const error = projectResult.error || documentResult.error;
    if (error) setErrorMessage(error.message);
    else {
      setProjects(projectResult.data || []);
      setDocuments(documentResult.data || []);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => projectId === "all" ? documents : documents.filter((item) => item.project_id === projectId), [documents, projectId]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((item) => [item.id, item])), [projects]);

  async function downloadDocument(document) {
    const { data, error } = await supabase.storage.from("project-documents").download(document.file_path);
    if (error) { window.alert(error.message); return; }
    const url = URL.createObjectURL(data);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.file_name || "document";
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-4xl font-black text-[#071d49]">مستندات المشاريع</h1><p className="mt-3 text-slate-600">المخططات والتقارير والتسليمات الخاصة بمشاريعك.</p></div>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none">
            <option value="all">كل المشاريع</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.project_no} — {project.project_name}</option>)}
          </select>
        </div>

        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((document) => {
            const project = projectMap[document.project_id];
            return (
              <article key={document.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-700"><FaFileLines /></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{statusLabels[document.status] || document.status}</span></div>
                <p className="mt-5 text-sm font-black text-blue-700">{project?.project_no || "—"}</p>
                <h2 className="mt-2 text-xl font-black text-[#071d49]">{document.title}</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-600"><p><strong>النوع:</strong> {typeLabels[document.document_type] || document.document_type}</p><p><strong>Revision:</strong> {document.revision || "—"}</p><p><strong>تاريخ الإصدار:</strong> {document.issue_date || "—"}</p></div>
                {document.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{document.notes}</p>}
                <button onClick={() => downloadDocument(document)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white"><FaDownload /> تنزيل المستند</button>
              </article>
            );
          })}
        </div>

        {!loading && !filtered.length && !errorMessage && <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">لا توجد مستندات متاحة حتى الآن.</div>}
        {loading && <div className="mt-8 rounded-3xl bg-white p-10 text-center text-slate-500">جارٍ التحميل...</div>}
      </div>
    </div>
  );
}
