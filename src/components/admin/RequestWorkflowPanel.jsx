import { useEffect, useState } from "react";
import {
  FaClockRotateLeft,
  FaFloppyDisk,
  FaUserGear,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const STATUS_OPTIONS = [
  ["new", "جديد"],
  ["reviewing", "قيد المراجعة"],
  ["waiting_customer", "بانتظار العميل"],
  ["in_progress", "قيد التنفيذ"],
  ["completed", "مكتمل"],
  ["cancelled", "ملغي"],
];

const PRIORITY_OPTIONS = [
  ["low", "منخفضة"],
  ["normal", "عادية"],
  ["high", "عالية"],
  ["urgent", "عاجلة"],
];

export default function RequestWorkflowPanel({
  requestType,
  request,
  onUpdated,
}) {
  const tableName =
    requestType === "rfq"
      ? "ict_rfq_requests"
      : "ict_consultation_requests";

  const [team, setTeam] = useState([]);
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState(
    request.status || "new"
  );
  const [priority, setPriority] = useState(
    request.priority || "normal"
  );
  const [assignedTo, setAssignedTo] = useState(
    request.assigned_to || ""
  );
  const [internalNotes, setInternalNotes] = useState(
    request.internal_notes || ""
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadTeam();
    loadActivities();
  }, [request.id]);

  async function loadTeam() {
    const { data, error } = await supabase
      .from("ict_team_members")
      .select("id, full_name, job_title, department")
      .eq("is_active", true)
      .order("full_name");

    if (!error) {
      setTeam(data || []);
    }
  }

  async function loadActivities() {
    const { data, error } = await supabase
      .from("ict_request_activities")
      .select("*")
      .eq("request_type", requestType)
      .eq("request_id", request.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setActivities(data || []);
    }
  }

  async function addActivity(
    actionType,
    note,
    oldValue = null,
    newValue = null
  ) {
    const { data: authData } =
      await supabase.auth.getUser();

    const { error } = await supabase
      .from("ict_request_activities")
      .insert({
        request_type: requestType,
        request_id: request.id,
        action_type: actionType,
        note: note || null,
        old_value: oldValue,
        new_value: newValue,
        created_by: authData.user?.id || null,
      });

    if (error) {
      throw error;
    }
  }

  async function saveWorkflow() {
    setSaving(true);
    setErrorMessage("");

    try {
      const changes = [];

      if ((request.status || "new") !== status) {
        changes.push([
          "status_changed",
          "تم تغيير حالة الطلب",
          request.status || "new",
          status,
        ]);
      }

      if (
        (request.priority || "normal") !== priority
      ) {
        changes.push([
          "priority_changed",
          "تم تغيير أولوية الطلب",
          request.priority || "normal",
          priority,
        ]);
      }

      if (
        (request.assigned_to || "") !== assignedTo
      ) {
        changes.push([
          "assignment_changed",
          "تم تغيير المسؤول عن الطلب",
          request.assigned_to || "",
          assignedTo || "",
        ]);
      }

      if (
        (request.internal_notes || "") !==
        internalNotes
      ) {
        changes.push([
          "note_updated",
          "تم تحديث الملاحظات الداخلية",
          null,
          null,
        ]);
      }

      const { error } = await supabase
        .from(tableName)
        .update({
          status,
          priority,
          assigned_to: assignedTo || null,
          internal_notes:
            internalNotes.trim() || null,
          workflow_updated_at:
            new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) {
        throw error;
      }

      for (const change of changes) {
        await addActivity(...change);
      }

      await loadActivities();

      if (onUpdated) {
        await onUpdated();
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.message ||
          "تعذر تحديث سير العمل."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="flex items-center gap-3">
        <FaUserGear className="text-xl text-blue-700" />
        <h3 className="text-xl font-black text-[#071d49]">
          إدارة الطلب
        </h3>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field label="الحالة">
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="form-input"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="الأولوية">
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value)
            }
            className="form-input"
          >
            {PRIORITY_OPTIONS.map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </Field>

        <Field label="المسؤول">
          <select
            value={assignedTo}
            onChange={(event) =>
              setAssignedTo(event.target.value)
            }
            className="form-input"
          >
            <option value="">غير معين</option>

            {team.map((member) => (
              <option
                key={member.id}
                value={member.id}
              >
                {member.full_name}
                {member.job_title
                  ? ` — ${member.job_title}`
                  : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block font-bold text-slate-700">
          ملاحظات داخلية
        </span>

        <textarea
          rows={4}
          value={internalNotes}
          onChange={(event) =>
            setInternalNotes(event.target.value)
          }
          placeholder="هذه الملاحظات لا تظهر للعميل."
          className="form-input resize-none"
        />
      </label>

      <button
        type="button"
        onClick={saveWorkflow}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60"
      >
        <FaFloppyDisk />
        {saving
          ? "جارٍ الحفظ..."
          : "حفظ التحديث"}
      </button>

      <div className="mt-7 border-t border-blue-100 pt-5">
        <div className="flex items-center gap-2 font-black text-[#071d49]">
          <FaClockRotateLeft />
          سجل المتابعة
        </div>

        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            لا توجد تحديثات مسجلة بعد.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="font-bold text-slate-700">
                  {activity.note ||
                    activity.action_type}
                </p>

                {(activity.old_value ||
                  activity.new_value) && (
                  <p
                    dir="ltr"
                    className="mt-1 text-xs text-slate-500"
                  >
                    {activity.old_value || "—"}
                    {" → "}
                    {activity.new_value || "—"}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-400">
                  {formatDate(activity.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
