import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaCalendarDays,
  FaClipboardList,
  FaHeadset,
  FaShieldHalved,
  FaUsers,
} from "react-icons/fa6";

import SectionWaves from "../SectionWaves/SectionWaves";

const statistics = [
  {
    icon: FaCalendarDays,
    number: "15+",
    label: "سنوات خبرة",
  },
  {
    icon: FaClipboardList,
    number: "150+",
    label: "مشروع",
  },
  {
    icon: FaUsers,
    number: "50+",
    label: "عميل",
  },
  {
    icon: FaHeadset,
    number: "24/7",
    label: "دعم فني",
  },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative isolate min-h-[840px] overflow-hidden bg-[#03152f] pb-36 text-white"
    >
      {/* خلفية مركز البيانات */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(3,21,47,0.98) 0%, rgba(3,21,47,0.93) 42%, rgba(3,21,47,0.56) 72%, rgba(3,21,47,0.38) 100%), url('/images/hero/hero-datacenter.jpg')",
        }}
      />

      {/* التدرجات الضوئية */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,rgba(37,99,235,0.27),transparent_36%),radial-gradient(circle_at_78%_45%,rgba(14,165,233,0.22),transparent_38%)]" />

      {/* شبكة تقنية */}
      <div className="absolute inset-0 opacity-[0.10]">
        <div className="h-full w-full bg-[linear-gradient(rgba(56,189,248,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.35)_1px,transparent_1px)] bg-[size:58px_58px]" />
      </div>

      {/* إضاءات خلفية */}
      <div className="absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -left-40 bottom-20 h-[460px] w-[460px] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="company-container relative grid min-h-[760px] items-center gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr]">
        {/* النص */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="order-2 lg:order-1"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/50 bg-blue-500/10 px-6 py-3 text-lg font-bold text-blue-50 backdrop-blur">
            <FaShieldHalved className="text-cyan-300" />
            شريكك في التحول الرقمي
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[1.25] sm:text-6xl xl:text-7xl">
            نمكّن المؤسسات من

            <span className="mt-2 block bg-gradient-to-l from-cyan-200 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              التحول الرقمي بثقة
            </span>
          </h1>

          <p className="mt-7 max-w-3xl text-xl leading-10 text-slate-200">
            حلول متكاملة في تقنية المعلومات والاتصالات، الأمن
            السيبراني، مراكز البيانات، الشبكات المؤسسية،
            الأنظمة الذكية والاستشارات الهندسية.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
  <Link
    to="/quote"
    className="inline-flex items-center gap-3 rounded-xl bg-[#ff7417] px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-[#ff8b3d]"
  >
    اطلب عرض سعر
    <FaArrowLeft />
  </Link>

  <Link
    to="/consultation"
    className="inline-flex items-center gap-3 rounded-xl bg-[#0d6efd] px-7 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-[#2b7fff]"
  >
    🎁 احجز استشارة مجانية
  </Link>

  <Link
    to="/contact"
    className="inline-flex items-center gap-3 rounded-xl border border-white/40 bg-white/10 px-7 py-4 font-bold text-white backdrop-blur transition hover:bg-white/20"
  >
    <FaHeadset />
    تواصل معنا
  </Link>

</div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {statistics.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.35 + index * 0.1,
                  }}
                  className="rounded-2xl border border-blue-300/20 bg-blue-950/40 p-5 text-center backdrop-blur-md"
                >
                  <Icon className="mx-auto text-2xl text-cyan-400" />

                  <p className="mt-3 text-3xl font-black">
                    {stat.number}
                  </p>

                  <p className="mt-2 text-sm text-slate-200">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* الشعار */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="order-1 flex items-center justify-center lg:order-2"
        >
          <div className="relative flex h-[390px] w-[390px] items-center justify-center sm:h-[500px] sm:w-[500px]">
            <div className="absolute inset-0 rounded-full border border-cyan-300/35" />
            <div className="absolute inset-6 rounded-full border border-blue-300/25" />
            <div className="absolute inset-12 rounded-full border border-cyan-300/20" />

            <div className="absolute inset-0 rounded-full bg-blue-400/10 blur-2xl" />

            <img
              src="/logo.png"
              alt="بصمة النوابغ لتقنية المعلومات والاتصالات"
              className="relative z-10 h-[330px] w-[330px] rounded-full bg-white object-contain shadow-[0_0_55px_rgba(56,189,248,0.35)] sm:h-[420px] sm:w-[420px]"
            />
          </div>
        </motion.div>
      </div>

      <SectionWaves
        position="bottom"
        color="#ffffff"
        secondaryColor="rgba(59,130,246,0.22)"
        height="h-44"
      />
    </section>
  );
}