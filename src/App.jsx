import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import ProtectedCustomerRoute from "./components/customer/ProtectedCustomerRoute";
import RequireCustomerForQuote from "./components/customer/RequireCustomerForQuote";

import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { CustomerAuthProvider } from "./contexts/CustomerAuthContext";

import AdminLayout from "./layouts/AdminLayout";
import CustomerPortalLayout from "./layouts/CustomerPortalLayout";
import MainLayout from "./layouts/MainLayout";

import AdminAnalytics from "./pages/Admin/AdminAnalytics";
import AdminConsultations from "./pages/Admin/AdminConsultations";
import AdminContacts from "./pages/Admin/AdminContacts";
import AdminCustomers from "./pages/Admin/AdminCustomers";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminDocuments from "./pages/Admin/AdminDocuments";
import AdminFollowUps from "./pages/Admin/AdminFollowUps";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminNotifications from "./pages/Admin/AdminNotifications";
import AdminOperationsDashboard from "./pages/Admin/AdminOperationsDashboard";
import AdminPartners from "./pages/Admin/AdminPartners";
import AdminPipeline from "./pages/Admin/AdminPipeline";
import AdminPortalUsers from "./pages/Admin/AdminPortalUsers";
import AdminProjectCommercial from "./pages/Admin/AdminProjectCommercial";
import AdminProjectManagement from "./pages/Admin/AdminProjectManagement";
import AdminProjects from "./pages/Admin/AdminProjects";
import AdminQuotationEditor from "./pages/Admin/AdminQuotationEditor";
import AdminQuotations from "./pages/Admin/AdminQuotations";
import AdminRFQs from "./pages/Admin/AdminRFQs";
import AdminSalesDashboard from "./pages/Admin/AdminSalesDashboard";
import AdminServices from "./pages/Admin/AdminServices";
import AdminSettings from "./pages/Admin/AdminSettings";
import AdminTeam from "./pages/Admin/AdminTeam";

import Consultation from "./pages/Consultation/Consultation";
import Contact from "./pages/Contact/Contact";
import Home from "./pages/Home/Home";
import PlaceholderPage from "./pages/Placeholder/PlaceholderPage";

import PortalDashboard from "./pages/Portal/PortalDashboard";
import PortalInvoices from "./pages/Portal/PortalInvoices";
import PortalLogin from "./pages/Portal/PortalLogin";
import PortalProjects from "./pages/Portal/PortalProjects";
import PortalQuotationDetail from "./pages/Portal/PortalQuotationDetail";
import PortalQuotations from "./pages/Portal/PortalQuotations";
import PortalRequests from "./pages/Portal/PortalRequests";

import PortalRegister from "./pages/PortalAuth/PortalRegister";

import Quote from "./pages/Quote/Quote";

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <CustomerAuthProvider>
          <Routes>
            {/* الموقع العام */}
            <Route
              element={
                <MainLayout>
                  <Outlet />
                </MainLayout>
              }
            >
              <Route path="/" element={<Home />} />

              <Route
                path="/consultation"
                element={<Consultation />}
              />

              <Route
                path="/contact"
                element={<Contact />}
              />
            </Route>

            {/* تسجيل / دخول العميل */}
            <Route
              path="/portal/login"
              element={<PortalLogin />}
            />

            <Route
              path="/portal/register"
              element={<PortalRegister />}
            />

            {/* طلب عرض السعر - للعميل المسجل فقط */}
            <Route
              element={<RequireCustomerForQuote />}
            >
              <Route
                element={
                  <MainLayout>
                    <Outlet />
                  </MainLayout>
                }
              >
                <Route
                  path="/quote"
                  element={<Quote />}
                />
              </Route>
            </Route>

            {/* بوابة العملاء */}
            <Route
              element={<ProtectedCustomerRoute />}
            >
              <Route
                path="/portal"
                element={<CustomerPortalLayout />}
              >
                <Route
                  index
                  element={<PortalDashboard />}
                />

                <Route
                  path="requests"
                  element={<PortalRequests />}
                />

                <Route
                  path="quotations"
                  element={<PortalQuotations />}
                />

                <Route
                  path="quotations/:id"
                  element={<PortalQuotationDetail />}
                />

                <Route
                  path="projects"
                  element={<PortalProjects />}
                />

                <Route
                  path="invoices"
                  element={<PortalInvoices />}
                />
              </Route>
            </Route>

            {/* دخول الإدارة */}
            <Route
              path="/admin/login"
              element={<AdminLogin />}
            />

            {/* لوحة الإدارة */}
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

                {/* CRM */}
                <Route
                  path="crm"
                  element={<AdminSalesDashboard />}
                />

                <Route
                  path="customers"
                  element={<AdminCustomers />}
                />

                <Route
                  path="pipeline"
                  element={<AdminPipeline />}
                />

                <Route
                  path="followups"
                  element={<AdminFollowUps />}
                />

                {/* بوابة العملاء */}
                <Route
                  path="portal-users"
                  element={<AdminPortalUsers />}
                />

                {/* المشاريع والتجاري */}
                <Route
                  path="operations"
                  element={<AdminOperationsDashboard />}
                />

                <Route
                  path="project-management"
                  element={<AdminProjectManagement />}
                />

                <Route
                  path="project-commercial"
                  element={<AdminProjectCommercial />}
                />

                {/* المبيعات */}
                <Route
                  path="team"
                  element={<AdminTeam />}
                />

                <Route
                  path="quotations"
                  element={<AdminQuotations />}
                />

                <Route
                  path="quotations/new"
                  element={<AdminQuotationEditor />}
                />

                <Route
                  path="quotations/:id"
                  element={<AdminQuotationEditor />}
                />

                <Route
                  path="notifications"
                  element={<AdminNotifications />}
                />

                <Route
                  path="analytics"
                  element={<AdminAnalytics />}
                />

                {/* إدارة محتوى الموقع */}
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

            {/* 404 */}
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
        </CustomerAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
