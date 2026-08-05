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
  {
    title: "الحوسبة السحابية",
    subtitle: "Cloud Platforms",
    vendors: [
      { name: "Microsoft Azure", logo: "/logos/azure.svg" },
      { name: "AWS", logo: "/logos/aws.svg" },
      { name: "Google Cloud", logo: "/logos/google-cloud.svg" },
      { name: "VMware", logo: "/logos/vmware.svg" },
    ],
  },
];

export default function TechnologyEcosystem() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="company-container">
        <div className="text-center">
          <span className="font-bold tracking-wider text-blue-700">
            TECHNOLOGY ECOSYSTEM
          </span>

          <h2 className="mt-4 text-4xl font-black text-slate-900">
            منظومة التقنيات التي نعمل بها
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            نوظف تقنيات وحلولًا عالمية موثوقة لتصميم وتنفيذ مشاريع
            تقنية المعلومات والاتصالات والأمن السيبراني ومراكز البيانات.
          </p>
        </div>

        <div className="mt-16 space-y-10">
          {technologyGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
            >
              <div className="mb-7">
                <h3 className="text-2xl font-black text-[#071d49]">
                  {group.title}
                </h3>

                <p className="mt-1 text-sm font-semibold text-blue-700">
                  {group.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {group.vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.name}
                    vendor={vendor}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm leading-7 text-slate-500">
          العلامات التجارية المعروضة تمثل تقنيات نتعامل معها، ولا تعني
          بالضرورة وجود شراكة رسمية ما لم يُذكر ذلك صراحة.
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
    <div className="group flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
      <img
        src={vendor.logo}
        alt={vendor.name}
        onError={handleImageError}
        className="max-h-14 max-w-full object-contain grayscale transition duration-300 group-hover:grayscale-0"
      />

      <span
        className="hidden text-center text-lg font-black text-slate-500"
      >
        {vendor.name}
      </span>
    </div>
  );
}