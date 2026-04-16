import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Layout from "./components/Layout"
import AdminLayout from "./components/AdminLayout"
import Login from "./pages/Login"
import BecomePartner from "./pages/BecomePartner"
import Dashboard from "./pages/Dashboard"
import Events from "./pages/Events"
import EventDetail from "./pages/EventDetail"
import Agenda from "./pages/Agenda"
import Attendees from "./pages/Attendees"
import Field from "./pages/Field"
import Attendance from "./pages/Attendance"
import Reports from "./pages/Reports"
import Wallet from "./pages/Wallet"
import Orders from "./pages/Orders"
import Profile from "./pages/Profile"
import OrgUsers from "./pages/OrgUsers"
import SupportTickets from "./pages/SupportTickets"
import SupportTicketDetail from "./pages/SupportTicketDetail"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminPartnerApplications from "./pages/admin/AdminPartnerApplications"
import AdminPayouts from "./pages/admin/AdminPayouts"
import AdminOrganizations from "./pages/admin/AdminOrganizations"
import AdminCategories from "./pages/admin/AdminCategories"
import AdminEvents from "./pages/admin/AdminEvents"
import AdminEventDetail from "./pages/admin/AdminEventDetail"
import AdminReports from "./pages/admin/AdminReports"
import AdminBroadcastNotifications from "./pages/admin/AdminBroadcastNotifications"
import AdminSupportTickets from "./pages/admin/AdminSupportTickets"
import AdminSupportTicketDetail from "./pages/admin/AdminSupportTicketDetail"
import AdminFinance from "./pages/admin/AdminFinance"

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="org-app flex min-h-screen items-center justify-center">
        <div
          className="size-9 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-600"
          aria-hidden
        />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.isSuperAdmin) return <Navigate to="/admin" replace />
  return children
}

function AdminProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="admin-app flex min-h-screen items-center justify-center bg-surface-canvas">
        <div
          className="size-9 animate-spin rounded-full border-2 border-slate-200 border-t-brand-sky"
          aria-hidden
        />
      </div>
    )
  }
  if (!user || !user.isSuperAdmin) return <Navigate to="/admin/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/become-partner" element={<BecomePartner />} />
      <Route path="/register" element={<Navigate to="/become-partner" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="partners" element={<AdminPartnerApplications />} />
        <Route path="organizations" element={<AdminOrganizations />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/:eventId" element={<AdminEventDetail />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="payouts" element={<AdminPayouts />} />
        <Route path="notifications" element={<AdminBroadcastNotifications />} />
        <Route path="support" element={<AdminSupportTickets />} />
        <Route path="support/:ticketId" element={<AdminSupportTicketDetail />} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="attendees" element={<Attendees />} />
        <Route path="field" element={<Field />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="profile" element={<Profile />} />
        <Route path="org-users" element={<OrgUsers />} />
        <Route path="support" element={<SupportTickets />} />
        <Route path="support/:ticketId" element={<SupportTicketDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
