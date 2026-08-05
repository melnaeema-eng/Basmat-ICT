import WhyUs from "../../components/WhyUs/WhyUs";
import Projects from "../../components/Projects/Projects";
import Services from "../../components/Services/Services";
import Hero from "../../components/Hero/Hero";
import {
  FaBuilding,
  FaChartLine,
  FaHeadset,
  FaShieldHalved,
} from "react-icons/fa6";

export default function Home() {
  return (
    <>
      <Hero />

      
      <Services />
<Projects />
      <WhyUs />
      {/* About */}
      <section
        id="about"
        className="bg-white py-24"
      >
        <div className="company-container grid gap-16 lg:grid-cols-2 items-center">

          <div>
            <span className="text-blue-700 font-bold">
              ABOUT BASMAT ICT
            </span>

            <h2 className="mt-4 text-4xl font-black text-slate-900">
              بصمة النوابغ للمقاولات
              <br />
              والاستشارات
            </h2>

            <p className="mt-6 text-lg leading-9 text-slate-600">
              شركة سعودية متخصصة في تقديم حلول الاتصالات وتقنية
              المعلومات، مراكز البيانات، الشبكات، الأمن السيبراني،
              الأنظمة منخفضة التيار، والاستشارات الهندسية، مع
              الالتزام بأعلى معايير الجودة والابتكار.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">

              <Feature
                icon={<FaBuilding />}
                title="خبرة هندسية"
                text="حلول احترافية للمشاريع الحكومية والخاصة."
              />

              <Feature
                icon={<FaShieldHalved />}
                title="جودة عالية"
                text="تنفيذ وفق أفضل الممارسات العالمية."
              />

              <Feature
                icon={<FaChartLine />}
                title="حلول متطورة"
                text="تصميم وتنفيذ وتشغيل وصيانة."
              />

              <Feature
                icon={<FaHeadset />}
                title="دعم فني"
                text="فريق متخصص لخدمة العملاء."
              />

            </div>
          </div>

          <div>

            <div className="rounded-3xl bg-gradient-to-br from-[#0b2d6d] to-[#123878] p-10 text-white shadow-2xl">

              <h3 className="text-3xl font-black">
                لماذا بصمة النوابغ؟
              </h3>

              <p className="mt-6 leading-8 text-blue-100">
                نؤمن بأن نجاح أي مشروع يبدأ من التخطيط الصحيح
                وينتهي بالتنفيذ الاحترافي والمتابعة المستمرة.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6">

                <Stat number="50+" title="مشروع" />

                <Stat number="20+" title="عميل" />

                <Stat number="10+" title="سنوات خبرة" />

                <Stat number="24/7" title="دعم فني" />

              </div>

            </div>

          </div>

        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition">

      <div className="text-3xl text-blue-700">
        {icon}
      </div>

      <h3 className="mt-4 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-2 text-slate-600 leading-7">
        {text}
      </p>

    </div>
  );
}

function Stat({ number, title }) {
  return (
    <div className="rounded-2xl bg-white/10 p-6 text-center">

      <h3 className="text-4xl font-black">
        {number}
      </h3>

      <p className="mt-2 text-blue-100">
        {title}
      </p>

    </div>
  );
}