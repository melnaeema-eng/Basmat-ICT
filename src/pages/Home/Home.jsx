import Hero from "../../components/Hero/Hero";

export default function Home() {
  return (
    <>
      <Hero />

      <section
        id="about"
        className="company-container py-24 text-center"
      >
        <span className="font-bold text-[#174795]">
          بصمة النوابغ
        </span>

        <h2 className="mt-3 text-3xl font-black text-[#071d49] md:text-4xl">
          حلول هندسية وتقنية متكاملة
        </h2>

        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          سيتم استكمال أقسام الخدمات والمشاريع والتواصل في
          الخطوة التالية بنفس التصميم المعتمد.
        </p>
      </section>
    </>
  );
}