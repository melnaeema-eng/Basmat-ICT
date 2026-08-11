import { useEffect, useMemo, useState } from "react";
import {
  FaDownload,
  FaFileArrowUp,
  FaRotate,
  FaTrash,
} from "react-icons/fa6";
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

export default function AdminProjectDocuments() {
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    project_id: "",
    title: "",
    document_type: "drawing",
    revision: "R0",
    status: "submitted",
    issue_date: "",
    notes: "",
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const [projectResult, documentResult] = await Promise.all([
      supabase
        .from("ict_delivery_projects")
        .select(`
          id,
          project_no,
          project_name,
          customer_id,
          customer:ict_customers(id,name,company_name)
        `)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_project_documents")
        .select(`
          *,
          project:ict_delivery_projects(project_no,project_name)
        `)
        .order("created_at", { ascending: false }),
    ]);

    const error = projectResult.error || documentResult.error;
    if (error) {
      setErrorMessage(error.message);
    } else {
      setProjects(projectResult.data || []);
      setDocuments(documentResult.data || []);
    }

    setLoading(false);
  }

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === form.project_id),
    [projects, form.project_id]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!selectedProject?.customer_id || !file) {
      setErrorMessage("اختر المشروع والملف أولًا.");
      return;
    }

    setSaving(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${selectedProject.customer_id}/${selectedProject.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("ict_project_documents")
        .insert({
          project_id: selectedProject.id,
          customer_id: selectedProject.customer_id,
          title: form.title.trim() || file.name,
          document_type: form.document_type,
          revision: form.revision.trim() || "R0",
          status: form.status,
          file_name: file.name,
          file_path: filePath,
          mime_type: file.type || null,
          file_size: file.size || null,
          issue_date: form.issue_date || null,
          notes: form.notes.trim() || null,
        });

      if (insertError) {
        await supabase.storage.from("project-documents").remove([filePath]);
        throw insertError;
      }

      setForm({
        project_id: "",
        title: "",
        document_type: "drawing",
        revision: "R0",
        status: "submitted",
        issue_date: "",
        notes: "",
      });
      setFile(null);
      const input = window.document.getElementById("project-document-file");
      if (input) input.value = "";
      await load();
    } catch (error) {
      setErrorMessage(error.message || "تعذر حفظ المستند.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadDocument(document) {
    const { data, error } = await supabase.storage
      .from("project-documents")
      .download(document.file_path);

    if (error) {
      window.alert(error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.file_name || "document";
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteDocument(document) {
    if (!window.confirm(`حذف المستند: ${document.title}؟`)) return;

    const { error: storageError } = await supabase.storage
      .from("project-documents")
      .remove([document.file_path]);

    if (storageError) {
      window.alert(storageError.message);
      return;
    }

    const { error } = await supabase
      .from("ict_project_documents")
      .delete()
      .eq("id", document.id);

    if (error) {
      window.alert(error.message);
      return;
    }

    await load();
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">مستندات المشاريع</h1>
            <p className="mt-3 text-slate-600">رفع وتسليم ومتابعة مستندات كل مشروع.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white">
            <FaRotate /> تحديث
          </button>
        </div>

        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="المشروع">
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input" required>
                <option value="">اختر المشروع</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_no} — {project.project_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="عنوان المستند">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="مثال: Approved Shop Drawing" />
            </Field>

            <Field label="نوع المستند">
              <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="input">
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>

            <Field label="Revision">
              <input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} className="input" />
            </Field>

            <Field label="الحالة">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>

            <Field label="تاريخ الإصدار">
              <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="input" />
            </Field>

            <Field label="الملف">
              <input id="project-document-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" required />
            </Field>

            <Field label="ملاحظات">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
            </Field>
          </div>

          {selectedProject && (
            <p className="mt-4 text-sm font-bold text-slate-500">
              العميل: {selectedProject.customer?.company_name || selectedProject.customer?.name || "—"}
            </p>
          )}

          <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60">
            <FaFileArrowUp /> {saving ? "جارٍ الرفع..." : "رفع المستند"}
          </button>
        </form>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="p-4">المشروع</th><th className="p-4">المستند</th><th className="p-4">النوع</th><th className="p-4">Revision</th><th className="p-4">الحالة</th><th className="p-4">التاريخ</th><th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-t border-slate-100">
                    <td className="p-4 font-bold">{document.project?.project_no || "—"}</td>
                    <td className="p-4"><div className="font-black text-[#071d49]">{document.title}</div><div className="mt-1 text-xs text-slate-500">{document.file_name}</div></td>
                    <td className="p-4">{typeLabels[document.document_type] || document.document_type}</td>
                    <td className="p-4">{document.revision}</td>
                    <td className="p-4">{statusLabels[document.status] || document.status}</td>
                    <td className="p-4">{document.issue_date || "—"}</td>
                    <td className="p-4"><div className="flex gap-2"><button onClick={() => downloadDocument(document)} className="rounded-xl bg-blue-50 p-3 text-blue-700" title="تنزيل"><FaDownload /></button><button onClick={() => deleteDocument(document)} className="rounded-xl bg-red-50 p-3 text-red-700" title="حذف"><FaTrash /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !documents.length && <div className="p-10 text-center text-slate-500">لا توجد مستندات مشاريع بعد.</div>}
          {loading && <div className="p-10 text-center text-slate-500">جارٍ التحميل...</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-600">{label}</span>{children}</label>;
}
