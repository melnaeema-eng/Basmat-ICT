import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaBuilding,
  FaHeadset,
  FaNetworkWired,
  FaServer,
} from "react-icons/fa6";

const highlights = [
  {
    icon: FaNetworkWired,
    title: "البنية التحتية للاتصالات",
  },
  {
    icon: FaServer,
    title: "مراكز البيانات",
  },
  {
    icon: FaBuilding,
    title: "المقاولات والاستشارات",
  },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative isolate min-h-[680px] overflow-hidden bg-[#061a40]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(57,130,246,0.32),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(29,78,216,0.28),transparent_40%)]" />

      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-[10%] top-24 h-72 w-72 rounded-full border border-blue-300" />
        <div className="absolute left-[18%] top-40 h-44 w-44 rounded-full border border-blue-300" />
        <div className="absolute bottom-20 right-[8%] h-80 w-80 rounded-full border border-blue-300" />
      </div>

      <div className="company-container relative grid min-h-[680px] items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-white"
        >
          <span className="inline-flex rounded-full border border-blue-300/40 bg-blue-400/10 px-5 py-2 text-sm font-bold text-blue-100">
            بصمة النوابغ للمقاولات والاستشارات
          </span>

          <h1 className="mt-7 max-w-3xl text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
            نبني بنية تحتية
            <span className="block text-blue-300">
              رقمية أكثر ذكاءاً واستدامة
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-200">
            نقدم حلولًا متكاملة في الاتصالات وتقنية المعلومات，
            مراكز البيانات، الشبكات، الأنظمة منخفضة التيار،
            الأعمال الكهربائية، المقاولات والاستشارات الهندسية.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="#services"
              className="inline-flex items-center gap-3 rounded-lg bg-white px-7 py-4 font-bold text-[#0b285d] hover:-translate-y-1 hover:bg-blue-50"
            >
              اكتشف خدماتنا
              <FaArrowLeft />
            </a>

            <a
              href="#contact"
              className="inline-flex items-center gap-3 rounded-lg border border-white/40 bg-white/10 px-7 py-4 font-bold text-white backdrop-blur hover:bg-white/20"
            >
              <FaHeadset />
              تواصل معنا
            </a>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                >
                  <Icon className="text-2xl text-blue-300" />

                  <p className="mt-3 text-sm font-bold leading-6 text-white">
                    {item.title}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto aspect-square max-w-[510px]">
            <div className="absolute inset-0 rounded-full border border-blue-300/30" />
            <div className="absolute inset-10 rounded-full border border-blue-300/25" />
            <div className="absolute inset-20 rounded-full border border-blue-300/20" />

            <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-white shadow-2xl">
             <img
  src="/logo.png"
  alt="Basmat Alnawabigh ICT"
  className="w-[340px] object-contain"
/>
            </div>

            <FloatingCard
              className="right-0 top-16"
              icon={<FaServer />}
              title="Data Centers"
              subtitle="تصميم وتنفيذ"
            />

            <FloatingCard
              className="bottom-16 left-0"
              icon={<FaNetworkWired />}
              title="ICT Networks"
              subtitle="حلول متكاملة"
            />

            <FloatingCard
              className="bottom-0 right-16"
              icon={<FaBuilding />}
              title="Consulting"
              subtitle="خبرات هندسية"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingCard({
  className,
  icon,
  title,
  subtitle,
}) {
  return (
    <div
      className={`absolute flex items-center gap-3 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-xl ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl text-[#123878]">
        {icon}
      </div>

      <div>
        <p className="font-black text-[#0b285d]">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}