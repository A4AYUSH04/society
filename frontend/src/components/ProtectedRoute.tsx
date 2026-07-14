import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/authContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("Resident" | "Admin" | "Superadmin")[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role.name)) {
    // Redirect to their respective dashboards if they hit the wrong portal
    if (user.role.name === "Superadmin") {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (user.role.name === "Admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/resident/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
