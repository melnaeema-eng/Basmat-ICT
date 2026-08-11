import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaHeadset, FaPaperclip, FaPaperPlane, FaRotate } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const statusLabels = { open: "مفتوحة", in_progress: "قيد المعالجة", waiting_customer: "بانتظار العميل", resolved: "تم الحل", closed: "مغلقة" };
const priorityLabels = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" };

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState([]), [messages, setMessages] = useState([]), [attachments, setAttachments] = useState([]);
  const [selectedId, setSelectedId] = useState(""), [filter, setFilter] = useState("all"), [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false), [replyFiles, setReplyFiles] = useState([]), [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedId) loadConversation(selectedId); else { setMessages([]); setAttachments([]); } }, [selectedId]);

  async function load() {
    setLoading(true); setErrorMessage("");
    const { data, error } = await supabase.from("ict_support_tickets").select(`*, customer:ict_customers(id,name,company_name,email,phone), project:ict_delivery_projects(id,project_no,project_name)`).order("last_message_at", { ascending: false });
    if (error) setErrorMessage(error.message); else { const next = data || []; setTickets(next); setSelectedId((current) => current || next[0]?.id || ""); }
    setLoading(false);
  }

  async function loadConversation(ticketId) {
    const [m, a] = await Promise.all([
      supabase.from("ict_support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      supabase.from("ict_support_attachments").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    ]);
    const error = m.error || a.error; if (error) setErrorMessage(error.message); else { setMessages(m.data || []); setAttachments(a.data || []); }
  }

  async function updateTicket(field, value) { if (!selectedId) return; const { error } = await supabase.from("ict_support_tickets").update({ [field]: value }).eq("id", selectedId); if (error) return setErrorMessage(error.message); await load(); }

  async function uploadFiles(files, ticket, messageId) {
    if (!files?.length) return;
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${ticket.customer_id}/${ticket.id}/${messageId}/${crypto.randomUUID()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from("support-attachments").upload(path, file, { upsert: false }); if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("ict_support_attachments").insert({ ticket_id: ticket.id, message_id: messageId, customer_id: ticket.customer_id, file_name: file.name, file_path: path, mime_type: file.type || null, file_size: file.size }); if (rowError) throw rowError;
    }
  }

  async function downloadFile(item) { const { data, error } = await supabase.storage.from("support-attachments").createSignedUrl(item.file_path, 60); if (error) return setErrorMessage(error.message); window.open(data.signedUrl, "_blank", "noopener,noreferrer"); }

  async function sendReply(event) {
    event.preventDefault(); const ticket = tickets.find((t) => t.id === selectedId); if (!ticket || (!reply.trim() && !replyFiles.length)) return;
    setSending(true); setErrorMessage("");
    try {
      const { data: message, error } = await supabase.from("ict_support_messages").insert({ ticket_id: selectedId, sender_type: "admin", message: reply.trim() || "مرفق", is_internal: internal }).select("id").single(); if (error) throw error;
      await uploadFiles(replyFiles, ticket, message.id);
      if (!internal) await supabase.from("ict_support_tickets").update({ status: "waiting_customer" }).eq("id", selectedId);
      setReply(""); setReplyFiles([]); setInternal(false); await loadConversation(selectedId); await load();
    } catch (error) { setErrorMessage(error.message); } finally { setSending(false); }
  }

  const filtered = useMemo(() => filter === "all" ? tickets : tickets.filter((t) => t.status === filter), [tickets, filter]);
  const selected = useMemo(() => tickets.find((t) => t.id === selectedId), [tickets, selectedId]);
  const filesFor = (messageId) => attachments.filter((a) => a.message_id === messageId);

  return <div dir="rtl" className="px-4 py-10 md:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><FaHeadset className="text-3xl text-[#ff7417]" /><div><h1 className="text-4xl font-black text-[#071d49]">الدعم والتذاكر</h1><p className="mt-2 text-slate-600">مراجعة طلبات العملاء ومستنداتهم والرد عليها.</p></div></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white"><FaRotate /> تحديث</button></div>
    {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}
    <div className="mt-7 flex flex-wrap gap-2">{[["all","الكل"], ...Object.entries(statusLabels)].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={["rounded-xl px-4 py-2 font-black", filter === value ? "bg-[#ff7417] text-white" : "bg-white text-slate-700"].join(" ")}>{label}</button>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-3">{filtered.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={["w-full rounded-2xl border p-4 text-right", selectedId === ticket.id ? "border-[#ff7417] bg-orange-50" : "border-slate-200 bg-white"].join(" ")}><div className="flex justify-between gap-2"><strong dir="ltr" className="text-blue-700">{ticket.ticket_no}</strong><span className="text-xs font-black text-slate-500">{statusLabels[ticket.status]}</span></div><p className="mt-2 font-black text-[#071d49]">{ticket.subject}</p><p className="mt-2 text-sm text-slate-600">{ticket.customer?.company_name || ticket.customer?.name || "—"}</p><p className="mt-1 text-xs text-slate-500">{priorityLabels[ticket.priority]} {ticket.project?.project_no ? `— ${ticket.project.project_no}` : ""}</p></button>)}{!loading && !filtered.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">لا توجد تذاكر.</div>}</div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{!selected ? <div className="py-12 text-center text-slate-500">اختر تذكرة.</div> : <>
        <div className="border-b border-slate-200 pb-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p dir="ltr" className="text-right font-black text-blue-700">{selected.ticket_no}</p><h2 className="mt-2 text-2xl font-black text-[#071d49]">{selected.subject}</h2><p className="mt-2 text-slate-500">{selected.customer?.company_name || selected.customer?.name} {selected.project?.project_no ? `— ${selected.project.project_no}` : ""}</p></div><div className="grid gap-2 sm:grid-cols-2"><select className="input" value={selected.status} onChange={(e) => updateTicket("status", e.target.value)}>{Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><select className="input" value={selected.priority} onChange={(e) => updateTicket("priority", e.target.value)}>{Object.entries(priorityLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div></div></div>
        <div className="mt-5 space-y-3">{messages.map((message) => <div key={message.id} className={["max-w-[88%] rounded-2xl p-4", message.is_internal ? "border border-amber-300 bg-amber-50" : message.sender_type === "admin" ? "mr-auto bg-blue-50" : "ml-auto bg-slate-100"].join(" ")}><p className="text-xs font-black text-slate-500">{message.is_internal ? "ملاحظة داخلية" : message.sender_type === "admin" ? "الإدارة" : "العميل"}</p><p className="mt-2 whitespace-pre-wrap text-slate-800">{message.message}</p>{filesFor(message.id).map((file) => <button key={file.id} onClick={() => downloadFile(file)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700"><span className="truncate">{file.file_name}</span><FaDownload /></button>)}<p className="mt-2 text-xs text-slate-400">{new Date(message.created_at).toLocaleString("ar-SA")}</p></div>)}</div>
        <form onSubmit={sendReply} className="mt-6 border-t border-slate-200 pt-5"><div className="flex gap-3"><input className="input flex-1" placeholder="اكتب الرد..." value={reply} onChange={(e) => setReply(e.target.value)} /><label className="flex cursor-pointer items-center rounded-xl border border-slate-300 px-4"><FaPaperclip /><input className="hidden" type="file" multiple onChange={(e) => setReplyFiles(Array.from(e.target.files || []))} /></label><button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white disabled:opacity-50"><FaPaperPlane /> إرسال</button></div>{!!replyFiles.length && <p className="mt-2 text-sm text-slate-500">{replyFiles.length} مرفق</p>}<label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> ملاحظة داخلية لا تظهر للعميل</label></form>
      </>}</div>
    </div>
  </div></div>;
}
