import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    loading,
    isAuthenticated,
    signIn,
  } = useCustomerAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    location.state?.from || "/portal";

  if (!loading && isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
      />
    );
  }

  async function submit(event) {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage("");

    try {
      await signIn(
        email.trim().toLowerCase(),
        password
      );

      navigate(redirectTo, {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        error.message ||
          "تعذر تسجيل الدخول."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#03152f] px-4"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <img
          src="/logo.png"
          alt="بصمة النوابغ"
          className="mx-auto h-24 w-24 rounded-full object-contain"
        />

        <h1 className="mt-6 text-center text-3xl font-black text-[#071d49]">
          بوابة العملاء
        </h1>

        <p className="mt-3 text-center text-slate-500">
          متابعة عروض الأسعار والمشاريع والفواتير.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        <label className="mt-7 block">
          <span className="mb-2 block font-bold">
            البريد الإلكتروني
          </span>

          <input
            type="email"
            dir="ltr"
            value={email}
            required
            onChange={(event) =>
              setEmail(event.target.value)
            }
            className="form-input"
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-2 block font-bold">
            كلمة المرور
          </span>

          <input
            type="password"
            value={password}
            required
            onChange={(event) =>
              setPassword(event.target.value)
            }
            className="form-input"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 w-full rounded-2xl bg-[#ff7417] px-6 py-4 text-lg font-black text-white disabled:opacity-60"
        >
          {submitting
            ? "جارٍ الدخول..."
            : "دخول العميل"}
        </button>

        <div className="mt-6 border-t border-slate-200 pt-6 text-center">
          <p className="text-slate-600">
            ليس لديك حساب؟
          </p>

          <Link
            to="/portal/register"
            state={{
              from: redirectTo,
            }}
            className="mt-3 inline-block w-full rounded-2xl border-2 border-[#071d49] px-6 py-4 font-black text-[#071d49] transition hover:bg-[#071d49] hover:text-white"
          >
            إنشاء حساب جديد
          </Link>
        </div>
      </form>
    </div>
  );
}