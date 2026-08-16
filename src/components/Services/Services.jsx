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
  [FaNetworkWired, "ICT Infrastructure", "البنية التحتية لتقنية المعلومات", "كابلات منظمة، ألياف ضوئية، غرف اتصالات وبنية تحتية رقمية."],
  [FaCode, "Information Technology", "حلول تقنية المعلومات", "خوادم وتخزين ونسخ احتياطي وافتراضية وحلول Microsoft المؤسسية."],
  [FaShieldHalved, "Cyber Security", "الأمن السيبراني", "Firewalls وEndpoint Security وSIEM وإدارة الثغرات وحلول Zero Trust."],
  [FaCloud, "Cloud Solutions", "الحوسبة السحابية", "Cloud وHybrid Cloud وDR والنسخ الاحتياطي وترحيل الأنظمة."],
  [FaServer, "Data Centers", "مراكز البيانات", "تصميم وتنفيذ واختبار وتكليف مراكز البيانات والبنية التحتية الحرجة."],
  [FaTowerBroadcast, "Enterprise Networking", "الشبكات المؤسسية", "LAN وWAN وSD-WAN وWiFi 6/7 وشبكات عالية الاعتمادية."],
  [FaBuilding, "Engineering Consultancy", "الاستشارات الهندسية", "تصميم وإشراف ومراجعة فنية وإدارة مشاريع واختبارات وتكليف."],
  [FaDatabase, "Smart Buildings & ELV", "المباني الذكية وأنظمة ELV", "CCTV وAccess Control وBMS وIPTV وPA والأنظمة الذكية."],
];

export default function Services() {
  return (
    <section id="services" className="border-y border-slate-200 bg-[#f6f8fb] py-20 md:py-24">
      <div className="company-container">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <span className="text-xs font-black tracking-[0.18em] text-[#e96f20]">CORE CAPABILITIES</span>
            <h2 className="mt-4 text-3xl font-black text-[#0f2747] md:text-4xl">
              حلول تقنية متكاملة
              <span className="block text-[#345a82]">من جهة واحدة.</span>
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-slate-600 lg:justify-self-end">
            نربط البنية التحتية والشبكات والأمن السيبراني ومراكز البيانات والأنظمة الذكية
            ضمن تصميم واحد قابل للتنفيذ والتشغيل والصيانة.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map(([Icon, title, titleAr, desc], index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: index * 0.035 }}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,39,71,0.07)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f6fa] text-xl text-[#345a82] transition group-hover:bg-[#0f2747] group-hover:text-white">
                  <Icon />
                </div>
                <span className="text-xs font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span>
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</p>
              <h3 className="mt-2 text-lg font-black leading-7 text-[#0f2747]">{titleAr}</h3>
              <p className="mt-3 min-h-24 text-sm leading-7 text-slate-500">{desc}</p>

              <a href="#contact" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#345a82]">
                معرفة المزيد
                <FaArrowLeft className="text-xs transition group-hover:-translate-x-1" />
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
