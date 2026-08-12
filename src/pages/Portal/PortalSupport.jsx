import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaHeadset, FaPaperclip, FaPaperPlane, FaPlus } from "react-icons/fa6";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { supabase } from "../../lib/supabase";

const statusLabels = { open: "مفتوحة", in_progress: "قيد المعالجة", waiting_customer: "بانتظار العميل", resolved: "تم الحل", closed: "مغلقة" };
const priorityLabels = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" };

export default function PortalSupport() {
  const { profile } = useCustomerAuth();
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reply, setReply] = useState("");
  const [newFiles, setNewFiles] = useState([]);
  const [replyFiles, setReplyFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "technical", priority: "normal", project_id: "", message: "" });

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedId) loadConversation(selectedId); else { setMessages([]); setAttachments([]); } }, [selectedId]);

  async function load() {
    setLoading(true); setErrorMessage("");
    const [ticketResult, projectResult] = await Promise.all([
      supabase.from("ict_support_tickets").select("*").order("last_message_at", { ascending: false }),
      supabase.from("ict_delivery_projects").select("id,project_no,project_name").order("created_at", { ascending: false }),
    ]);
    const error = ticketResult.error || projectResult.error;
    if (error) setErrorMessage(error.message);
    else {
      const nextTickets = (ticketResult.data || []).filter(
        (ticket) =>
          !["resolved", "closed"].includes(
            String(ticket.status || "").toLowerCase()
          )
      );
      setTickets(nextTickets); setProjects(projectResult.data || []);
      setSelectedId((current) => current || nextTickets[0]?.id || "");
    }
    setLoading(false);
  }

  async function loadConversation(ticketId) {
    const [messageResult, attachmentResult] = await Promise.all([
      supabase.from("ict_support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      supabase.from("ict_support_attachments").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    ]);
    const error = messageResult.error || attachmentResult.error;
    if (error) setErrorMessage(error.message);
    else { setMessages(messageResult.data || []); setAttachments(attachmentResult.data || []); }
  }

  async function uploadFiles(files, ticketId, messageId) {
    if (!files?.length) return;
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${profile.customer_id}/${ticketId}/${messageId}/${crypto.randomUUID()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from("support-attachments").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("ict_support_attachments").insert({
        ticket_id: ticketId, message_id: messageId, customer_id: profile.customer_id,
        file_name: file.name, file_path: path, mime_type: file.type || null, file_size: file.size,
      });
      if (rowError) throw rowError;
    }
  }

  async function downloadFile(item) {
    const { data, error } = await supabase.storage.from("support-attachments").createSignedUrl(item.file_path, 60);
    if (error) return setErrorMessage(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function createTicket(event) {
    event.preventDefault(); setErrorMessage("");
    if (!profile?.customer_id) return setErrorMessage("تعذر تحديد حساب العميل.");
    if (!form.subject.trim() || !form.message.trim()) return setErrorMessage("اكتب عنوان الطلب والرسالة.");
    setSending(true);
    try {
      const { data: ticket, error } = await supabase.from("ict_support_tickets").insert({
        customer_id: profile.customer_id, project_id: form.project_id || null,
        subject: form.subject.trim(), category: form.category, priority: form.priority,
      }).select("*").single();
      if (error) throw error;
      const { data: message, error: messageError } = await supabase.from("ict_support_messages").insert({
        ticket_id: ticket.id, sender_type: "customer", message: form.message.trim(), is_internal: false,
      }).select("id").single();
      if (messageError) throw messageError;
      await uploadFiles(newFiles, ticket.id, message.id);
      setForm({ subject: "", category: "technical", priority: "normal", project_id: "", message: "" });
      setNewFiles([]); setSelectedId(ticket.id); await load(); await loadConversation(ticket.id);
    } catch (error) { setErrorMessage(error.message); } finally { setSending(false); }
  }

  async function sendReply(event) {
    event.preventDefault(); if (!selectedId || (!reply.trim() && !replyFiles.length)) return;
    setSending(true); setErrorMessage("");
    try {
      const { data: message, error } = await supabase.from("ict_support_messages").insert({
        ticket_id: selectedId, sender_type: "customer", message: reply.trim() || "مرفق", is_internal: false,
      }).select("id").single();
      if (error) throw error;
      await uploadFiles(replyFiles, selectedId, message.id);
      setReply(""); setReplyFiles([]); await loadConversation(selectedId); await load();
    } catch (error) { setErrorMessage(error.message); } finally { setSending(false); }
  }

  const selected = useMemo(() => tickets.find((item) => item.id === selectedId), [tickets, selectedId]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const filesFor = (messageId) => attachments.filter((a) => a.message_id === messageId);

  return <div dir="rtl" className="px-4 py-10"><div className="mx-auto max-w-7xl">
    <div className="flex items-center gap-3"><FaHeadset className="text-3xl text-[#ff7417]" /><div><h1 className="text-4xl font-black text-[#071d49]">الدعم الفني</h1><p className="mt-2 text-slate-600">افتح طلب دعم وأرفق المستندات المطلوبة للمراجعة.</p></div></div>
    {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

    <form onSubmit={createTicket} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-[#071d49]"><FaPlus /> طلب دعم جديد</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input className="input" placeholder="عنوان الطلب" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
        <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="technical">فني</option><option value="commercial">تجاري</option><option value="billing">فواتير</option><option value="project">مشروع</option><option value="general">عام</option></select>
        <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select>
        <select className="input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">بدون مشروع</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.project_no} — {p.project_name}</option>)}</select>
      </div>
      <textarea className="input mt-4 min-h-28 w-full" placeholder="اكتب تفاصيل الطلب..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
      <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 font-bold text-slate-600"><FaPaperclip /> إرفاق مستندات<input className="hidden" type="file" multiple onChange={(e) => setNewFiles(Array.from(e.target.files || []))} /></label>
      {!!newFiles.length && <p className="mt-2 text-sm text-slate-500">تم اختيار {newFiles.length} ملف</p>}
      <button disabled={sending} className="mt-4 rounded-xl bg-[#123878] px-6 py-3 font-black text-white disabled:opacity-50">إرسال الطلب</button>
    </form>

    <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-3">{tickets.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={["w-full rounded-2xl border p-4 text-right transition", selectedId === ticket.id ? "border-[#ff7417] bg-orange-50" : "border-slate-200 bg-white"].join(" ")}><div className="flex justify-between gap-2"><strong dir="ltr" className="text-blue-700">{ticket.ticket_no}</strong><span className="text-xs font-black text-slate-500">{statusLabels[ticket.status]}</span></div><p className="mt-2 font-black text-[#071d49]">{ticket.subject}</p><p className="mt-2 text-xs text-slate-500">الأولوية: {priorityLabels[ticket.priority]} {ticket.project_id ? `— ${projectMap[ticket.project_id]?.project_no || ""}` : ""}</p></button>)}{!loading && !tickets.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">لا توجد تذاكر دعم مفتوحة حاليًا.</div>}</div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{!selected ? <div className="py-12 text-center text-slate-500">اختر طلب دعم لعرض المحادثة.</div> : <>
        <div className="border-b border-slate-200 pb-5"><div className="flex flex-wrap justify-between gap-3"><div><p dir="ltr" className="text-right font-black text-blue-700">{selected.ticket_no}</p><h2 className="mt-2 text-2xl font-black text-[#071d49]">{selected.subject}</h2></div><span className="h-fit rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">{statusLabels[selected.status]}</span></div></div>
        <div className="mt-5 space-y-3">{messages.map((message) => <div key={message.id} className={["max-w-[85%] rounded-2xl p-4", message.sender_type === "customer" ? "mr-auto bg-slate-100" : "ml-auto bg-blue-50"].join(" ")}><p className="text-xs font-black text-slate-500">{message.sender_type === "customer" ? "أنت" : "فريق الدعم"}</p><p className="mt-2 whitespace-pre-wrap text-slate-800">{message.message}</p>{filesFor(message.id).map((file) => <button key={file.id} onClick={() => downloadFile(file)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700"><span className="truncate">{file.file_name}</span><FaDownload /></button>)}<p className="mt-2 text-xs text-slate-400">{new Date(message.created_at).toLocaleString("ar-SA")}</p></div>)}</div>
        {selected.status !== "closed" && <form onSubmit={sendReply} className="mt-6 border-t border-slate-200 pt-5"><div className="flex gap-3"><input className="input flex-1" placeholder="اكتب ردك..." value={reply} onChange={(e) => setReply(e.target.value)} /><label className="flex cursor-pointer items-center rounded-xl border border-slate-300 px-4"><FaPaperclip /><input className="hidden" type="file" multiple onChange={(e) => setReplyFiles(Array.from(e.target.files || []))} /></label><button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-5 py-3 font-black text-white disabled:opacity-50"><FaPaperPlane /> إرسال</button></div>{!!replyFiles.length && <p className="mt-2 text-sm text-slate-500">{replyFiles.length} مرفق</p>}</form>}
      </>}</div>
    </div>
  </div></div>;
}
