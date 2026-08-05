import { FaArrowLeft } from "react-icons/fa6";

export default function CTA() {
  return (
    <section className="py-24">

      <div className="company-container">

        <div className="overflow-hidden rounded-[35px] bg-gradient-to-r from-[#071d49] via-[#123878] to-[#1b56c4] p-16 text-center text-white shadow-2xl">

          <span className="text-blue-200 font-bold tracking-widest">
            READY TO START?
          </span>

          <h2 className="mt-5 text-5xl font-black">
            هل لديك مشروع؟
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-xl leading-10 text-blue-100">
            دع فريق Basmat ICT يساعدك في تصميم وتنفيذ حلول
            تقنية المعلومات والاتصالات والأمن السيبراني
            والبنية التحتية الرقمية.
          </p>

          <button className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white px-10 py-5 text-lg font-black text-[#123878] transition hover:scale-105">

            اطلب عرض سعر

            <FaArrowLeft />

          </button>

        </div>

      </div>

    </section>
  );
}