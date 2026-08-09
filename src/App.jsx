import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";

import AdminLayout from "./layouts/AdminLayout";
import MainLayout from "./layouts/MainLayout";

import AdminConsultations from "./pages/Admin/AdminConsultations";
import AdminContacts from "./pages/Admin/AdminContacts";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminDocuments from "./pages/Admin/AdminDocuments";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminPartners from "./pages/Admin/AdminPartners";
import AdminProjects from "./pages/Admin/AdminProjects";
import AdminRFQs from "./pages/Admin/AdminRFQs";
import AdminServices from "./pages/Admin/AdminServices";
import AdminSettings from "./pages/Admin/AdminSettings";

import Consultation from "./pages/Consultation/Consultation";
import Contact from "./pages/Contact/Contact";
import Home from "./pages/Home/Home";
import PlaceholderPage from "./pages/Placeholder/PlaceholderPage";
import Quote from "./pages/Quote/Quote";

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* الموقع العام */}
          <Route
            element={
              <MainLayout>
                <Outlet />
              </MainLayout>
            }
          >
            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/quote"
              element={<Quote />}
            />

            <Route
              path="/consultation"
              element={<Consultation />}
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
          </Route>

          {/* دخول الإدارة */}
          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          {/* مسارات الإدارة المحمية */}
          <Route
            element={<ProtectedAdminRoute />}
          >
            <Route
              path="/admin"
              element={<AdminLayout />}
            >
              <Route
                index
                element={<AdminDashboard />}
              />

              <Route
                path="contacts"
                element={<AdminContacts />}
              />

              <Route
                path="rfqs"
                element={<AdminRFQs />}
              />

              <Route
                path="consultations"
                element={<AdminConsultations />}
              />

              <Route
                path="documents"
                element={<AdminDocuments />}
              />

              <Route
                path="projects"
                element={<AdminProjects />}
              />

              <Route
                path="services"
                element={<AdminServices />}
              />

              <Route
                path="partners"
                element={<AdminPartners />}
              />

              <Route
                path="settings"
                element={<AdminSettings />}
              />
            </Route>
          </Route>
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
