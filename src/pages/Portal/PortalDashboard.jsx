import { useEffect, useState } from "react";
import { FaFileInvoiceDollar, FaFolderOpen } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

export default function PortalDashboard() {
  const { profile } = useCustomerAuth();
  const [counts, setCounts] = useState({ quotations: 0, projects: 0, invoices: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    const [q, p, i] = await Promise.all([
      supabase.from("ict_quotations").select("id", { count: "exact", head: true }),
      supabase.from("ict_delivery_projects").select("id", { count: "exact", head: true }),
      supabase.from("ict_delivery_invoices").select("id", { count: "exact", head: true }),
    ]);

    setCounts({
      quotations: q.count || 0,
      projects: p.count || 0,
      invoices: i.count || 0,
    });
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          مرحبًا {profile?.full_name || profile?.customer?.name || ""}
        </h1>
        <p className="mt-3 text-slate-600">جميع تعاملات جهتك في مكان واحد.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Metric icon={<FaFileInvoiceDollar />} label="عروض الأسعار" value={counts.quotations} />
          <Metric icon={<FaFolderOpen />} label="المشاريع" value={counts.projects} />
          <Metric icon={<FaFileInvoiceDollar />} label="الفواتير" value={counts.invoices} />
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">{icon}</div>
      <p className="mt-5 font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-black text-[#071d49]">{value}</p>
    </article>
  );
}
