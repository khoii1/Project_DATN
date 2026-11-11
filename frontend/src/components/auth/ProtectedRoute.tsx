import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AuthLoading } from "./AuthLoading";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  return children;
}

