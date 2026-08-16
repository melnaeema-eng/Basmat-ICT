import { Link } from "react-router-dom";
import { FaArrowLeft, FaHeadset } from "react-icons/fa6";

export default function CTA() {
  return (
    <section id="contact" className="bg-white py-20 md:py-24">
      <div className="company-container">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0f2747] px-6 py-12 text-white shadow-[0_24px_70px_rgba(15,39,71,0.16)] md:px-12 md:py-14">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="text-xs font-black tracking-[0.18em] text-orange-300">START A CONVERSATION</span>
              <h2 className="mt-4 text-3xl font-black leading-[1.4] md:text-4xl">لديك مشروع أو تحدٍ تقني؟</h2>
              <p className="mt-4 text-base leading-8 text-blue-100/80">
                شاركنا المتطلبات، وسنساعدك في تحديد نطاق الحل والخطوة التالية بصورة واضحة.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/quote"
                className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 font-black text-[#0f2747] transition hover:-translate-y-0.5"
              >
                اطلب عرض سعر <FaArrowLeft />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-3 rounded-xl border border-white/20 px-6 py-3.5 font-black text-white transition hover:bg-white/10"
              >
                <FaHeadset /> تواصل معنا
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
