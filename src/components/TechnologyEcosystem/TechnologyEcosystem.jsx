const technologyGroups = [
  {
    title: "الشبكات والبنية التحتية",
    subtitle: "Networking & Infrastructure",
    vendors: [
      { name: "Cisco", logo: "/logos/cisco.svg" },
      { name: "Huawei", logo: "/logos/huawei.svg" },
      { name: "Aruba", logo: "/logos/aruba.svg" },
      { name: "Juniper", logo: "/logos/juniper.svg" },
    ],
  },
  {
    title: "الأمن السيبراني",
    subtitle: "Cyber Security",
    vendors: [
      { name: "Fortinet", logo: "/logos/fortinet.svg" },
      { name: "Palo Alto", logo: "/logos/paloalto.svg" },
      { name: "Check Point", logo: "/logos/checkpoint.svg" },
      { name: "Sophos", logo: "/logos/sophos.svg" },
    ],
  },
  {
    title: "مراكز البيانات والخوادم",
    subtitle: "Data Center & Compute",
    vendors: [
      { name: "Dell Technologies", logo: "/logos/dell.svg" },
      { name: "HPE", logo: "/logos/hpe.svg" },
      { name: "Lenovo", logo: "/logos/lenovo.svg" },
      { name: "NetApp", logo: "/logos/netapp.svg" },
    ],
  },
  {
    title: "الكابلات والألياف الضوئية",
    subtitle: "Structured Cabling & Fiber",
    vendors: [
      { name: "CommScope", logo: "/logos/commscope.svg" },
      { name: "Corning", logo: "/logos/corning.svg" },
      { name: "Panduit", logo: "/logos/panduit.svg" },
      { name: "Legrand", logo: "/logos/legrand.svg" },
    ],
  },
];

export default function TechnologyEcosystem() {
  return (
    <section id="technology" className="border-t border-slate-200 bg-[#f8fafc] py-20 md:py-24">
      <div className="company-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-black tracking-[0.18em] text-[#e96f20]">TECHNOLOGY ECOSYSTEM</span>
          <h2 className="mt-4 text-3xl font-black text-[#0f2747] md:text-4xl">تقنيات عالمية ضمن حلولنا.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            نختار التقنية وفق متطلبات المشروع والتوافق والأداء وقابلية التشغيل، لا وفق اسم المنتج فقط.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {technologyGroups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-[#0f2747]">{group.title}</h3>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{group.subtitle}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {group.vendors.map((vendor) => (
                  <VendorCard key={vendor.name} vendor={vendor} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs leading-6 text-slate-400">
          العلامات المعروضة تمثل تقنيات نتعامل معها ولا تعني شراكة رسمية ما لم يُذكر ذلك صراحة.
        </p>
      </div>
    </section>
  );
}

function VendorCard({ vendor }) {
  function handleImageError(event) {
    event.currentTarget.style.display = "none";
    event.currentTarget.nextElementSibling.style.display = "block";
  }

  return (
    <div className="group flex h-20 items-center justify-center rounded-xl border border-slate-100 bg-[#fbfcfd] p-4 transition hover:border-slate-200 hover:bg-white">
      <img
        src={vendor.logo}
        alt={vendor.name}
        onError={handleImageError}
        className="max-h-10 max-w-full object-contain grayscale opacity-70 transition group-hover:grayscale-0 group-hover:opacity-100"
      />
      <span className="hidden text-center text-sm font-black text-slate-500">{vendor.name}</span>
    </div>
  );
}
