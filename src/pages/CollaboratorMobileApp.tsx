import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ListChecks, Clock, User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type MobileView = "home" | "tasks" | "time" | "profile";

export default function CollaboratorMobileApp() {
  const { signOut, user } = useAuth();
  const [currentView, setCurrentView] = useState<MobileView>("home");

  const navigation = [
    { id: "home" as MobileView, name: "Início", icon: Home },
    { id: "tasks" as MobileView, name: "Tarefas", icon: ListChecks },
    { id: "time" as MobileView, name: "Ponto", icon: Clock },
    { id: "profile" as MobileView, name: "Perfil", icon: User },
  ];

  const renderView = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">0</p>
                    <p className="text-sm text-gray-600">Tarefas Pendentes</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">--:--</p>
                    <p className="text-sm text-gray-600">Entrada Hoje</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "tasks":
        return (
          <div className="p-4">
            <Card>
              <CardContent className="text-center py-12">
                <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhuma tarefa atribuída</p>
              </CardContent>
            </Card>
          </div>
        );
      case "time":
        return (
          <div className="p-4">
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Histórico de ponto vazio</p>
              </CardContent>
            </Card>
          </div>
        );
      case "profile":
        return (
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meu Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-900">OpsControl</h1>
          <p className="text-xs text-gray-500">Área do Colaborador</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? "text-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "stroke-2" : ""}`} />
                <span className="text-xs mt-1">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
