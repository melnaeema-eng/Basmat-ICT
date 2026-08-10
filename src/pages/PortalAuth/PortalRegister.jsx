import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

const publicDomains = [
  "gmail.com","googlemail.com","hotmail.com","outlook.com",
  "live.com","yahoo.com","icloud.com","me.com","aol.com"
];

export default function PortalRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useCustomerAuth();
  const redirectTo = location.state?.from || "/portal";

  const [form, setForm] = useState({
    customer_type: "individual",
    full_name: "",
    company_name: "",
    phone: "",
    email: "",
    city: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(name, value) {
    setForm((x) => ({ ...x, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setErrorMessage("");
    setMessage("");

    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      return setErrorMessage("أكمل البيانات المطلوبة.");
    }

    if (form.password.length < 8) {
      return setErrorMessage("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    }

    if (form.customer_type === "company") {
      const domain = form.email.trim().toLowerCase().split("@")[1];

      if (!form.company_name.trim() || !form.city.trim()) {
        return setErrorMessage("اسم الشركة والمدينة مطلوبان.");
      }

      if (!domain || publicDomains.includes(domain)) {
        return setErrorMessage("طلبات الشركات تتطلب بريدًا تجاريًا رسميًا.");
      }
    }

    try {
      setSubmitting(true);

      const data = await signUp({
        email: form.email,
        password: form.password,
        metadata: {
          customer_type: form.customer_type,
          full_name: form.full_name.trim(),
          company_name: form.company_name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
        },
      });

      if (data.session) {
        navigate(redirectTo, { replace: true });
      } else {
        setMessage(
          "تم إنشاء الحساب. أكد البريد الإلكتروني ثم سجل الدخول للمتابعة."
        );
      }
    } catch (error) {
      setErrorMessage(error.message || "تعذر إنشاء الحساب.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#03152f] px-4 py-12">
      <form onSubmit={submit} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
        <img src="/logo.png" alt="بصمة النوابغ" className="mx-auto h-20 w-20 object-contain" />
        <h1 className="mt-5 text-center text-3xl font-black text-[#071d49]">
          إنشاء حساب عميل
        </h1>
        <p className="mt-3 text-center text-slate-600">
          حساب واحد لطلب عرض السعر والاستشارة ومتابعة المشروع والفواتير.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => set("customer_type","individual")}
            className={`rounded-2xl border-2 p-4 font-black ${form.customer_type==="individual"?"border-blue-600 bg-blue-50":"border-slate-200"}`}>
            فرد
          </button>
          <button type="button" onClick={() => set("customer_type","company")}
            className={`rounded-2xl border-2 p-4 font-black ${form.customer_type==="company"?"border-orange-500 bg-orange-50":"border-slate-200"}`}>
            شركة أو جهة
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="الاسم الكامل"><input className="form-input" value={form.full_name} onChange={e=>set("full_name",e.target.value)} /></Field>
          {form.customer_type==="company" && <Field label="اسم الشركة"><input className="form-input" value={form.company_name} onChange={e=>set("company_name",e.target.value)} /></Field>}
          <Field label="الجوال"><input className="form-input" dir="ltr" value={form.phone} onChange={e=>set("phone",e.target.value)} /></Field>
          <Field label={form.customer_type==="company"?"البريد التجاري":"البريد الإلكتروني"}><input type="email" className="form-input" dir="ltr" value={form.email} onChange={e=>set("email",e.target.value)} /></Field>
          <Field label="المدينة"><input className="form-input" value={form.city} onChange={e=>set("city",e.target.value)} /></Field>
          <Field label="كلمة المرور"><input type="password" className="form-input" value={form.password} onChange={e=>set("password",e.target.value)} /></Field>
        </div>

        {errorMessage && <div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{errorMessage}</div>}
        {message && <div className="mt-5 rounded-xl bg-green-50 p-4 text-green-800">{message}</div>}

        <button disabled={submitting}
          className="mt-7 w-full rounded-2xl bg-[#ff7417] px-6 py-4 font-black text-white disabled:opacity-60">
          {submitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب والمتابعة"}
        </button>

        <Link to="/portal/login" state={{ from: redirectTo }}
          className="mt-4 block w-full rounded-2xl border-2 border-[#071d49] px-6 py-4 text-center font-black text-[#071d49]">
          لدي حساب بالفعل — تسجيل الدخول
        </Link>

        <Link to="/" className="mt-3 block text-center font-bold text-slate-600">
          العودة إلى الموقع
        </Link>
      </form>
    </div>
  );
}

function Field({label,children}) {
  return <label><span className="mb-2 block font-bold">{label}</span>{children}</label>;
}
