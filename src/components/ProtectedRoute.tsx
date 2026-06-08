import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Loading } from "./ui";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
