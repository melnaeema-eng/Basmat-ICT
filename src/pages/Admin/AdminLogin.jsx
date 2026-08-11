import { useState } from "react";
import {
  FaEnvelope,
  FaLock,
  FaRightToBracket,
} from "react-icons/fa6";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const {
    loading,
    isAuthenticated,
    signIn,
    resetPassword,
  } = useAdminAuth();

  const navigate = useNavigate();
  const location = useLocation();

  if (!loading && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await signIn(
        email.trim().toLowerCase(),
        password
      );

      const destination =
        location.state?.from || "/admin";

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      console.error(
        "خطأ تسجيل دخول الإدارة:",
        error
      );

      if (
        error.message
          ?.toLowerCase()
          .includes("invalid login")
      ) {
        setErrorMessage(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        );
      } else {
        setErrorMessage(
          error.message ||
            "تعذر تسجيل الدخول."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setErrorMessage("");
    setInfoMessage("");

    if (!email.trim()) {
      setErrorMessage(
        "اكتب بريدك الإلكتروني أولًا ثم اضغط نسيت كلمة المرور."
      );
      return;
    }

    try {
      setResetting(true);

      await resetPassword(
        email.trim().toLowerCase()
      );

      setInfoMessage(
        "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني."
      );
    } catch (error) {
      console.error(
        "خطأ استعادة كلمة المرور:",
        error
      );

      setErrorMessage(
        error.message ||
          "تعذر إرسال رابط استعادة كلمة المرور."
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03152f] px-4 py-12"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.28),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.18),transparent_38%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl md:p-10">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="بصمة النوابغ"
            className="mx-auto h-24 w-24 rounded-full bg-white object-contain shadow-lg"
          />

          <h1 className="mt-6 text-3xl font-black text-[#071d49]">
            دخول لوحة الإدارة
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            الوصول مخصص للمستخدمين الإداريين المصرح لهم.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
            {infoMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <label>
            <span className="mb-2 block font-bold text-slate-700">
              البريد الإلكتروني
            </span>

            <div className="relative">
              <FaEnvelope className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                autoComplete="email"
                dir="ltr"
                placeholder="admin@company.com"
                className="form-input pr-12"
              />
            </div>
          </label>

          <label>
            <span className="mb-2 block font-bold text-slate-700">
              كلمة المرور
            </span>

            <div className="relative">
              <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                autoComplete="current-password"
                className="form-input pr-12"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff7417] px-6 py-4 text-lg font-black text-white transition hover:bg-[#ff812d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaRightToBracket />

            {submitting
              ? "جارٍ تسجيل الدخول..."
              : "دخول الإدارة"}
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting}
            className="w-full font-bold text-blue-700 disabled:opacity-60"
          >
            {resetting
              ? "جارٍ إرسال الرابط..."
              : "نسيت كلمة المرور؟"}
          </button>
        </form>
      </div>
    </div>
  );
}