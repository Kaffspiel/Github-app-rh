import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRoles, isLoading, currentRole } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    // Navigation will be handled by the useEffect above
  };

  const handleSignupSuccess = () => {
    setError(null);
    setSuccessMessage("Conta criada! Verifique seu email para confirmar o cadastro.");
  };

  const handleError = (message: string) => {
    setError(message);
    setSuccessMessage(null);
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

          {successMessage && (
            <Alert className="mb-4 border-green-500 text-green-700 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-4">
              <LoginForm 
                onSuccess={handleLoginSuccess}
                onError={handleError}
              />
            </TabsContent>
            
            <TabsContent value="signup" className="mt-4">
              <SignupForm 
                onSuccess={handleSignupSuccess}
                onError={handleError}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
