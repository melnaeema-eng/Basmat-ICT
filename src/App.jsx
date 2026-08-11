import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import RequireAdminPermission from "./components/admin/RequireAdminPermission";
import AdminPermissionRoute from "./components/admin/AdminPermissionRoute";
import ProtectedCustomerRoute from "./components/customer/ProtectedCustomerRoute";
import RequireCustomerAccount from "./components/customer/RequireCustomerAccount";

import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { CustomerAuthProvider } from "./contexts/CustomerAuthContext";

import AdminLayout from "./layouts/AdminLayout";
import CustomerPortalLayout from "./layouts/CustomerPortalLayout";
import MainLayout from "./layouts/MainLayout";

import AdminAnalytics from "./pages/Admin/AdminAnalytics";
import AdminAccessControl from "./pages/Admin/AdminAccessControl";
import AdminAccessDenied from "./pages/Admin/AdminAccessDenied";
import AdminExecutiveReports from "./pages/Admin/AdminExecutiveReports";
import AdminConsultations from "./pages/Admin/AdminConsultations";
import AdminContacts from "./pages/Admin/AdminContacts";
import AdminCustomers from "./pages/Admin/AdminCustomers";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminDocuments from "./pages/Admin/AdminDocuments";
import AdminFollowUps from "./pages/Admin/AdminFollowUps";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminResetPassword from "./pages/Admin/AdminResetPassword";
import AdminNotifications from "./pages/Admin/AdminNotifications";
import AdminOperationsDashboard from "./pages/Admin/AdminOperationsDashboard";
import AdminPartners from "./pages/Admin/AdminPartners";
import AdminPipeline from "./pages/Admin/AdminPipeline";
import AdminPortalUsers from "./pages/Admin/AdminPortalUsers";
import AdminProjectCommercial from "./pages/Admin/AdminProjectCommercial";
import AdminProjectManagement from "./pages/Admin/AdminProjectManagement";
import AdminSupportTickets from "./pages/Admin/AdminSupportTickets";
import AdminProjectDocuments from "./pages/Admin/AdminProjectDocuments";
import AdminProjects from "./pages/Admin/AdminProjects";
import AdminQuotationEditor from "./pages/Admin/AdminQuotationEditor";
import AdminQuotations from "./pages/Admin/AdminQuotations";
import AdminRFQs from "./pages/Admin/AdminRFQs";
import AdminSalesDashboard from "./pages/Admin/AdminSalesDashboard";
import AdminServices from "./pages/Admin/AdminServices";
import AdminSettings from "./pages/Admin/AdminSettings";
import AdminTeam from "./pages/Admin/AdminTeam";
import AdminWorkflowCenter from "./pages/Admin/AdminWorkflowCenter";

import Consultation from "./pages/Consultation/Consultation";
import Contact from "./pages/Contact/Contact";
import Home from "./pages/Home/Home";
import PlaceholderPage from "./pages/Placeholder/PlaceholderPage";

import PortalDashboard from "./pages/Portal/PortalDashboard";
import PortalInvoices from "./pages/Portal/PortalInvoices";
import PortalDocuments from "./pages/Portal/PortalDocuments";
import PortalLogin from "./pages/Portal/PortalLogin";
import PortalNDA from "./pages/Portal/PortalNDA";
import PortalNotifications from "./pages/Portal/PortalNotifications";
import PortalProjects from "./pages/Portal/PortalProjects";
import PortalQuotationDetail from "./pages/Portal/PortalQuotationDetail";
import PortalQuotations from "./pages/Portal/PortalQuotations";
import PortalRequests from "./pages/Portal/PortalRequests";
import PortalSupport from "./pages/Portal/PortalSupport";
import PortalResetPassword from "./pages/Portal/PortalResetPassword";

import PortalRegister from "./pages/PortalAuth/PortalRegister";
import Quote from "./pages/Quote/Quote";

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <CustomerAuthProvider>
          <Routes>
            {/* Public site */}
            <Route element={<MainLayout><Outlet /></MainLayout>}>
              <Route path="/" element={<Home />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* Customer authentication */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal/register" element={<PortalRegister />} />
            <Route path="/portal/reset-password" element={<PortalResetPassword />} />

            {/* Customer account required */}
            <Route element={<RequireCustomerAccount />}>
              <Route element={<MainLayout><Outlet /></MainLayout>}>
                <Route path="/quote" element={<Quote />} />
                <Route path="/project" element={<Quote />} />
                <Route path="/have-project" element={<Quote />} />
                <Route path="/consultation" element={<Consultation />} />
              </Route>
            </Route>

            {/* Customer portal */}
            <Route element={<ProtectedCustomerRoute />}>
              <Route path="/portal" element={<CustomerPortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="requests" element={<PortalRequests />} />
                <Route path="nda/:id" element={<PortalNDA />} />
                <Route path="quotations" element={<PortalQuotations />} />
                <Route path="quotations/:id" element={<PortalQuotationDetail />} />
                <Route path="projects" element={<PortalProjects />} />
                <Route path="invoices" element={<PortalInvoices />} />
                <Route path="documents" element={<PortalDocuments />} />
                <Route path="support" element={<PortalSupport />} />
                <Route path="notifications" element={<PortalNotifications />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />

            <Route element={<ProtectedAdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminPermissionRoute permission="dashboard"><AdminDashboard /></AdminPermissionRoute>} />
                <Route path="contacts" element={<AdminPermissionRoute permission="requests"><AdminContacts /></AdminPermissionRoute>} />
                <Route path="rfqs" element={<AdminPermissionRoute permission="requests"><AdminRFQs /></AdminPermissionRoute>} />
                <Route path="consultations" element={<AdminPermissionRoute permission="requests"><AdminConsultations /></AdminPermissionRoute>} />
                <Route path="documents" element={<AdminPermissionRoute permission="requests"><AdminDocuments /></AdminPermissionRoute>} />

                <Route path="crm" element={<AdminPermissionRoute permission="crm"><AdminSalesDashboard /></AdminPermissionRoute>} />
                <Route path="customers" element={<AdminPermissionRoute permission="crm"><AdminCustomers /></AdminPermissionRoute>} />
                <Route path="pipeline" element={<AdminPermissionRoute permission="crm"><AdminPipeline /></AdminPermissionRoute>} />
                <Route path="followups" element={<AdminPermissionRoute permission="crm"><AdminFollowUps /></AdminPermissionRoute>} />
                <Route path="portal-users" element={<AdminPermissionRoute permission="requests"><AdminPortalUsers /></AdminPermissionRoute>} />

                <Route path="workflow" element={<AdminPermissionRoute permission="requests"><AdminWorkflowCenter /></AdminPermissionRoute>} />
                <Route path="operations" element={<AdminPermissionRoute permission="operations"><AdminOperationsDashboard /></AdminPermissionRoute>} />
                <Route path="project-management" element={<AdminPermissionRoute permission="operations"><AdminProjectManagement /></AdminPermissionRoute>} />
                <Route path="project-commercial" element={<AdminPermissionRoute permission="operations"><AdminProjectCommercial /></AdminPermissionRoute>} />
                <Route path="project-documents" element={<AdminPermissionRoute permission="documents"><AdminProjectDocuments /></AdminPermissionRoute>} />
                <Route path="support" element={<AdminPermissionRoute permission="support"><AdminSupportTickets /></AdminPermissionRoute>} />

                <Route path="team" element={<AdminPermissionRoute permission="team"><AdminTeam /></AdminPermissionRoute>} />
                <Route path="quotations" element={<AdminPermissionRoute permission="quotations"><AdminQuotations /></AdminPermissionRoute>} />
                <Route path="quotations/new" element={<AdminPermissionRoute permission="quotations"><AdminQuotationEditor /></AdminPermissionRoute>} />
                <Route path="quotations/:id" element={<AdminPermissionRoute permission="quotations"><AdminQuotationEditor /></AdminPermissionRoute>} />
                <Route path="notifications" element={<AdminPermissionRoute permission="notifications"><AdminNotifications /></AdminPermissionRoute>} />
                <Route path="analytics" element={<AdminPermissionRoute permission="reports"><AdminAnalytics /></AdminPermissionRoute>} />
                <Route path="executive-reports" element={<AdminPermissionRoute permission="reports"><AdminExecutiveReports /></AdminPermissionRoute>} />

                <Route path="projects" element={<AdminPermissionRoute permission="content"><AdminProjects /></AdminPermissionRoute>} />
                <Route path="services" element={<AdminPermissionRoute permission="content"><AdminServices /></AdminPermissionRoute>} />
                <Route path="partners" element={<AdminPermissionRoute permission="content"><AdminPartners /></AdminPermissionRoute>} />
                <Route path="settings" element={<AdminPermissionRoute permission="content"><AdminSettings /></AdminPermissionRoute>} />
                <Route path="access-control" element={<RequireAdminPermission permission="access_control"><AdminAccessControl /></RequireAdminPermission>} />
                <Route path="access-denied" element={<AdminAccessDenied />} />
              </Route>
            </Route>

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
