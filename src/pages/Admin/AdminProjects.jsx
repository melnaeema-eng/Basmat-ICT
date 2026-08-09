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
  title: "",
  category: "",
  city: "",
  client_name: "",
  image_url: "",
  description: "",
  status: "active",
  sort_order: 0,
};

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("ict_projects")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setProjects(data || []);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "تعذر تحميل المشاريع. تأكد من تنفيذ ملف SQL وتسجيل دخول الإدارة."
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

  function editProject(project) {
    setForm({
      id: project.id,
      title: project.title || "",
      category: project.category || "",
      city: project.city || "",
      client_name: project.client_name || "",
      image_url: project.image_url || "",
      description: project.description || "",
      status: project.status || "active",
      sort_order: project.sort_order || 0,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(initialForm);
  }

  async function saveProject(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || null,
        city: form.city.trim() || null,
        client_name: form.client_name.trim() || null,
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      };

      if (!payload.title) {
        throw new Error("اسم المشروع مطلوب.");
      }

      const query = form.id
        ? supabase
            .from("ict_projects")
            .update(payload)
            .eq("id", form.id)
        : supabase
            .from("ict_projects")
            .insert(payload);

      const { error } = await query;

      if (error) {
        throw error;
      }

      setSuccessMessage(
        form.id
          ? "تم تحديث المشروع."
          : "تمت إضافة المشروع."
      );

      resetForm();
      await loadProjects();
    } catch (error) {
      setErrorMessage(
        error.message || "تعذر حفظ المشروع."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project) {
    const confirmed = window.confirm(
      `هل تريد حذف مشروع "${project.title}"؟`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ict_projects")
        .delete()
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      setProjects((current) =>
        current.filter(
          (item) => item.id !== project.id
        )
      );
    } catch (error) {
      setErrorMessage(
        error.message || "تعذر حذف المشروع."
      );
    }
  }

  const filteredProjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return projects;
    }

    return projects.filter((project) =>
      [
        project.title,
        project.category,
        project.city,
        project.client_name,
        project.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [projects, searchTerm]);

  return (
    <AdminContentPage
      title="إدارة المشاريع"
      description="إضافة المشاريع وتعديلها وترتيب ظهورها في الموقع."
      loading={loading}
      onRefresh={loadProjects}
    >
      <form
        onSubmit={saveProject}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#071d49]">
            {form.id ? "تعديل المشروع" : "إضافة مشروع"}
          </h2>

          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Input
            label="اسم المشروع"
            required
            value={form.title}
            onChange={(value) =>
              updateField("title", value)
            }
          />

          <Input
            label="التصنيف"
            value={form.category}
            placeholder="Data Center / ICT / ELV"
            onChange={(value) =>
              updateField("category", value)
            }
          />

          <Input
            label="المدينة"
            value={form.city}
            onChange={(value) =>
              updateField("city", value)
            }
          />

          <Input
            label="العميل"
            value={form.client_name}
            onChange={(value) =>
              updateField("client_name", value)
            }
          />

          <Input
            label="رابط الصورة"
            value={form.image_url}
            dir="ltr"
            onChange={(value) =>
              updateField("image_url", value)
            }
          />

          <Input
            label="ترتيب الظهور"
            type="number"
            value={form.sort_order}
            onChange={(value) =>
              updateField("sort_order", value)
            }
          />

          <Select
            label="الحالة"
            value={form.status}
            options={[
              { value: "active", label: "ظاهر" },
              { value: "inactive", label: "مخفي" },
              { value: "completed", label: "مكتمل" },
              { value: "in_progress", label: "قيد التنفيذ" },
            ]}
            onChange={(value) =>
              updateField("status", value)
            }
          />

          <div className="md:col-span-2">
            <Textarea
              label="وصف المشروع"
              value={form.description}
              onChange={(value) =>
                updateField("description", value)
              }
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60"
        >
          {form.id ? <FaFloppyDisk /> : <FaPlus />}
          {saving
            ? "جارٍ الحفظ..."
            : form.id
              ? "حفظ التعديلات"
              : "إضافة المشروع"}
        </button>
      </form>

      <Messages
        error={errorMessage}
        success={successMessage}
      />

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="ابحث في المشاريع"
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {filteredProjects.map((project) => (
          <article
            key={project.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            {project.image_url && (
              <img
                src={project.image_url}
                alt={project.title}
                className="h-52 w-full object-cover"
              />
            )}

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-[#071d49]">
                    {project.title}
                  </h3>

                  <p className="mt-2 text-slate-500">
                    {project.category || "بدون تصنيف"}
                  </p>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                  {project.status}
                </span>
              </div>

              <p className="mt-4 leading-7 text-slate-600">
                {project.description || "لا يوجد وصف."}
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => editProject(project)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 font-bold text-blue-800"
                >
                  <FaPen />
                  تعديل
                </button>

                <button
                  type="button"
                  onClick={() => deleteProject(project)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 font-bold text-red-700"
                >
                  <FaTrash />
                  حذف
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminContentPage>
  );
}

function AdminContentPage({
  title,
  description,
  loading,
  onRefresh,
  children,
}) {
  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
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
            {loading ? "جارٍ التحميل..." : "تحديث"}
          </button>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function Input({
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
        {required && (
          <span className="mr-1 text-red-500">*</span>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        placeholder={placeholder}
        dir={dir}
        className="form-input"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <textarea
        rows={5}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input resize-none"
      />
    </label>
  );
}

function SearchBox({
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

function Messages({ error, success }) {
  return (
    <>
      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">
          {success}
        </div>
      )}
    </>
  );
}
