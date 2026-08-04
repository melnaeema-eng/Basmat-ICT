import {
  FaBuilding,
  FaNetworkWired,
  FaServer,
  FaShieldHalved,
  FaWifi,
  FaBolt,
} from "react-icons/fa6";

const services = [
  {
    icon: <FaNetworkWired />,
    title: "ICT Infrastructure",
    desc: "تصميم وتنفيذ البنية التحتية للشبكات والألياف الضوئية."
  },
  {
    icon: <FaServer />,
    title: "Data Centers",
    desc: "تصميم وتنفيذ وتشغيل مراكز البيانات."
  },
  {
    icon: <FaShieldHalved />,
    title: "ELV Systems",
    desc: "CCTV - Access Control - Fire Alarm - IPTV - PA."
  },
  {
    icon: <FaWifi />,
    title: "Wireless Solutions",
    desc: "WiFi 6 / WiFi 7 / RF Survey / Coverage."
  },
  {
    icon: <FaBolt />,
    title: "Electrical Works",
    desc: "الأعمال الكهربائية وأنظمة الطاقة."
  },
  {
    icon: <FaBuilding />,
    title: "Engineering Consultancy",
    desc: "الاستشارات الهندسية وإدارة المشاريع."
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="bg-slate-50 py-24"
    >
      <div className="company-container">

        <div className="text-center">

          <span className="font-bold text-blue-700">
            OUR SERVICES
          </span>

          <h2 className="mt-3 text-4xl font-black text-slate-900">
            خدماتنا
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
            نقدم حلولاً متكاملة في الاتصالات وتقنية المعلومات
            والبنية التحتية الرقمية.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-3xl bg-white p-8 shadow hover:-translate-y-2 hover:shadow-2xl transition"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl text-blue-700">
                {service.icon}
              </div>

              <h3 className="mt-6 text-2xl font-bold">
                {service.title}
              </h3>

              <p className="mt-4 leading-8 text-slate-600">
                {service.desc}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}