import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminMaster from "./pages/AdminMaster";
import CollaboratorMobileApp from "./pages/CollaboratorMobileApp";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

import { NotificationProvider } from "./context/NotificationContext";
import { NotificationQueueProcessor } from "./components/settings/NotificationQueueProcessor";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <NotificationProvider>
            <CompanyProvider>
              <NotificationQueueProcessor />
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* Public route */}
                    <Route path="/auth" element={<Auth />} />

                    {/* Admin Master route */}
                    <Route
                      path="/admin-master"
                      element={
                        <ProtectedRoute allowedRoles={["admin_master"]}>
                          <AdminMaster />
                        </ProtectedRoute>
                      }
                    />

                    {/* Collaborator mobile app */}
                    <Route
                      path="/app"
                      element={
                        <ProtectedRoute allowedRoles={["colaborador"]}>
                          <CollaboratorMobileApp />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/app/*"
                      element={
                        <ProtectedRoute allowedRoles={["colaborador"]}>
                          <CollaboratorMobileApp />
                        </ProtectedRoute>
                      }
                    />

                    {/* Company dashboard (admin/gestor) */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute allowedRoles={["admin", "gestor"]}>
                          <Index />
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </CompanyProvider>
          </NotificationProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
