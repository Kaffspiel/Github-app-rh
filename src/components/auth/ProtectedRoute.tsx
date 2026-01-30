import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin_master" | "admin" | "gestor" | "colaborador")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRoles, isLoading, currentRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has any allowed role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = userRoles.some((r) => allowedRoles.includes(r.role));
    
    if (!hasAllowedRole) {
      // Redirect based on actual role
      if (currentRole === "admin_master") {
        return <Navigate to="/admin-master" replace />;
      } else if (currentRole === "colaborador") {
        return <Navigate to="/app" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
}
