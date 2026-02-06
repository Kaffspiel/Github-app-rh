import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRoles, isLoading, currentRole } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || "/";

  // Redirect authenticated users based on role
  useEffect(() => {
    if (!isLoading && user) {
      // Wait a moment for roles to load
      const timeout = setTimeout(() => {
        if (userRoles.length > 0) {
          if (currentRole === "admin_master") {
            navigate("/admin-master", { replace: true });
          } else if (currentRole === "colaborador") {
            navigate("/app", { replace: true });
          } else if (currentRole === "admin" || currentRole === "gestor") {
            navigate("/", { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        } else {
          // User has no roles - show error
          setError("Seu usuário não possui permissões configuradas. Entre em contato com o administrador.");
        }
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [user, userRoles, isLoading, currentRole, navigate, from]);

  const handleLoginSuccess = () => {
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">OpsControl</CardTitle>
          <CardDescription>Sistema de Gestão Operacional</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <LoginForm 
            onSuccess={handleLoginSuccess}
            onError={handleError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
