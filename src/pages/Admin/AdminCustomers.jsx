import { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaMagnifyingGlass,
  FaPen,
  FaPlus,
  FaRotate,
  FaTrash,
  FaUser,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const emptyForm = {
  id: "",
  customer_type: "company",
  name: "",
  company_name: "",
  email: "",
  phone: "",
  city: "",
  source: "",
  status: "active",
  notes: "",
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const { data, error } = await supabase
      .from("ict_customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function editCustomer(customer) {
    setForm({
      id: customer.id,
      customer_type: customer.customer_type || "company",
      name: customer.name || "",
      company_name: customer.company_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      city: customer.city || "",
      source: customer.source || "",
      status: customer.status || "active",
      notes: customer.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCustomer(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      if (!form.name.trim()) {
        throw new Error("اسم العميل مطلوب.");
      }

      const { data: authData } = await supabase.auth.getUser();

      const payload = {
        customer_type: form.customer_type,
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        source: form.source.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (form.id) {
        result = await supabase
          .from("ict_customers")
          .update(payload)
          .eq("id", form.id);
      } else {
        result = await supabase
          .from("ict_customers")
          .insert({
            ...payload,
            created_by: authData.user?.id || null,
          });
      }

      if (result.error) throw result.error;

      setMessage({
        type: "success",
        text: form.id ? "تم تحديث العميل." : "تمت إضافة العميل.",
      });

      setForm(emptyForm);
      await loadCustomers();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "تعذر حفظ العميل.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`هل تريد حذف "${customer.name}"؟`)) {
      return;
    }

    const { error } = await supabase
      .from("ict_customers")
      .delete()
      .eq("id", customer.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    await loadCustomers();
  }

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.company_name,
        customer.email,
        customer.phone,
        customer.city,
        customer.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [customers, searchTerm]);

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              العملاء
            </h1>
            <p className="mt-3 text-slate-600">
              إدارة قاعدة بيانات العملاء وربطهم بالفرص البيعية.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCustomers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white disabled:opacity-60"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <form
          onSubmit={saveCustomer}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-[#071d49]">
              {form.id ? "تعديل العميل" : "إضافة عميل"}
            </h2>

            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="rounded-xl border border-slate-300 px-4 py-2 font-bold"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Select
              label="نوع العميل"
              value={form.customer_type}
              onChange={(v) => setField("customer_type", v)}
              options={[
                ["company", "شركة أو جهة"],
                ["individual", "فرد"],
              ]}
            />

            <Input
              label="اسم جهة الاتصال"
              value={form.name}
              onChange={(v) => setField("name", v)}
            />

            <Input
              label="اسم الشركة"
              value={form.company_name}
              onChange={(v) => setField("company_name", v)}
            />

            <Input
              label="البريد"
              value={form.email}
              dir="ltr"
              type="email"
              onChange={(v) => setField("email", v)}
            />

            <Input
              label="الجوال"
              value={form.phone}
              dir="ltr"
              onChange={(v) => setField("phone", v)}
            />

            <Input
              label="المدينة"
              value={form.city}
              onChange={(v) => setField("city", v)}
            />

            <Input
              label="مصدر العميل"
              value={form.source}
              placeholder="Website / RFQ / Referral"
              onChange={(v) => setField("source", v)}
            />

            <Select
              label="الحالة"
              value={form.status}
              onChange={(v) => setField("status", v)}
              options={[
                ["active", "نشط"],
                ["lead", "Lead"],
                ["inactive", "غير نشط"],
              ]}
            />

            <label className="md:col-span-2">
              <span className="mb-2 block font-bold text-slate-700">
                ملاحظات
              </span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setField("notes", event.target.value)
                }
                className="form-input resize-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60"
          >
            <FaPlus />
            {saving ? "جارٍ الحفظ..." : "حفظ العميل"}
          </button>
        </form>

        <Notice message={message} />

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <FaMagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالاسم أو الشركة أو البريد أو الجوال"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <article
              key={customer.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
                  {customer.customer_type === "company" ? (
                    <FaBuilding />
                  ) : (
                    <FaUser />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xl font-black text-[#071d49]">
                    {customer.company_name || customer.name}
                  </h3>
                  {customer.company_name && (
                    <p className="mt-1 text-sm text-slate-500">
                      {customer.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm text-slate-600">
                <p dir="ltr">{customer.email || "—"}</p>
                <p dir="ltr">{customer.phone || "—"}</p>
                <p>{customer.city || "—"}</p>
                <p className="font-bold text-blue-700">
                  {customer.status}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={`/admin/pipeline?customer=${customer.id}`}
                  className="rounded-xl bg-[#123878] px-4 py-2 font-bold text-white"
                >
                  إنشاء فرصة
                </Link>

                <button
                  type="button"
                  onClick={() => editCustomer(customer)}
                  className="rounded-xl bg-blue-100 p-3 text-blue-800"
                >
                  <FaPen />
                </button>

                <button
                  type="button"
                  onClick={() => deleteCustomer(customer)}
                  className="rounded-xl bg-red-100 p-3 text-red-700"
                >
                  <FaTrash />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  dir,
  placeholder,
}) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Notice({ message }) {
  if (!message.text) return null;

  return (
    <div
      className={[
        "mt-6 rounded-2xl border p-5",
        message.type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700",
      ].join(" ")}
    >
      {message.text}
    </div>
  );
}
