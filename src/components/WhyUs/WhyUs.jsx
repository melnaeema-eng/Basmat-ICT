import {
  FaAward,
  FaCertificate,
  FaClock,
  FaUsers,
} from "react-icons/fa6";

const items = [
  [FaAward, "جودة هندسية", "نطبق منهجيات واضحة في التصميم والتنفيذ والاختبار والتوثيق."],
  [FaUsers, "فريق متخصص", "خبرات عملية في مشاريع الاتصالات وتقنية المعلومات ومراكز البيانات."],
  [FaCertificate, "حلول متكاملة", "من الاستشارة والتصميم إلى التنفيذ والتشغيل والدعم الفني."],
  [FaClock, "التزام تشغيلي", "تركيز على الجدول والجودة والمخاطر واستمرارية الخدمة بعد التسليم."],
];

export default function WhyUs() {
  return (
    <section className="bg-[#0f2747] py-20 text-white md:py-24">
      <div className="company-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <span className="text-xs font-black tracking-[0.18em] text-orange-300">WHY BASMAT ICT</span>
          <h2 className="mt-4 text-3xl font-black leading-[1.4] md:text-4xl">
            ليست مجرد منتجات.
            <span className="block text-blue-200">نحن مسؤولون عن الحل.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-blue-100/80">
            نعمل بعقلية شريك المشروع: وضوح في النطاق، جودة في التنفيذ، توثيق جيد،
            ومساندة عند التشغيل والتوسع.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
          {items.map(([Icon, title, desc]) => (
            <article key={title} className="bg-[#132f53] p-6 transition hover:bg-[#18375f]">
              <Icon className="text-2xl text-orange-300" />
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-blue-100/75">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
