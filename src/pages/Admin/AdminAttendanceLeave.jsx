import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRightFromBracket,
  FaCalendarDays,
  FaClock,
  FaPersonCircleCheck,
  FaRotate,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const leaveNames = {
  annual: "سنوية",
  sick: "مرضية",
  emergency: "طارئة",
  unpaid: "بدون راتب",
  other: "أخرى",
};

const statusNames = {
  pending: "قيد المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  cancelled: "ملغاة",
};

export default function AdminAttendanceLeave() {
  const { hasPermission, adminProfile } = useAdminAuth();
  const canManage = adminProfile?.role === "admin" || hasPermission("hr");

  const [today, setToday] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [leave, setLeave] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setBusy(true);
    setMessage("");

    const [todayRes, myLeavesRes] = await Promise.all([
      supabase.rpc("ict_hr_my_today"),
      supabase.rpc("ict_hr_my_leaves"),
    ]);

    if (todayRes.error) setMessage(todayRes.error.message);
    setToday(todayRes.data?.id ? todayRes.data : null);

    if (myLeavesRes.error) setMessage(myLeavesRes.error.message);
    setMyLeaves(myLeavesRes.data || []);

    if (canManage) {
      const [attRes, leaveRes, empRes] = await Promise.all([
        supabase
          .from("ict_hr_attendance")
          .select("*")
          .order("attendance_date", { ascending: false })
          .limit(100),
        supabase
          .from("ict_hr_leave_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("ict_hr_employees")
          .select("id,employee_code,full_name,email")
          .eq("status", "active"),
      ]);

      if (attRes.error) setMessage(attRes.error.message);
      if (leaveRes.error) setMessage(leaveRes.error.message);
      if (empRes.error) setMessage(empRes.error.message);

      setAttendance(attRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setEmployees(
        Object.fromEntries((empRes.data || []).map((e) => [e.id, e]))
      );
    }

    setBusy(false);
  }

  async function clock(action) {
    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc("ict_hr_clock", {
      p_action: action,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        action === "in"
          ? "تم تسجيل الحضور."
          : "تم تسجيل الانصراف."
      );
      await load();
    }

    setBusy(false);
  }

  async function submitLeave(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "ict_hr_submit_leave",
      {
        p_leave_type: leave.leave_type,
        p_start_date: leave.start_date,
        p_end_date: leave.end_date,
        p_reason: leave.reason || null,
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(`تم إرسال طلب الإجازة (${data.days_count} يوم).`);
      setLeave({
        leave_type: "annual",
        start_date: "",
        end_date: "",
        reason: "",
      });
      await load();
    }

    setBusy(false);
  }

  async function review(id, status) {
    const note = window.prompt("ملاحظة المراجعة (اختياري):") || null;

    setBusy(true);
    const { error } = await supabase.rpc("ict_hr_review_leave", {
      p_request_id: id,
      p_status: status,
      p_review_note: note,
    });

    if (error) setMessage(error.message);
    else {
      setMessage(status === "approved" ? "تم اعتماد الإجازة." : "تم رفض الإجازة.");
      await load();
    }
    setBusy(false);
  }

  const worked = useMemo(() => {
    if (!today?.clock_in || !today?.clock_out) return null;
    const ms = new Date(today.clock_out) - new Date(today.clock_in);
    const minutes = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
  }, [today]);

  const time = (value) =>
    value
      ? new Date(value).toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div dir="rtl" className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              الحضور والإجازات
            </h1>
            <p className="mt-2 text-slate-600">
              تسجيل الدوام وطلبات الإجازة المرتبطة بملف الموظف.
            </p>
          </div>
          <button
            onClick={load}
            disabled={busy}
            className="rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
          >
            <FaRotate className="ml-2 inline" />
            تحديث
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {message}
          </div>
        )}

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Card title="حضور اليوم" value={time(today?.clock_in)} icon={<FaPersonCircleCheck />} />
          <Card title="انصراف اليوم" value={time(today?.clock_out)} icon={<FaArrowRightFromBracket />} />
          <Card title="مدة العمل" value={worked || "—"} icon={<FaClock />} />
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">دوامي اليوم</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => clock("in")}
              disabled={busy || Boolean(today?.clock_in)}
              className="rounded-xl bg-green-600 px-6 py-3 font-black text-white disabled:opacity-40"
            >
              تسجيل حضور
            </button>
            <button
              onClick={() => clock("out")}
              disabled={busy || !today?.clock_in || Boolean(today?.clock_out)}
              className="rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-40"
            >
              تسجيل انصراف
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <form onSubmit={submitLeave} className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#071d49]">
              طلب إجازة
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <b className="mb-2 block">نوع الإجازة</b>
                <select
                  value={leave.leave_type}
                  onChange={(e) => setLeave({ ...leave, leave_type: e.target.value })}
                  className="w-full rounded-xl border p-3"
                >
                  {Object.entries(leaveNames).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                <b className="mb-2 block">من</b>
                <input
                  type="date"
                  value={leave.start_date}
                  onChange={(e) => setLeave({ ...leave, start_date: e.target.value })}
                  className="w-full rounded-xl border p-3"
                  required
                />
              </label>
              <label>
                <b className="mb-2 block">إلى</b>
                <input
                  type="date"
                  value={leave.end_date}
                  onChange={(e) => setLeave({ ...leave, end_date: e.target.value })}
                  className="w-full rounded-xl border p-3"
                  required
                />
              </label>
              <label className="md:col-span-2">
                <b className="mb-2 block">السبب / الملاحظات</b>
                <textarea
                  rows="3"
                  value={leave.reason}
                  onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                  className="w-full rounded-xl border p-3"
                />
              </label>
            </div>
            <button
              disabled={busy}
              className="mt-5 rounded-xl bg-[#071d49] px-6 py-3 font-black text-white"
            >
              إرسال الطلب
            </button>
          </form>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#071d49]">
              طلباتي
            </h2>
            <div className="mt-5 space-y-3">
              {myLeaves.length === 0 ? (
                <p className="text-slate-500">لا توجد طلبات إجازة.</p>
              ) : (
                myLeaves.map((r) => (
                  <div key={r.id} className="rounded-2xl border p-4">
                    <div className="flex justify-between gap-3">
                      <b>{leaveNames[r.leave_type] || r.leave_type}</b>
                      <span>{statusNames[r.status] || r.status}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {r.start_date} → {r.end_date} • {r.days_count} يوم
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {canManage && (
          <>
            <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-[#071d49]">
                إدارة طلبات الإجازة
              </h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">الموظف</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">الفترة</th>
                      <th className="p-3">الأيام</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-3">
                          {employees[r.employee_id]?.full_name || r.employee_id}
                        </td>
                        <td className="p-3">{leaveNames[r.leave_type] || r.leave_type}</td>
                        <td className="p-3">{r.start_date} → {r.end_date}</td>
                        <td className="p-3">{r.days_count}</td>
                        <td className="p-3">{statusNames[r.status] || r.status}</td>
                        <td className="p-3">
                          {r.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => review(r.id, "approved")}
                                className="rounded-lg bg-green-100 px-3 py-2 font-bold text-green-800"
                              >
                                اعتماد
                              </button>
                              <button
                                onClick={() => review(r.id, "rejected")}
                                className="rounded-lg bg-red-100 px-3 py-2 font-bold text-red-800"
                              >
                                رفض
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-[#071d49]">
                سجل الحضور الأخير
              </h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الموظف</th>
                      <th className="p-3">الحضور</th>
                      <th className="p-3">الانصراف</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-3">{r.attendance_date}</td>
                        <td className="p-3">
                          {employees[r.employee_id]?.full_name || r.employee_id}
                        </td>
                        <td className="p-3">{time(r.clock_in)}</td>
                        <td className="p-3">{time(r.clock_out)}</td>
                        <td className="p-3">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="text-2xl text-[#071d49]">{icon}</div>
      <div className="mt-4 text-sm font-bold text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-black text-[#071d49]">{value}</div>
    </div>
  );
}
