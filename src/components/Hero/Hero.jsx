import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaBuildingShield,
  FaCheck,
  FaHeadset,
  FaServer,
  FaTowerBroadcast,
} from "react-icons/fa6";

const proof = [
  "تصميم وتنفيذ متكامل",
  "خبرة في المشاريع الحرجة",
  "حلول قابلة للتوسع",
];

const metrics = [
  ["15+", "سنة خبرة"],
  ["150+", "مشروع"],
  ["50+", "عميل"],
  ["24/7", "دعم فني"],
];

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-[#f6f8fb]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#e96f20]/40 to-transparent" />
      <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-100/60 blur-3xl" />

      <div className="company-container relative grid min-h-[680px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#e96f20]" />
            ICT • DATA CENTER • TELECOM • ELV
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.28] tracking-tight text-[#0f2747] sm:text-5xl xl:text-[62px]">
            بنية رقمية أقوى
            <span className="block text-[#345a82]">لمؤسسات أكثر جاهزية.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-600">
            نصمم وننفذ حلول الاتصالات وتقنية المعلومات ومراكز البيانات
            والشبكات والأنظمة منخفضة التيار، من الاستشارة وحتى التشغيل والدعم.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
            {proof.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-[9px] text-green-700">
                  <FaCheck />
                </span>
                {item}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/quote"
              className="inline-flex items-center gap-3 rounded-xl bg-[#0f2747] px-6 py-3.5 font-black text-white shadow-[0_8px_20px_rgba(15,39,71,0.14)] transition hover:-translate-y-0.5 hover:bg-[#17375f]"
            >
              ابدأ مشروعك
              <FaArrowLeft />
            </Link>

            <Link
              to="/consultation"
              className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-[#0f2747]"
            >
              احجز استشارة
            </Link>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
            {metrics.map(([value, label]) => (
              <div key={label} className="bg-white px-4 py-4">
                <p className="text-2xl font-black text-[#0f2747]">{value}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-[0_28px_80px_rgba(15,39,71,0.16)]">
            <img
              src="/images/hero/hero-datacenter.jpg"
              alt="مركز بيانات وتقنيات البنية التحتية"
              className="h-[450px] w-full rounded-[1.6rem] object-cover sm:h-[520px]"
            />
            <div className="absolute inset-2 rounded-[1.6rem] bg-gradient-to-t from-[#071d49]/70 via-transparent to-transparent" />

            <div className="absolute bottom-7 right-7 left-7 rounded-2xl border border-white/15 bg-[#071d49]/88 p-5 text-white backdrop-blur-md">
              <p className="text-xs font-black tracking-wider text-orange-200">END-TO-END DELIVERY</p>
              <p className="mt-2 text-xl font-black">من التصميم إلى التشغيل</p>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                هندسة، تنفيذ، اختبار، تكليف، توثيق ودعم فني ضمن مسؤولية واحدة.
              </p>
            </div>
          </div>

          <div className="absolute -right-5 top-12 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl xl:block">
            <FaServer className="text-2xl text-[#345a82]" />
            <p className="mt-3 text-sm font-black text-[#0f2747]">Data Centers</p>
          </div>

          <div className="absolute -left-6 top-28 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl xl:block">
            <FaTowerBroadcast className="text-2xl text-[#e96f20]" />
            <p className="mt-3 text-sm font-black text-[#0f2747]">Telecom</p>
          </div>

          <div className="absolute -left-3 bottom-14 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl xl:block">
            <FaBuildingShield className="text-2xl text-green-700" />
            <p className="mt-3 text-sm font-black text-[#0f2747]">ELV & Security</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
