import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FaArrowRight,
  FaKey,
  FaShieldHalved,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function AdminMFA() {
  const {
    loading,
    isAuthenticated,
    refreshMfaState,
  } = useAdminAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("loading");
  const [factor, setFactor] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const destination =
    location.state?.from &&
    location.state.from !== "/admin/mfa"
      ? location.state.from
      : "/admin";

  useEffect(() => {
    if (isAuthenticated) {
      determineMfaMode();
    }
  }, [isAuthenticated]);

  async function determineMfaMode() {
    setMode("loading");
    setMessage({ type: "", text: "" });

    try {
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) throw aalError;

      // Official Supabase rule:
      // aal1 -> aal2 means a verified MFA factor exists and
      // this session still needs the second-factor challenge.
      if (
        aal?.currentLevel === "aal1" &&
        aal?.nextLevel === "aal2"
      ) {
        const { data: factorsData, error: factorsError } =
          await supabase.auth.mfa.listFactors();

        if (factorsError) throw factorsError;

        const verifiedTotp =
          (factorsData?.totp || []).find(
            (item) => item.status === "verified"
          ) ||
          (factorsData?.totp || [])[0];

        if (!verifiedTotp) {
          throw new Error(
            "Supabase يشير إلى وجود 2FA ولكن لم يتم العثور على TOTP Factor."
          );
        }

        setFactor(verifiedTotp);
        setMode("challenge");
        return;
      }

      // Already verified in this session.
      if (
        aal?.currentLevel === "aal2" &&
        aal?.nextLevel === "aal2"
      ) {
        setMode("verified");
        return;
      }

      // aal1 -> aal1 means there is no verified MFA factor.
      setFactor(null);
      setMode("enroll");
    } catch (error) {
      console.error("MFA mode error:", error);
      setMode("error");
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر التحقق من حالة المصادقة الثنائية.",
      });
    }
  }

  async function verifyExistingFactor() {
    if (!factor?.id) {
      setMessage({
        type: "error",
        text: "لم يتم العثور على عامل المصادقة الثنائية.",
      });
      return;
    }

    if (code.trim().length !== 6) {
      setMessage({
        type: "error",
        text: "أدخل رمز التحقق المكون من 6 أرقام.",
      });
      return;
    }

    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: factor.id,
          code: code.trim(),
        });

      if (error) throw error;

      await refreshMfaState();
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "رمز التحقق غير صحيح.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function startEnrollment() {
    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      // Re-check AAL before creating anything.
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) throw aalError;

      if (aal?.nextLevel === "aal2") {
        await determineMfaMode();
        return;
      }

      const { data, error } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `Basmat ICT Admin ${Date.now()}`,
        });

      if (error) throw error;

      setEnrollment(data);
      setCode("");
      setMode("enrollment-code");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر بدء تفعيل المصادقة الثنائية.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollment?.id || code.trim().length !== 6) {
      setMessage({
        type: "error",
        text: "أدخل رمز التحقق المكون من 6 أرقام.",
      });
      return;
    }

    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: enrollment.id,
          code: code.trim(),
        });

      if (error) throw error;

      setEnrollment(null);
      setCode("");
      await refreshMfaState();
      setMode("verified");

      setMessage({
        type: "success",
        text: "تم تفعيل المصادقة الثنائية بنجاح.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "رمز التحقق غير صحيح.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa() {
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      setMessage({
        type: "error",
        text: factorsError.message,
      });
      return;
    }

    const verifiedTotp =
      (factorsData?.totp || []).find(
        (item) => item.status === "verified"
      );

    if (!verifiedTotp) {
      await determineMfaMode();
      return;
    }

    const ok = window.confirm(
      "هل تريد إلغاء المصادقة الثنائية لهذا الحساب؟"
    );

    if (!ok) return;

    setBusy(true);

    try {
      const { error } =
        await supabase.auth.mfa.unenroll({
          factorId: verifiedTotp.id,
        });

      if (error) throw error;

      await supabase.auth.refreshSession();
      await refreshMfaState();
      await determineMfaMode();

      setMessage({
        type: "success",
        text: "تم إلغاء المصادقة الثنائية.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر إلغاء المصادقة الثنائية.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 px-4 py-10"
    >
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-7 shadow-xl md:p-10">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
            <FaShieldHalved />
          </div>

          <div>
            <h1 className="text-2xl font-black text-[#071d49]">
              المصادقة الثنائية 2FA
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              حماية إضافية لحسابات إدارة Basmat ICT.
            </p>
          </div>
        </div>

        {message.text && (
          <div
            className={[
              "mt-6 rounded-2xl border p-4 font-bold",
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        {mode === "loading" && (
          <div className="mt-8 rounded-2xl border border-slate-200 p-6 text-center font-black text-slate-600">
            جارٍ التحقق من حالة 2FA...
          </div>
        )}

        {mode === "challenge" && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
            <div className="flex items-center gap-3 text-blue-800">
              <FaKey />
              <h2 className="font-black">
                تحقق بخطوتين لإكمال الدخول
              </h2>
            </div>

            <p className="mt-3 leading-7 text-slate-600">
              افتح تطبيق Authenticator وأدخل الرمز الحالي المكون من 6 أرقام.
            </p>

            <input
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="000000"
              className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-4 text-center text-2xl font-black tracking-[0.4em]"
            />

            <button
              type="button"
              onClick={verifyExistingFactor}
              disabled={busy}
              className="mt-4 w-full rounded-2xl bg-[#ff7417] px-5 py-4 font-black text-white disabled:opacity-60"
            >
              {busy ? "جارٍ التحقق..." : "تحقق ودخول"}
            </button>
          </div>
        )}

        {mode === "enroll" && (
          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <h2 className="font-black text-slate-800">
              التفعيل اختياري حاليًا
            </h2>

            <p className="mt-2 leading-7 text-slate-600">
              لا يوجد 2FA مفعل لهذا الحساب. يمكنك تفعيله باستخدام
              Google Authenticator أو Microsoft Authenticator.
            </p>

            <button
              type="button"
              onClick={startEnrollment}
              disabled={busy}
              className="mt-5 w-full rounded-2xl bg-[#ff7417] px-5 py-4 font-black text-white disabled:opacity-60"
            >
              تفعيل 2FA على هذا الحساب
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-4 font-black text-slate-700"
            >
              ليس الآن
            </button>
          </div>
        )}

        {mode === "enrollment-code" && enrollment && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
            <h2 className="font-black text-[#071d49]">
              1. امسح QR Code
            </h2>

            {enrollment.totp?.qr_code && (
              <img
                src={enrollment.totp.qr_code}
                alt="2FA QR Code"
                className="mx-auto mt-5 h-56 w-56 rounded-2xl bg-white p-3 shadow"
              />
            )}

            <p className="mt-5 text-sm font-bold text-slate-600">
              أو أدخل المفتاح يدويًا:
            </p>

            <div
              dir="ltr"
              className="mt-2 break-all rounded-xl bg-white p-3 text-center font-mono text-sm"
            >
              {enrollment.totp?.secret}
            </div>

            <h2 className="mt-6 font-black text-[#071d49]">
              2. أدخل الرمز المكون من 6 أرقام
            </h2>

            <input
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="000000"
              className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-4 text-center text-2xl font-black tracking-[0.4em]"
            />

            <button
              type="button"
              onClick={verifyEnrollment}
              disabled={busy}
              className="mt-4 w-full rounded-2xl bg-blue-700 px-5 py-4 font-black text-white disabled:opacity-60"
            >
              تأكيد وتفعيل 2FA
            </button>
          </div>
        )}

        {mode === "verified" && (
          <div className="mt-8 rounded-2xl border border-green-200 bg-green-50/40 p-6">
            <div className="flex items-center gap-3 text-green-800">
              <FaKey />
              <h2 className="font-black">
                2FA مفعل لهذا الحساب
              </h2>
            </div>

            <p className="mt-3 font-bold text-green-700">
              الجلسة الحالية محمية بمستوى AAL2.
            </p>

            <button
              type="button"
              onClick={disableMfa}
              disabled={busy}
              className="mt-5 w-full rounded-2xl border border-red-200 bg-white px-5 py-3 font-black text-red-700 disabled:opacity-60"
            >
              إلغاء 2FA لهذا الحساب
            </button>
          </div>
        )}

        {mode === "error" && (
          <button
            type="button"
            onClick={determineMfaMode}
            className="mt-5 w-full rounded-2xl bg-blue-700 px-5 py-4 font-black text-white"
          >
            إعادة المحاولة
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mt-6 inline-flex items-center gap-2 font-black text-blue-700"
        >
          <FaArrowRight />
          العودة إلى لوحة الإدارة
        </button>
      </div>
    </div>
  );
}
