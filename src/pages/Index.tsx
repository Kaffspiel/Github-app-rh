import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ListChecks, Users, Clock, Trophy, FileText, Menu, UsersRound } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { TaskManagement } from "@/components/TaskManagement";
import { CollaboratorApp } from "@/components/CollaboratorApp";
import { TimeTracking } from "@/components/TimeTracking";
import { Gamification } from "@/components/Gamification";
import { Reports } from "@/components/Reports";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { useApp, View } from "@/context/AppContext";

const Index = () => {
  const { currentView, setCurrentView } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { id: "dashboard" as View, name: "Dashboard", icon: LayoutDashboard },
    { id: "tasks" as View, name: "Tarefas", icon: ListChecks },
    { id: "employees" as View, name: "Colaboradores", icon: UsersRound },
    { id: "collaborator" as View, name: "App Colaborador", icon: Users },
    { id: "timetracking" as View, name: "Controle de Ponto", icon: Clock },
    { id: "gamification" as View, name: "Gamificação", icon: Trophy },
    { id: "reports" as View, name: "Relatórios", icon: FileText },
  ];

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <Dashboard />;
      case "tasks": return <TaskManagement />;
      case "employees": return <EmployeeManagement />;
      case "collaborator": return <CollaboratorApp />;
      case "timetracking": return <TimeTracking />;
      case "gamification": return <Gamification />;
      case "reports": return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-blue-900 to-indigo-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold">OpsControl</h1>
                <p className="text-xs text-blue-200">Sistema de Gestão</p>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-blue-800">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isActive ? "bg-white text-blue-900 font-semibold shadow-lg" : "text-blue-100 hover:bg-blue-800"} ${!sidebarOpen && "justify-center"}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          {sidebarOpen ? (
            <div className="text-xs text-blue-200">
              <p className="font-medium text-white mb-1">João Silva</p>
              <p>Gestor de Operações</p>
              <p className="mt-2 text-blue-300">Loja Centro • SP</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold">JS</div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{renderView()}</main>
    </div>
  );
};

export default Index;
