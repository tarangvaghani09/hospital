import React from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  allowedRoles?: string[];
  [key: string]: any;
}

export function ProtectedRoute({ component: Component, allowedRoles, ...rest }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If authenticated but wrong role, redirect to their designated dashboard
    switch (user.role) {
      case "SUPER_ADMIN":
        return <Redirect to="/super-admin/dashboard" />;
      case "HOSPITAL_ADMIN":
        return <Redirect to="/hospital/dashboard" />;
      case "DOCTOR":
        return <Redirect to="/doctor/dashboard" />;
      case "RECEPTIONIST":
        return <Redirect to="/receptionist/dashboard" />;
      case "PATIENT":
        return <Redirect to="/patient/dashboard" />;
      default:
        return <Redirect to="/login" />;
    }
  }

  return <Component {...rest} />;
}
