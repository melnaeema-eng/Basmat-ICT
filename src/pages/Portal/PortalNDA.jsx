import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

export default function PortalNDA() {
  const { id } = useParams();
  const { profile } = useCustomerAuth();

  const [nda, setNda] = useState(null);
  const [signerName, setSignerName] = useState(profile?.full_name || profile?.customer?.name || "");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data, error } = await supabase
      .from("ict_nda_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error) setErrorMessage(error.message);
    else setNda(data);
  }

  async function accept() {
    setErrorMessage("");
    setMessage("");

    if (!signerName.trim()) {
      return setErrorMessage("اكتب اسم الشخص المخول.");
    }

    if (!consent) {
      return setErrorMessage("يجب الموافقة على الإقرار.");
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc("accept_customer_nda", {
        p_nda_id: id,
        p_signer_name: signerName.trim(),
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;

      setMessage("تم قبول اتفاقية NDA وتسجيل الموافقة بنجاح.");
      await load();
    } catch (error) {
      setErrorMessage(error.message || "تعذر تسجيل الموافقة.");
    } finally {
      setSaving(false);
    }
  }

  if (!nda) {
    return (
      <div dir="rtl" className="p-10">
        {errorMessage || "جارٍ تحميل NDA..."}
      </div>
    );
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
        <p dir="ltr" className="text-right font-black text-blue-700">{nda.nda_no}</p>
        <h1 className="mt-2 text-3xl font-black text-[#071d49]">اتفاقية عدم الإفصاح NDA</h1>
        <p className="mt-2 text-slate-500">مرتبطة بالطلب: {nda.request_no}</p>

        <div className="mt-7 whitespace-pre-line rounded-2xl bg-slate-50 p-6 leading-9 text-slate-700">
          {nda.nda_text}
        </div>

        {errorMessage && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">{errorMessage}</div>}
        {message && <div className="mt-5 rounded-2xl bg-green-50 p-4 text-green-800">{message}</div>}

        {nda.status === "accepted" ? (
          <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
            تم قبول الاتفاقية بواسطة <strong>{nda.signer_name}</strong>.
          </div>
        ) : (
          <>
            <label className="mt-7 block">
              <span className="mb-2 block font-bold">اسم الشخص المخول</span>
              <input className="form-input" value={signerName}
                onChange={e=>setSignerName(e.target.value)} />
            </label>

            <label className="mt-5 flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={consent}
                onChange={e=>setConsent(e.target.checked)} />
              <span className="leading-7">
                أقر بأنني مخول بالموافقة على اتفاقية عدم الإفصاح وأن إدخال اسمي والضغط على زر الموافقة يمثل قبولي الإلكتروني.
              </span>
            </label>

            <button type="button" onClick={accept} disabled={saving}
              className="mt-6 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60">
              {saving ? "جارٍ التسجيل..." : "قبول NDA"}
            </button>
          </>
        )}

        <Link to="/portal/requests"
          className="mt-6 block text-center font-black text-blue-700">
          العودة إلى طلباتي
        </Link>
      </div>
    </div>
  );
}
