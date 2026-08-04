import {
  FaArrowLeft,
  FaBuilding,
  FaServer,
  FaTowerBroadcast,
} from "react-icons/fa6";

const projects = [
  {
    title: "البنية التحتية للاتصالات",
    icon: <FaTowerBroadcast />,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900",
  },
  {
    title: "مراكز البيانات",
    icon: <FaServer />,
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900",
  },
  {
    title: "المشاريع الهندسية",
    icon: <FaBuilding />,
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900",
  },
];

export default function Projects() {
  return (
    <section
      id="projects"
      className="bg-white py-24"
    >
      <div className="company-container">

        <div className="flex items-end justify-between">

          <div>

            <span className="font-bold text-blue-700">
              OUR PROJECTS
            </span>

            <h2 className="mt-3 text-4xl font-black">
              أحدث مشاريعنا
            </h2>

          </div>

          <button className="hidden md:flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-bold text-white hover:bg-[#0d2d69]">
            جميع المشاريع
            <FaArrowLeft />
          </button>

        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">

          {projects.map((project) => (
            <div
              key={project.title}
              className="group overflow-hidden rounded-3xl shadow-lg"
            >
              <img
                src={project.image}
                className="h-72 w-full object-cover transition duration-500 group-hover:scale-110"
              />

              <div className="bg-white p-8">

                <div className="text-4xl text-blue-700">
                  {project.icon}
                </div>

                <h3 className="mt-5 text-2xl font-black">
                  {project.title}
                </h3>

                <p className="mt-3 leading-8 text-slate-600">
                  تنفيذ المشاريع وفق أعلى المعايير العالمية
                  وبأفضل الممارسات الهندسية.
                </p>

              </div>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}