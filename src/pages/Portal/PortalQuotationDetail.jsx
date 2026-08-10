import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

export default function PortalQuotationDetail() {
  const { id } = useParams();
  const { profile } = useCustomerAuth();

  const [quotation, setQuotation] = useState(null);
  const [approval, setApproval] = useState(null);
  const [signerName, setSignerName] = useState(
    profile?.full_name || profile?.customer?.name || ""
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [deciding, setDeciding] = useState(false);

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!signerName && profile) {
      setSignerName(profile?.full_name || profile?.customer?.name || "");
    }
  }, [profile, signerName]);

  async function load() {
    const [q, a] = await Promise.all([
      supabase.from("ict_quotations").select("*").eq("id", id).single(),
      supabase.from("ict_quotation_approvals").select("*")
        .eq("quotation_id", id).order("signed_at", { ascending: false })
        .limit(1).maybeSingle(),
    ]);

    if (q.error) {
      setMessage(q.error.message);
      return;
    }

    setQuotation(q.data);
    setApproval(a.data || null);
  }

  async function decide(decision) {
    setMessage("");

    if (!signerName.trim()) return setMessage("اكتب اسم الشخص المخول.");
    if (!consent) return setMessage("يجب تأكيد الإقرار.");
    if (decision === "rejected" && !rejectionReason.trim()) {
      return setMessage("يرجى كتابة سبب الرفض.");
    }

    try {
      setDeciding(true);

      const { data: approvalId, error } = await supabase.rpc(
        "customer_decide_quotation",
        {
          p_quotation_id: id,
          p_decision: decision,
          p_signer_name: signerName.trim(),
          p_signer_email: profile?.email || profile?.customer?.email || "",
          p_rejection_reason: decision === "rejected" ? rejectionReason.trim() : null,
          p_consent_text: "أقر بأنني مخول لاتخاذ هذا القرار نيابة عن العميل، وأن إدخال اسمي والضغط على زر القرار يمثل موافقتي الإلكترونية.",
          p_user_agent: navigator.userAgent,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      const { error: mailError } = await supabase.functions.invoke(
        "send-quotation-decision-email",
        { body: { quotation_id: id, approval_id: approvalId } }
      );

      if (mailError) {
        console.warn("تم تسجيل القرار، لكن تعذر إرسال البريد الداخلي:", mailError);
      }

      setMessage(
        decision === "accepted"
          ? "تم قبول عرض السعر وإشعار الإدارة."
          : "تم رفض عرض السعر وإشعار الإدارة."
      );

      await load();
    } finally {
      setDeciding(false);
    }
  }

  if (!quotation) {
    return <div dir="rtl" className="p-10">{message || "جارٍ تحميل العرض..."}</div>;
  }

  const items = Array.isArray(quotation.items) ? quotation.items : [];

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
        <p dir="ltr" className="text-right font-black text-blue-700">{quotation.quotation_no}</p>
        <h1 className="mt-2 text-3xl font-black text-[#071d49]">{quotation.subject || "عرض سعر"}</h1>

        <div className="mt-7 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="bg-[#071d49] text-white">
              <th className="p-3">الوصف</th><th className="p-3">الكمية</th>
              <th className="p-3">سعر الوحدة</th><th className="p-3">الإجمالي</th>
            </tr></thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-slate-200">
                  <td className="p-3">{item.description}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.unit_price}</td>
                  <td className="p-3">{Number(item.quantity || 0) * Number(item.unit_price || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-7 rounded-2xl bg-slate-50 p-6">
          <p className="flex justify-between"><span>قبل الضريبة</span><strong>{quotation.subtotal} {quotation.currency}</strong></p>
          <p className="mt-3 flex justify-between"><span>الضريبة</span><strong>{quotation.tax_amount} {quotation.currency}</strong></p>
          <p className="mt-5 flex justify-between border-t border-slate-300 pt-5 text-xl">
            <span className="font-black">الإجمالي</span><strong>{quotation.total_amount} {quotation.currency}</strong>
          </p>
        </div>

        {approval ? (
          <div className={["mt-8 rounded-3xl border p-6", approval.decision === "accepted" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"].join(" ")}>
            <h2 className="text-xl font-black">تم تسجيل القرار</h2>
            <p className="mt-3">القرار: <strong>{approval.decision === "accepted" ? "مقبول" : "مرفوض"}</strong></p>
            <p className="mt-2">الاسم: {approval.signer_name}</p>
            {approval.rejection_reason && <p className="mt-2">سبب الرفض: {approval.rejection_reason}</p>}
            {message && <p className="mt-4 font-bold">{message}</p>}
          </div>
        ) : quotation.status === "sent" ? (
          <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="text-2xl font-black text-[#071d49]">الموافقة على العرض</h2>
            <label className="mt-5 block">
              <span className="mb-2 block font-bold">اسم الشخص المخول</span>
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className="form-input" />
            </label>
            <label className="mt-4 block">
              <span className="mb-2 block font-bold">سبب الرفض</span>
              <textarea rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="form-input resize-none" />
            </label>
            <label className="mt-5 flex items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
              <span className="leading-7 text-slate-700">أقر بأنني مخول لاتخاذ هذا القرار نيابة عن العميل، وأن إدخال اسمي والضغط على زر القرار يمثل موافقتي الإلكترونية.</span>
            </label>
            {message && <div className="mt-4 rounded-xl bg-white p-4 text-blue-900">{message}</div>}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={deciding} onClick={() => decide("accepted")} className="rounded-xl bg-green-600 px-6 py-3 font-black text-white disabled:opacity-60">
                {deciding ? "جارٍ التسجيل..." : "قبول العرض"}
              </button>
              <button type="button" disabled={deciding} onClick={() => decide("rejected")} className="rounded-xl bg-red-600 px-6 py-3 font-black text-white disabled:opacity-60">رفض العرض</button>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-slate-50 p-5 font-bold text-slate-700">حالة العرض الحالية: {quotation.status}</div>
        )}
      </div>
    </div>
  );
}
