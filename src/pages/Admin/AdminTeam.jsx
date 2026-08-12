import { useEffect, useState } from "react";
import {
  FaPen,
  FaPlus,
  FaRotate,
  FaTrash,
  FaBoxArchive,
  FaCircleCheck,
  FaBan,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const emptyForm = {
  id: "",
  full_name: "",
  job_title: "",
  email: "",
  department: "",
  is_active: true,
  is_archived: false,
};

export default function AdminTeam() {
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("ict_team_members")
      .select("*")
      .order("full_name");

    if (error) {
      setMessage(error.message);
    } else {
      setTeam(data || []);
    }

    setLoading(false);
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveMember(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (!form.full_name.trim()) {
        throw new Error("اسم الموظف مطلوب.");
      }

      const payload = {
        full_name: form.full_name.trim(),
        job_title:
          form.job_title.trim() || null,
        email: form.email.trim() || null,
        department:
          form.department.trim() || null,
        is_active: form.is_active,
        is_archived: Boolean(form.is_archived),
        archived_at: form.is_archived ? new Date().toISOString() : null,
      };

      const query = form.id
        ? supabase
            .from("ict_team_members")
            .update(payload)
            .eq("id", form.id)
        : supabase
            .from("ict_team_members")
            .insert(payload);

      const { error } = await query;

      if (error) throw error;

      setForm(emptyForm);
      await loadTeam();
    } catch (error) {
      setMessage(
        error.message || "تعذر حفظ الموظف."
      );
    }
  }

  async function setMemberLifecycle(member, action) {
    setMessage("");

    const changes =
      action === "archive"
        ? { is_archived: true, archived_at: new Date().toISOString(), is_active: false }
        : action === "restore"
        ? { is_archived: false, archived_at: null, is_active: true }
        : action === "disable"
        ? { is_active: false }
        : { is_active: true };

    const { error } = await supabase
      .from("ict_team_members")
      .update(changes)
      .eq("id", member.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadTeam();
  }

  async function removeMember(member) {
    if (!window.confirm(
      `حذف نهائي للموظف ${member.full_name}؟\nلن يسمح النظام بالحذف إذا كانت لديه معاملات مسندة.`
    )) return;

    const { data, error } = await supabase.rpc(
      "ict_safe_delete_team_member",
      { p_member_id: member.id }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.deleted) {
      const blockers = Array.isArray(data?.blockers)
        ? data.blockers.join("، ")
        : "";
      setMessage(
        `${data?.message || "تعذر الحذف."}${blockers ? ` الموانع: ${blockers}` : ""}`
      );
      return;
    }

    await loadTeam();
  }

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              فريق العمل
            </h1>

            <p className="mt-3 text-slate-600">
              أضف مسؤولي المبيعات والمهندسين لتوزيع الطلبات عليهم.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTeam}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <form
          onSubmit={saveMember}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            {form.id
              ? "تعديل عضو الفريق"
              : "إضافة عضو فريق"}
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Input
              label="الاسم"
              value={form.full_name}
              onChange={(v) =>
                updateField("full_name", v)
              }
            />

            <Input
              label="المسمى الوظيفي"
              value={form.job_title}
              onChange={(v) =>
                updateField("job_title", v)
              }
            />

            <Input
              label="البريد الإلكتروني"
              value={form.email}
              type="email"
              dir="ltr"
              onChange={(v) =>
                updateField("email", v)
              }
            />

            <Input
              label="القسم"
              value={form.department}
              placeholder="Sales / Engineering"
              onChange={(v) =>
                updateField("department", v)
              }
            />

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField(
                    "is_active",
                    event.target.checked
                  )
                }
              />
              <span className="font-bold">
                عضو نشط
              </span>
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
                onClick={() =>
                  setForm(emptyForm)
                }
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

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {team.map((member) => (
            <article
              key={member.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-black text-[#071d49]">
                {member.full_name}
              </h3>

              <p className="mt-2 text-slate-600">
                {member.job_title ||
                  "بدون مسمى وظيفي"}
              </p>

              <p
                dir="ltr"
                className="mt-2 text-sm text-slate-500"
              >
                {member.email || "—"}
              </p>

              <p className="mt-2 text-sm font-bold text-blue-700">
                {member.department || "—"}
              </p>

              <p className="mt-2 text-sm font-black text-slate-600">
                {member.is_archived
                  ? "مؤرشف"
                  : member.is_active
                  ? "نشط"
                  : "معطل مؤقتًا"}
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: member.id,
                      full_name:
                        member.full_name || "",
                      job_title:
                        member.job_title || "",
                      email:
                        member.email || "",
                      department:
                        member.department || "",
                      is_active:
                        member.is_active,
                      is_archived:
                        Boolean(member.is_archived),
                    })
                  }
                  className="rounded-xl bg-blue-100 p-3 text-blue-800"
                >
                  <FaPen />
                </button>

                {!member.is_archived && member.is_active && (
                  <button
                    type="button"
                    title="تعطيل مؤقت"
                    onClick={() => setMemberLifecycle(member, "disable")}
                    className="rounded-xl bg-amber-100 p-3 text-amber-800"
                  >
                    <FaBan />
                  </button>
                )}

                {!member.is_archived && !member.is_active && (
                  <button
                    type="button"
                    title="إعادة تفعيل"
                    onClick={() => setMemberLifecycle(member, "activate")}
                    className="rounded-xl bg-green-100 p-3 text-green-800"
                  >
                    <FaCircleCheck />
                  </button>
                )}

                {!member.is_archived ? (
                  <button
                    type="button"
                    title="أرشفة"
                    onClick={() => setMemberLifecycle(member, "archive")}
                    className="rounded-xl bg-slate-200 p-3 text-slate-700"
                  >
                    <FaBoxArchive />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="إعادة من الأرشيف"
                    onClick={() => setMemberLifecycle(member, "restore")}
                    className="rounded-xl bg-green-100 p-3 text-green-800"
                  >
                    <FaCircleCheck />
                  </button>
                )}

                <button
                  type="button"
                  title="حذف نهائي آمن"
                  onClick={() => removeMember(member)}
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      />
    </label>
  );
}
