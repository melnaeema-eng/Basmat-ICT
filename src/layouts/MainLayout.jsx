import Header from "../components/Header/Header";

export default function MainLayout({ children }) {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Header />

      <main>{children}</main>
    </div>
  );
}