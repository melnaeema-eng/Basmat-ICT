import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home/Home";
import Contact from "./pages/Contact/Contact";
import PlaceholderPage from "./pages/Placeholder/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/about"
            element={
              <PlaceholderPage
                title="عن الشركة"
                subtitle="تعرف على بصمة النوابغ ورؤيتها ورسالتها وخبراتها في الحلول الرقمية والهندسية."
              />
            }
          />

          <Route
            path="/services"
            element={
              <PlaceholderPage
                title="خدماتنا"
                subtitle="حلول متكاملة في تقنية المعلومات، الأمن السيبراني، الشبكات ومراكز البيانات."
              />
            }
          />

          <Route
            path="/projects"
            element={
              <PlaceholderPage
                title="مشاريعنا"
                subtitle="نماذج من مشاريعنا وخبراتنا في البنية التحتية الرقمية والحلول التقنية."
              />
            }
          />

          <Route
            path="/technology"
            element={
              <PlaceholderPage
                title="منظومة التقنيات"
                subtitle="التقنيات والمنصات العالمية التي نستخدمها لتقديم حلول موثوقة وقابلة للتوسع."
              />
            }
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          <Route
            path="*"
            element={
              <PlaceholderPage
                title="الصفحة غير موجودة"
                subtitle="الرابط المطلوب غير موجود أو جرى نقله."
              />
            }
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}