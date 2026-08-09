export default function StatCard({
  icon,
  title,
  value,
  loading = false,
  note,
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-[#123878]">
        {icon}
      </div>

      <p className="mt-6 font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-4xl font-black text-[#071d49]">
        {loading ? "..." : value}
      </p>

      {note && (
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {note}
        </p>
      )}
    </article>
  );
}
