import { useEffect, useMemo, useState } from "react";
import {
  FaFloppyDisk,
  FaMagnifyingGlass,
  FaPen,
  FaPlus,
  FaRotate,
  FaTrash,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const initialForm = {
  id: "",
  title_ar: "",
  title_en: "",
  description: "",
  icon_name: "",
  image_url: "",
  status: "active",
  sort_order: 0,
};

export default function AdminServices() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } = await supabase
        .from("ict_services")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      setItems(data || []);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر تحميل الخدمات.",
      });
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

  function editItem(item) {
    setForm({
      id: item.id,
      title_ar: item.title_ar || "",
      title_en: item.title_en || "",
      description: item.description || "",
      icon_name: item.icon_name || "",
      image_url: item.image_url || "",
      status: item.status || "active",
      sort_order: item.sort_order || 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        title_ar: form.title_ar.trim(),
        title_en: form.title_en.trim() || null,
        description: form.description.trim() || null,
        icon_name: form.icon_name.trim() || null,
        image_url: form.image_url.trim() || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      };

      if (!payload.title_ar) {
        throw new Error("اسم الخدمة بالعربية مطلوب.");
      }

      const query = form.id
        ? supabase
            .from("ict_services")
            .update(payload)
            .eq("id", form.id)
        : supabase.from("ict_services").insert(payload);

      const { error } = await query;

      if (error) {
        throw error;
      }

      setForm(initialForm);
      setMessage({
        type: "success",
        text: form.id
          ? "تم تحديث الخدمة."
          : "تمت إضافة الخدمة.",
      });
      await loadItems();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "تعذر حفظ الخدمة.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item) {
    if (
      !window.confirm(
        `هل تريد حذف خدمة "${item.title_ar}"؟`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("ict_services")
      .delete()
      .eq("id", item.id);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setItems((current) =>
      current.filter((row) => row.id !== item.id)
    );
  }

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return items;
    }

    return items.filter((item) =>
      [
        item.title_ar,
        item.title_en,
        item.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [items, searchTerm]);

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Header
          title="إدارة الخدمات"
          description="إضافة الخدمات وترتيب ظهورها في الموقع."
          loading={loading}
          onRefresh={loadItems}
        />

        <form
          onSubmit={saveItem}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            {form.id ? "تعديل الخدمة" : "إضافة خدمة"}
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="اسم الخدمة بالعربية"
              value={form.title_ar}
              required
              onChange={(value) =>
                updateField("title_ar", value)
              }
            />
            <Field
              label="اسم الخدمة بالإنجليزية"
              value={form.title_en}
              dir="ltr"
              onChange={(value) =>
                updateField("title_en", value)
              }
            />
            <Field
              label="اسم الأيقونة"
              value={form.icon_name}
              placeholder="FaServer"
              dir="ltr"
              onChange={(value) =>
                updateField("icon_name", value)
              }
            />
            <Field
              label="رابط الصورة"
              value={form.image_url}
              dir="ltr"
              onChange={(value) =>
                updateField("image_url", value)
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
            <label className="md:col-span-2">
              <span className="mb-2 block font-bold text-slate-700">
                وصف الخدمة
              </span>
              <textarea
                rows={5}
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                className="form-input resize-none"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60"
            >
              {form.id ? <FaFloppyDisk /> : <FaPlus />}
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold"
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>

        <Notice message={message} />

        <Search
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ابحث في الخدمات"
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                {item.title_en || "SERVICE"}
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#071d49]">
                {item.title_ar}
              </h3>
              <p className="mt-4 leading-7 text-slate-600">
                {item.description || "لا يوجد وصف."}
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => editItem(item)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 font-bold text-blue-800"
                >
                  <FaPen />
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 font-bold text-red-700"
                >
                  <FaTrash />
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header({
  title,
  description,
  loading,
  onRefresh,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl font-black text-[#071d49]">
          {title}
        </h1>
        <p className="mt-3 text-slate-600">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white disabled:opacity-60"
      >
        <FaRotate />
        تحديث
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
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
        placeholder={placeholder}
        dir={dir}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      />
    </label>
  );
}

function Search({
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="relative">
        <FaMagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none"
        />
      </div>
    </div>
  );
}

function Notice({ message }) {
  if (!message.text) {
    return null;
  }

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
