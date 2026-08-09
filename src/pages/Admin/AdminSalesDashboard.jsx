import { useEffect, useState } from "react";
import {
  FaCalendarCheck,
  FaChartLine,
  FaHandshake,
  FaUsers,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

export default function AdminSalesDashboard() {
  const [data, setData] = useState({
    customers: [],
    opportunities: [],
    followups: [],
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [customerResult, opportunityResult, followupResult] =
      await Promise.all([
        supabase.from("ict_customers").select("id,status"),
        supabase
          .from("ict_sales_opportunities")
          .select("id,stage,estimated_value,probability"),
        supabase
          .from("ict_sales_followups")
          .select("id,status,due_at"),
      ]);

    const error =
      customerResult.error ||
      opportunityResult.error ||
      followupResult.error;

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setData({
      customers: customerResult.data || [],
      opportunities: opportunityResult.data || [],
      followups: followupResult.data || [],
    });
  }

  const openOpportunities = data.opportunities.filter(
    (opp) => !["won", "lost"].includes(opp.stage)
  );

  const wonValue = data.opportunities
    .filter((opp) => opp.stage === "won")
    .reduce(
      (sum, opp) => sum + Number(opp.estimated_value || 0),
      0
    );

  const weightedPipeline = openOpportunities.reduce(
    (sum, opp) =>
      sum +
      Number(opp.estimated_value || 0) *
        (Number(opp.probability || 0) / 100),
    0
  );

  const overdueFollowups = data.followups.filter(
    (row) =>
      row.status === "pending" &&
      new Date(row.due_at) < new Date()
  ).length;

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          CRM Dashboard
        </h1>
        <p className="mt-3 text-slate-600">
          ملخص العملاء والفرص والمتابعات البيعية.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<FaUsers />}
            label="العملاء"
            value={data.customers.length}
          />
          <Metric
            icon={<FaHandshake />}
            label="الفرص المفتوحة"
            value={openOpportunities.length}
          />
          <Metric
            icon={<FaChartLine />}
            label="Pipeline المرجح"
            value={`${formatMoney(weightedPipeline)} SAR`}
          />
          <Metric
            icon={<FaCalendarCheck />}
            label="متابعات متأخرة"
            value={overdueFollowups}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-7">
          <p className="font-bold text-green-700">
            قيمة الفرص الرابحة
          </p>
          <p
            dir="ltr"
            className="mt-3 text-right text-4xl font-black text-green-900"
          >
            {formatMoney(wonValue)} SAR
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
        {icon}
      </div>

      <p className="mt-5 font-bold text-slate-500">{label}</p>
      <p
        dir="ltr"
        className="mt-2 text-right text-3xl font-black text-[#071d49]"
      >
        {value}
      </p>
    </article>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
