import { useEffect, useState } from "react";
import { FaMagnifyingGlass, FaRotate } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

export default function AdminPortalUsers() {
  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [u, c] = await Promise.all([
      supabase
        .from("ict_customer_portal_users")
        .select("*,customer:ict_customers(id,name,company_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_customers")
        .select("id,name,company_name,email")
        .order("name"),
    ]);

    const error = u.error || c.error;
    if (error) return setMessage(error.message);

    setRows(u.data || []);
    setCustomers(c.data || []);
  }

  async function lookupAccount(event) {
    event?.preventDefault();
    setMessage("");
    setAccount(null);
    setCustomerId("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setMessage("أدخل البريد الإلكتروني أولًا.");

    setLooking(true);
    const { data, error } = await supabase.rpc("ict_lookup_portal_auth_user_by_email", {
      p_email: cleanEmail,
    });
    setLooking(false);

    if (error) return setMessage(error.message);

    const found = Array.isArray(data) ? data[0] : data;
    if (!found?.user_id) {
      return setMessage("لا يوجد حساب مسجل بهذا البريد الإلكتروني.");
    }

    setAccount(found);

    const matchedCustomer = customers.find(
      (x) => (x.email || "").trim().toLowerCase() === cleanEmail
    );
    if (matchedCustomer) setCustomerId(matchedCustomer.id);
  }

  async function save(event) {
    event.preventDefault();
    setMessage("");

    if (!account?.user_id) {
      return setMessage("ابحث عن حساب المستخدم بالبريد أولًا.");
    }
    if (!customerId) {
      return setMessage("اختر العميل المراد ربط الحساب به.");
    }

    setSaving(true);
    const { error } = await supabase
      .from("ict_customer_portal_users")
      .upsert(
        {
          user_id: account.user_id,
          customer_id: customerId,
          full_name: account.full_name || null,
          email: account.email || email.trim().toLowerCase(),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    setSaving(false);

    if (error) return setMessage(error.message);

    setEmail("");
    setAccount(null);
    setCustomerId("");
    setMessage("تم ربط حساب العميل بنجاح.");
    await load();
  }

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1400px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">CUSTOMER PORTAL USERS</span>
            <h1 className="erp-page-title">مستخدمو بوابة العملاء</h1>
            <p className="erp-page-subtitle">
              ابحث بالبريد الإلكتروني ثم اربط الحساب بالعميل المناسب.
            </p>
          </div>
          <button onClick={load} className="erp-btn-secondary">
            <FaRotate />
            تحديث
          </button>
        </section>

        <form
          onSubmit={lookupAccount}
          className="erp-card mt-6 grid gap-4 p-6 lg:grid-cols-[1fr_auto]"
        >
          <label>
            <span className="mb-2 block font-black text-[#0f2747]">البريد الإلكتروني</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAccount(null);
                setCustomerId("");
              }}
              placeholder="name@company.com"
              className="form-input"
              autoComplete="off"
            />
          </label>

          <button
            type="submit"
            disabled={looking}
            className="erp-btn-primary self-end"
          >
            <FaMagnifyingGlass />
            {looking ? "جاري البحث..." : "بحث عن الحساب"}
          </button>
        </form>

        {account && (
          <form onSubmit={save} className="erp-card mt-5 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnly label="اسم المستخدم" value={account.full_name || "—"} />
              <ReadOnly label="البريد" value={account.email || email} dir="ltr" />

              <label className="md:col-span-2">
                <span className="mb-2 block font-black text-[#0f2747]">العميل / الشركة</span>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="form-input"
                >
                  <option value="">اختر العميل</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name || customer.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              disabled={saving}
              className="mt-5 w-full rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : "ربط الحساب بالعميل"}
            </button>
          </form>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">
            {message}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-black text-[#0f2747]">الحسابات المرتبطة</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <article key={row.user_id} className="erp-card p-6">
                <h3 className="text-lg font-black text-[#0f2747]">
                  {row.customer?.company_name || row.customer?.name || "عميل"}
                </h3>
                <p className="mt-2 font-bold">{row.full_name || "—"}</p>
                <p dir="ltr" className="mt-2 text-right text-sm text-slate-500">
                  {row.email || "—"}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReadOnly({ label, value, dir }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="block text-xs font-bold text-slate-400">{label}</span>
      <strong dir={dir} className="mt-2 block text-[#0f2747]">{value}</strong>
    </div>
  );
}
