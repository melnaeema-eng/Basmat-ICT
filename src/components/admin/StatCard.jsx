export default function StatCard({ icon, title, value, loading = false, note }) {
  return (
    <article className="erp-card group p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-[30px] font-black tracking-tight text-[#0f2747]">
            {loading ? "..." : value}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-lg text-[#345a82] transition group-hover:bg-[#eaf0f6]">
          {icon}
        </div>
      </div>
      {note && <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-400">{note}</p>}
    </article>
  );
}
