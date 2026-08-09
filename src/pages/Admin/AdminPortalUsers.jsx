import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPortalUsers() {
  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    user_id: "",
    customer_id: "",
    full_name: "",
    email: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [u, c] = await Promise.all([
      supabase.from("ict_customer_portal_users")
        .select("*,customer:ict_customers(id,name,company_name)")
        .order("created_at", { ascending: false }),
      supabase.from("ict_customers")
        .select("id,name,company_name,email")
        .order("name"),
    ]);

    const error = u.error || c.error;
    if (error) return setMessage(error.message);

    setRows(u.data || []);
    setCustomers(c.data || []);
  }

  async function save(event) {
    event.preventDefault();
    setMessage("");

    if (!form.user_id || !form.customer_id) {
      return setMessage("User UID والعميل مطلوبان.");
    }

    const { error } = await supabase.from("ict_customer_portal_users").upsert({
      user_id: form.user_id.trim(),
      customer_id: form.customer_id,
      full_name: form.full_name.trim() || null,
      email: form.email.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) return setMessage(error.message);

    setForm({ user_id: "", customer_id: "", full_name: "", email: "" });
    setMessage("تم ربط حساب العميل.");
    await load();
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">مستخدمو بوابة العملاء</h1>
        <p className="mt-3 text-slate-600">
          أنشئ المستخدم أولًا في Supabase Authentication ثم اربط User UID بالعميل هنا.
        </p>

        <form onSubmit={save} className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <Input label="Supabase User UID" value={form.user_id}
            onChange={(v) => setForm((x) => ({ ...x, user_id: v }))} />

          <label>
            <span className="mb-2 block font-bold">العميل</span>
            <select value={form.customer_id}
              onChange={(e) => {
                const customer = customers.find((x) => x.id === e.target.value);
                setForm((x) => ({
                  ...x,
                  customer_id: e.target.value,
                  email: x.email || customer?.email || "",
                }));
              }}
              className="form-input">
              <option value="">اختر العميل</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name || customer.name}
                </option>
              ))}
            </select>
          </label>

          <Input label="اسم المستخدم" value={form.full_name}
            onChange={(v) => setForm((x) => ({ ...x, full_name: v }))} />

          <Input label="البريد" value={form.email}
            onChange={(v) => setForm((x) => ({ ...x, email: v }))} />

          <button className="rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white md:col-span-2">
            حفظ الربط
          </button>
        </form>

        {message && <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-blue-800">{message}</div>}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.user_id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#071d49]">
                {row.customer?.company_name || row.customer?.name}
              </h2>
              <p className="mt-2">{row.full_name || "—"}</p>
              <p dir="ltr" className="mt-2 text-right text-sm text-slate-500">{row.email || "—"}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-2 block font-bold">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="form-input" />
    </label>
  );
}
