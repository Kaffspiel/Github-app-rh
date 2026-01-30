import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, LogOut, Menu, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCompanies, useCompanyStats } from "@/hooks/useCompanies";
import { CompanyForm } from "@/components/admin-master/CompanyForm";
import { CompanyList } from "@/components/admin-master/CompanyList";
import { AddAdminForm } from "@/components/admin-master/AddAdminForm";
import type { Tables } from "@/integrations/supabase/types";

export default function AdminMaster() {
  const { signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Company form state
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Tables<"companies"> | null>(null);
  
  // Add admin form state
  const [addAdminFormOpen, setAddAdminFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Tables<"companies"> | null>(null);

  // Data fetching
  const { data: companies, isLoading: companiesLoading, refetch: refetchCompanies } = useCompanies();
  const { data: stats, refetch: refetchStats } = useCompanyStats();

  const handleNewCompany = () => {
    setEditingCompany(null);
    setCompanyFormOpen(true);
  };

  const handleEditCompany = (company: Tables<"companies">) => {
    setEditingCompany(company);
    setCompanyFormOpen(true);
  };

  const handleAddAdmin = (company: Tables<"companies">) => {
    setSelectedCompany(company);
    setAddAdminFormOpen(true);
  };

  const handleRefresh = () => {
    refetchCompanies();
    refetchStats();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Purple/Dark theme for Admin Master */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-purple-900 to-violet-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-purple-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold">OpsControl</h1>
                <p className="text-xs text-purple-200">Admin Master</p>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="text-white hover:bg-purple-800"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-white text-purple-900 font-semibold shadow-lg">
            <Building2 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Empresas</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-purple-700">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="text-xs text-purple-200">
                <p className="font-medium text-white mb-1">Admin Master</p>
                <p className="truncate">{user?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="w-full justify-start text-purple-200 hover:text-white hover:bg-purple-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut}
              className="w-full text-purple-200 hover:text-white hover:bg-purple-800"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Painel Admin Master</h1>
              <p className="text-gray-500 mt-1">Gerencie todas as empresas da plataforma</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Empresas Ativas
                </CardTitle>
                <Building2 className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.activeCompanies || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Total cadastradas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Colaboradores
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalEmployees || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Em todas as empresas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Alertas
                </CardTitle>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.alerts || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Pendentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Companies List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Empresas Cadastradas</CardTitle>
                  <CardDescription>Gerencie as empresas que utilizam a plataforma</CardDescription>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleNewCompany}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-purple-600" />
                  <p>Carregando empresas...</p>
                </div>
              ) : companies && companies.length > 0 ? (
                <CompanyList
                  companies={companies}
                  onEdit={handleEditCompany}
                  onAddAdmin={handleAddAdmin}
                  onRefresh={handleRefresh}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma empresa cadastrada ainda.</p>
                  <p className="text-sm mt-1">Clique em "Nova Empresa" para adicionar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Company Form Modal */}
      <CompanyForm
        open={companyFormOpen}
        onOpenChange={setCompanyFormOpen}
        company={editingCompany}
        onSuccess={handleRefresh}
      />

      {/* Add Admin Form Modal */}
      <AddAdminForm
        open={addAdminFormOpen}
        onOpenChange={setAddAdminFormOpen}
        company={selectedCompany}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
