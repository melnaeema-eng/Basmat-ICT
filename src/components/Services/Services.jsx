import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaBuilding,
  FaCloud,
  FaCode,
  FaDatabase,
  FaNetworkWired,
  FaServer,
  FaShieldHalved,
  FaTowerBroadcast,
} from "react-icons/fa6";

const services = [
  {
    icon: FaNetworkWired,
    title: "ICT Infrastructure",
    titleAr: "البنية التحتية لتقنية المعلومات",
    desc: "حلول الكابلات المنظمة، الألياف الضوئية، غرف الاتصالات، الشبكات المؤسسية والبنية التحتية الرقمية.",
  },
  {
    icon: FaCode,
    title: "Information Technology",
    titleAr: "حلول تقنية المعلومات",
    desc: "الخوادم، التخزين، النسخ الاحتياطي، الافتراضية، حلول Microsoft والأنظمة المؤسسية.",
  },
  {
    icon: FaShieldHalved,
    title: "Cyber Security",
    titleAr: "الأمن السيبراني",
    desc: "الجدران النارية، حماية نقاط النهاية، SIEM، SOC، إدارة الثغرات وحلول Zero Trust.",
  },
  {
    icon: FaCloud,
    title: "Cloud Solutions",
    titleAr: "الحوسبة السحابية",
    desc: "الحوسبة السحابية والهجينة، النسخ الاحتياطي، التعافي من الكوارث وترحيل الأنظمة.",
  },
  {
    icon: FaServer,
    title: "Data Centers",
    titleAr: "مراكز البيانات",
    desc: "التصميم والتنفيذ والتشغيل والاختبار والتكليف لمراكز البيانات والبنية التحتية الحرجة.",
  },
  {
    icon: FaTowerBroadcast,
    title: "Enterprise Networking",
    titleAr: "الشبكات المؤسسية",
    desc: "LAN وWAN وSD-WAN وWiFi 6/7 وتصميم الشبكات عالية الاعتمادية والأداء.",
  },
  {
    icon: FaBuilding,
    title: "Engineering Consultancy",
    titleAr: "الاستشارات الهندسية",
    desc: "التصميم، الإشراف، إدارة المشاريع، المراجعة الفنية، الاختبارات والتكليف.",
  },
  {
    icon: FaDatabase,
    title: "Smart Buildings & ELV",
    titleAr: "المباني الذكية وأنظمة ELV",
    desc: "CCTV وAccess Control وBMS وIPTV وPA والأنظمة الذكية منخفضة التيار.",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#061a40] py-24 text-white"
    >
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -left-24 bottom-12 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="absolute inset-0 opacity-[0.08]">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <div className="company-container relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-bold tracking-[0.25em] text-blue-300">
            CORE CAPABILITIES
          </span>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            خدماتنا وحلولنا المتكاملة
          </h2>

          <p className="mt-6 text-lg leading-9 text-blue-100">
            نقدم منظومة متكاملة من حلول تقنية المعلومات والاتصالات
            والأمن السيبراني ومراكز البيانات والبنية التحتية الرقمية.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.article
                key={service.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.06,
                }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-7 backdrop-blur-md transition duration-300 hover:-translate-y-2 hover:border-blue-300/50 hover:bg-white/[0.13] hover:shadow-2xl hover:shadow-blue-950/40"
              >
                <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-blue-400/10 transition duration-300 group-hover:scale-150 group-hover:bg-blue-400/20" />

                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-300/15 text-3xl text-blue-200 ring-1 ring-blue-200/20 transition duration-300 group-hover:scale-110 group-hover:bg-blue-300 group-hover:text-[#061a40]">
                    <Icon />
                  </div>

                  <p className="mt-6 text-sm font-bold uppercase tracking-wide text-blue-300">
                    {service.title}
                  </p>

                  <h3 className="mt-2 text-2xl font-black leading-9">
                    {service.titleAr}
                  </h3>

                  <p className="mt-4 min-h-32 leading-8 text-blue-100/90">
                    {service.desc}
                  </p>

                  <a
                    href="#contact"
                    className="mt-6 inline-flex items-center gap-3 font-bold text-blue-200 hover:text-white"
                  >
                    معرفة المزيد
                    <FaArrowLeft className="transition group-hover:-translate-x-1" />
                  </a>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}