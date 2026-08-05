export default function Partners() {
  const partners = [
    "Cisco",
    "Huawei",
    "Microsoft",
    "Dell Technologies",
    "HPE",
    "Fortinet",
  ];

  return (
    <section className="bg-slate-50 py-24">
      <div className="company-container">

        <div className="text-center">

          <span className="font-bold text-blue-700">
            OUR TECHNOLOGY PARTNERS
          </span>

          <h2 className="mt-4 text-4xl font-black text-slate-900">
            شركاء التقنية
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
            نعمل مع أفضل الشركات العالمية لتقديم حلول تقنية موثوقة
            وقابلة للتوسع.
          </p>

        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">

          {partners.map((partner) => (

            <div
              key={partner}
              className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-bold text-slate-500 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              {partner}
            </div>

          ))}

        </div>

      </div>
    </section>
  );
}