import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/authContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Layout
import { DashboardLayout } from "./layouts/DashboardLayout";

// Auth Pages
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";

// Resident Pages
import { ResidentDashboard } from "./pages/resident/Dashboard";
import { CreateComplaint } from "./pages/resident/CreateComplaint";
import { ComplaintDetails } from "./pages/resident/ComplaintDetails";
import { NoticesBoard } from "./pages/resident/NoticesBoard";
import { EditProfile } from "./pages/resident/EditProfile";

// Admin Pages
import { AdminDashboard } from "./pages/admin/Dashboard";
import { ComplaintsTable } from "./pages/admin/ComplaintsTable";
import { NoticesManager } from "./pages/admin/NoticesManager";
import { ResidentsManager } from "./pages/admin/ResidentsManager";
import { AuditLogs } from "./pages/admin/AuditLogs";

// Super Admin Pages
import { SuperadminDashboard } from "./pages/superadmin/SuperadminDashboard";

// Main Root Controller: Redirects logged in users to their dashboards
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role.name === "Superadmin") {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (user.role.name === "Admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/resident/dashboard" replace />;
    }
  }

  return <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root Redirect handler */}
          <Route path="/" element={<RootRedirect />} />

          {/* Resident Protected Routes */}
          <Route
            path="/resident/*"
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<ResidentDashboard />} />
                    <Route path="complaints" element={<ResidentDashboard />} /> {/* Fallback to dashboard summary or same view */}
                    <Route path="complaints/new" element={<CreateComplaint />} />
                    <Route path="complaints/:id" element={<ComplaintDetails />} />
                    <Route path="notices" element={<NoticesBoard />} />
                    <Route path="profile" element={<EditProfile />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="complaints" element={<ComplaintsTable />} />
                    <Route path="notices" element={<NoticesManager />} />
                    <Route path="residents" element={<ResidentsManager />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Superadmin Protected Routes */}
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRoles={["Superadmin"]}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<SuperadminDashboard />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
