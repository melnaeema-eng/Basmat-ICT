import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function AdminResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { updatePassword } = useAdminAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password.length < 8) {
      return setErrorMessage("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    }

    if (password !== confirmPassword) {
      return setErrorMessage("كلمتا المرور غير متطابقتين.");
    }

    try {
      setSubmitting(true);
      await updatePassword(password);
      setMessage("تم تحديث كلمة المرور بنجاح.");
      setTimeout(() => navigate("/admin", { replace: true }), 1000);
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحديث كلمة المرور.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#03152f] px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <img src="/logo.png" alt="بصمة النوابغ" className="mx-auto h-24 w-24 object-contain" />

        <h1 className="mt-6 text-center text-3xl font-black text-[#071d49]">
          تعيين كلمة مرور جديدة
        </h1>

        <p className="mt-3 text-center leading-7 text-slate-500">
          أدخل كلمة مرور جديدة لحساب الإدارة.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        <label className="mt-7 block">
          <span className="mb-2 block font-bold">كلمة المرور الجديدة</span>
          <input
            type="password"
            value={password}
            required
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            className="form-input"
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-2 block font-bold">تأكيد كلمة المرور</span>
          <input
            type="password"
            value={confirmPassword}
            required
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="form-input"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 w-full rounded-2xl bg-[#ff7417] px-6 py-4 font-black text-white disabled:opacity-60"
        >
          {submitting ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
        </button>

        <Link to="/admin/login" className="mt-4 block text-center font-bold text-slate-600">
          العودة إلى تسجيل الدخول
        </Link>
      </form>
    </div>
  );
}
