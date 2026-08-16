import TechnologyEcosystem from "../../components/TechnologyEcosystem/TechnologyEcosystem";
import Footer from "../../components/Footer/Footer";
import CTA from "../../components/CTA/CTA";
import WhyUs from "../../components/WhyUs/WhyUs";
import Projects from "../../components/Projects/Projects";
import Services from "../../components/Services/Services";
import Hero from "../../components/Hero/Hero";

import {
  FaArrowTrendUp,
  FaDiagramProject,
  FaHelmetSafety,
  FaScrewdriverWrench,
} from "react-icons/fa6";

const capabilities = [
  {
    icon: FaDiagramProject,
    title: "تصميم واستشارات",
    text: "تصميم هندسي، BoQ، مراجعات فنية، نطاقات عمل ومخططات تنفيذية.",
  },
  {
    icon: FaHelmetSafety,
    title: "تنفيذ وإدارة مشاريع",
    text: "إدارة التنفيذ والموردين والمخاطر والجودة والتسليم وفق خطة واضحة.",
  },
  {
    icon: FaScrewdriverWrench,
    title: "تشغيل ودعم",
    text: "اختبار وتكليف وصيانة ودعم فني بعد التسليم لضمان استمرارية الخدمة.",
  },
  {
    icon: FaArrowTrendUp,
    title: "تطوير وتوسع",
    text: "حلول قابلة للتوسع تواكب نمو المؤسسة والتحول الرقمي المستقبلي.",
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section id="about" className="bg-white py-20 md:py-24">
        <div className="company-container">
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lg:sticky lg:top-28">
              <span className="text-xs font-black tracking-[0.18em] text-[#e96f20]">
                ABOUT BASMAT ICT
              </span>
              <h2 className="mt-4 text-3xl font-black leading-[1.4] text-[#0f2747] md:text-4xl">
                شريك تقني يفهم المشروع
                <br />
                من زاوية الأعمال والهندسة.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
                بصمة النوابغ شركة سعودية تقدم حلول ICT والاتصالات ومراكز البيانات
                والشبكات وELV والاستشارات الهندسية. نركز على بناء حلول عملية، موثوقة،
                قابلة للتشغيل والتوسع، وليس مجرد توريد منتجات.
              </p>

              <div className="mt-8 border-r-2 border-[#e96f20] pr-5">
                <p className="text-sm font-black text-[#0f2747]">منهجنا</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  نفهم المتطلبات ← نصمم الحل ← ننفذ باحتراف ← نختبر ونوثق ← ندعم التشغيل.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, text }, index) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-6 transition hover:border-slate-300 hover:bg-white hover:shadow-[0_14px_35px_rgba(15,39,71,0.06)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl text-[#345a82] shadow-sm ring-1 ring-slate-100">
                    <Icon />
                  </div>
                  <p className="mt-5 text-xs font-black tracking-wider text-slate-300">0{index + 1}</p>
                  <h3 className="mt-1 text-xl font-black text-[#0f2747]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Services />
      <Projects />
      <WhyUs />
      <TechnologyEcosystem />
      <CTA />
      <Footer />
    </>
  );
}
