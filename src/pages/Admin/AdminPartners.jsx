import { useEffect, useMemo, useState } from "react";
import {
  FaMagnifyingGlass,
  FaPen,
  FaPlus,
  FaRotate,
  FaTrash,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const initialForm = {
  id: "",
  name: "",
  category: "",
  logo_url: "",
  website_url: "",
  status: "active",
  sort_order: 0,
};

export default function AdminPartners() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("ict_partners")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      setPartners(data || []);
    } catch (error) {
      setMessage(
        error.message || "تعذر تحميل الشركاء."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function savePartner(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (!form.name.trim()) {
        throw new Error("اسم الشريك مطلوب.");
      }

      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        logo_url: form.logo_url.trim() || null,
        website_url:
          form.website_url.trim() || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      };

      const query = form.id
        ? supabase
            .from("ict_partners")
            .update(payload)
            .eq("id", form.id)
        : supabase
            .from("ict_partners")
            .insert(payload);

      const { error } = await query;

      if (error) {
        throw error;
      }

      setForm(initialForm);
      await loadPartners();
    } catch (error) {
      setMessage(
        error.message || "تعذر حفظ الشريك."
      );
    }
  }

  async function deletePartner(partner) {
    if (
      !window.confirm(
        `هل تريد حذف "${partner.name}"؟`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("ict_partners")
      .delete()
      .eq("id", partner.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPartners((current) =>
      current.filter(
        (item) => item.id !== partner.id
      )
    );
  }

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return partners;
    }

    return partners.filter((partner) =>
      [partner.name, partner.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [partners, searchTerm]);

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              إدارة الشركاء
            </h1>
            <p className="mt-3 text-slate-600">
              إدارة شعارات المصنعين والشركاء التقنيين.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPartners}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <form
          onSubmit={savePartner}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            {form.id ? "تعديل الشريك" : "إضافة شريك"}
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="اسم الشريك"
              value={form.name}
              required
              onChange={(value) =>
                updateField("name", value)
              }
            />
            <Field
              label="التصنيف"
              value={form.category}
              onChange={(value) =>
                updateField("category", value)
              }
            />
            <Field
              label="رابط الشعار"
              value={form.logo_url}
              dir="ltr"
              onChange={(value) =>
                updateField("logo_url", value)
              }
            />
            <Field
              label="رابط الموقع"
              value={form.website_url}
              dir="ltr"
              onChange={(value) =>
                updateField("website_url", value)
              }
            />
            <Field
              label="ترتيب الظهور"
              value={form.sort_order}
              type="number"
              onChange={(value) =>
                updateField("sort_order", value)
              }
            />
            <label>
              <span className="mb-2 block font-bold text-slate-700">
                الحالة
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value
                  )
                }
                className="form-input"
              >
                <option value="active">ظاهر</option>
                <option value="inactive">مخفي</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white"
            >
              <FaPlus />
              حفظ
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold"
              >
                إلغاء
              </button>
            )}
          </div>
        </form>

        {message && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {message}
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <FaMagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="ابحث في الشركاء"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((partner) => (
            <article
              key={partner.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm"
            >
              <div className="flex h-28 items-center justify-center rounded-2xl bg-slate-50 p-4">
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xl font-black text-slate-400">
                    {partner.name}
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-xl font-black text-[#071d49]">
                {partner.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {partner.category || "بدون تصنيف"}
              </p>

              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: partner.id,
                      name: partner.name || "",
                      category:
                        partner.category || "",
                      logo_url:
                        partner.logo_url || "",
                      website_url:
                        partner.website_url || "",
                      status:
                        partner.status || "active",
                      sort_order:
                        partner.sort_order || 0,
                    })
                  }
                  className="rounded-xl bg-blue-100 p-3 text-blue-800"
                >
                  <FaPen />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deletePartner(partner)
                  }
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

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  dir,
}) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        dir={dir}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      />
    </label>
  );
}
