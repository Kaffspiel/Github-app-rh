import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Home, ListChecks, Clock, User, LogOut, Bell, 
  CheckCircle2, AlertCircle, Calendar, Trophy,
  ChevronRight, RefreshCw, Star, Flame, ClipboardList, Play
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCollaboratorTasks } from "@/hooks/useCollaboratorTasks";
import { format, isToday, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type MobileView = "home" | "tasks" | "time" | "profile";

interface TimeRecord {
  id: string;
  record_date: string;
  entry_1: string | null;
  exit_1: string | null;
  entry_2: string | null;
  exit_2: string | null;
  status: string | null;
  anomalies: string[] | null;
}

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  whatsapp_number: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
}

export default function CollaboratorMobileApp() {
  const { signOut, user } = useAuth();
  const [currentView, setCurrentView] = useState<MobileView>("home");
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [todayRecord, setTodayRecord] = useState<TimeRecord | null>(null);
  const [stats, setStats] = useState({
    pendingTasks: 0,
    unreadNotifications: 0,
    monthlyPresence: 0,
    streak: 0
  });

  // Use the collaborator tasks hook
  const { 
    tasks, 
    isLoading: tasksLoading, 
    toggleChecklistItem, 
    updateTaskStatus,
    refetch: refetchTasks 
  } = useCollaboratorTasks();

  const dailyRoutines = tasks.filter(t => t.is_daily_routine);
  const extraTasks = tasks.filter(t => !t.is_daily_routine);

  // Update pending tasks stat when tasks change
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      pendingTasks: tasks.length
    }));
  }, [tasks]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadTimeRecords(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (!error && data) {
      setProfile(data as EmployeeProfile);
    }
  };

  const loadTimeRecords = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    // Get employee ID first
    const { data: employee } = await supabase
      .from("employees")
      .select("id, external_id")
      .eq("user_id", user?.id)
      .single();

    if (!employee) return;

    // Load time records for this month
    const { data: records, error } = await supabase
      .from("time_tracking_records")
      .select("*")
      .or(`employee_id.eq.${employee.id},external_employee_id.eq.${employee.external_id || 'none'}`)
      .gte("record_date", monthStart)
      .lte("record_date", monthEnd)
      .order("record_date", { ascending: false });

    if (!error && records) {
      setTimeRecords(records as TimeRecord[]);
      
      // Find today's record
      const todaysRecord = records.find(r => r.record_date === today);
      setTodayRecord(todaysRecord || null);

      // Calculate monthly presence rate
      const daysWithRecords = records.filter(r => r.entry_1).length;
      const workDaysInMonth = 22; // Average work days
      const presenceRate = Math.round((daysWithRecords / workDaysInMonth) * 100);
      
      setStats(prev => ({ 
        ...prev, 
        monthlyPresence: Math.min(presenceRate, 100),
        streak: calculateStreak(records)
      }));
    }
  };

  const loadNotifications = async () => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!employee) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setStats(prev => ({
        ...prev,
        unreadNotifications: data.filter(n => !n.read_at).length
      }));
    }
  };

  const calculateStreak = (records: TimeRecord[]): number => {
    let streak = 0;
    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
    );
    
    for (const record of sortedRecords) {
      if (record.entry_1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    
    loadNotifications();
  };

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    return time.substring(0, 5);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "normal": return "bg-green-100 text-green-700";
      case "delay": return "bg-orange-100 text-orange-700";
      case "absence": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "normal": return "Normal";
      case "delay": return "Atraso";
      case "absence": return "Falta";
      case "imported": return "Importado";
      default: return status || "Pendente";
    }
  };

  const navigation = [
    { id: "home" as MobileView, name: "Início", icon: Home },
    { id: "tasks" as MobileView, name: "Tarefas", icon: ListChecks },
    { id: "time" as MobileView, name: "Ponto", icon: Clock },
    { id: "profile" as MobileView, name: "Perfil", icon: User },
  ];

  const renderHomeView = () => (
    <div className="p-4 space-y-4">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              <AvatarFallback className="bg-blue-500 text-white text-xl">
                {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                Olá, {profile?.name?.split(" ")[0] || "Colaborador"}!
              </h2>
              <p className="text-blue-100 text-sm">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Punches */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ponto de Hoje
            </span>
            {todayRecord && (
              <Badge className={getStatusColor(todayRecord.status)}>
                {getStatusLabel(todayRecord.status)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500">Entrada 1</p>
              <p className="text-lg font-bold text-green-600">
                {formatTime(todayRecord?.entry_1)}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-500">Saída 1</p>
              <p className="text-lg font-bold text-orange-600">
                {formatTime(todayRecord?.exit_1)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-500">Entrada 2</p>
              <p className="text-lg font-bold text-blue-600">
                {formatTime(todayRecord?.entry_2)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-500">Saída 2</p>
              <p className="text-lg font-bold text-purple-600">
                {formatTime(todayRecord?.exit_2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-2">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.monthlyPresence}%</p>
              <p className="text-xs text-green-600">Presença Mensal</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-orange-500 rounded-full p-2">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.streak}</p>
              <p className="text-xs text-orange-600">Dias Consecutivos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Summary */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Tarefas Pendentes
              <Badge className="ml-auto bg-blue-100 text-blue-700">{tasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold text-blue-700">{dailyRoutines.length}</p>
                <p className="text-xs text-blue-600">Rotinas</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <p className="text-lg font-bold text-orange-700">{extraTasks.length}</p>
                <p className="text-xs text-orange-600">Extras</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-3" 
              onClick={() => setCurrentView("tasks")}
            >
              Ver Tarefas
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
              {stats.unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.unreadNotifications}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                onClick={() => markNotificationAsRead(notification.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  notification.read_at ? "bg-gray-50" : "bg-blue-50 border-l-4 border-blue-500"
                }`}
              >
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{notification.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTasksView = () => {
    const handleStartTask = async (taskId: string) => {
      await updateTaskStatus(taskId, 'andamento');
    };

    const handleChecklistToggle = async (itemId: string, currentState: boolean) => {
      await toggleChecklistItem(itemId, !currentState);
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'alta': return 'bg-red-500';
        case 'média': return 'bg-orange-400';
        default: return 'bg-blue-400';
      }
    };

    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Minhas Tarefas</h2>
          <Button variant="ghost" size="sm" onClick={refetchTasks} disabled={tasksLoading}>
            <RefreshCw className={`w-4 h-4 ${tasksLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Daily Routines Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Rotinas Diárias
            </h3>
            {dailyRoutines.length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                {dailyRoutines.length}
              </Badge>
            )}
          </div>

          {dailyRoutines.length > 0 ? (
            <div className="space-y-3">
              {dailyRoutines.map(routine => (
                <Card key={routine.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{routine.title}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {routine.priority}
                      </Badge>
                    </div>
                    {routine.description && (
                      <p className="text-sm text-gray-500 mb-3">{routine.description}</p>
                    )}
                    {routine.checklist.length > 0 ? (
                      <div className="space-y-2">
                        {routine.checklist.map(item => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox 
                              checked={item.completed}
                              onCheckedChange={() => handleChecklistToggle(item.id, item.completed)}
                            />
                            <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Progresso</span>
                          <span>{routine.progress}%</span>
                        </div>
                        <Progress value={routine.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-gray-400 text-sm">Nenhuma rotina diária pendente</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Extra Tasks Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Tarefas Extra
            </h3>
            {extraTasks.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                {extraTasks.length}
              </Badge>
            )}
          </div>

          {extraTasks.length > 0 ? (
            <div className="space-y-3">
              {extraTasks.map(task => (
                <Card key={task.id} className="overflow-hidden">
                  <div className={`h-1 ${getPriorityColor(task.priority)}`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 mb-3">{task.description}</p>
                    )}
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Progresso</span>
                        <span>{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                      <Button 
                        size="sm" 
                        className={`w-full ${task.status === 'pendente' 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-orange-500 hover:bg-orange-600'}`}
                        onClick={() => task.status === 'pendente' && handleStartTask(task.id)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {task.status === 'pendente' ? 'INICIAR' : 'EM ANDAMENTO'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-gray-400 text-sm">Nenhuma tarefa extra atribuída</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    );
  };

  const renderTimeView = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Histórico de Ponto</h2>
        <Button variant="ghost" size="sm" onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Current Month Summary */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">
                {format(new Date(), "MMMM yyyy", { locale: ptBR })}
              </p>
              <p className="text-2xl font-bold">{timeRecords.length} registros</p>
            </div>
            <Calendar className="w-10 h-10 text-slate-400" />
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-2">
          {timeRecords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhum registro encontrado</p>
              </CardContent>
            </Card>
          ) : (
            timeRecords.map((record) => (
              <Card key={record.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        record.status === "normal" ? "bg-green-500" :
                        record.status === "delay" ? "bg-orange-500" :
                        record.status === "absence" ? "bg-red-500" :
                        "bg-gray-400"
                      }`} />
                      <span className="font-medium">
                        {format(parseISO(record.record_date), "EEEE, d", { locale: ptBR })}
                      </span>
                    </div>
                    <Badge variant="outline" className={getStatusColor(record.status)}>
                      {getStatusLabel(record.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div>
                      <p className="text-gray-400">E1</p>
                      <p className="font-mono">{formatTime(record.entry_1)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">S1</p>
                      <p className="font-mono">{formatTime(record.exit_1)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">E2</p>
                      <p className="font-mono">{formatTime(record.entry_2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">S2</p>
                      <p className="font-mono">{formatTime(record.exit_2)}</p>
                    </div>
                  </div>
                  {record.anomalies && record.anomalies.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-orange-600">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">{record.anomalies.join(", ")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderProfileView = () => (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{profile?.name || "Colaborador"}</h2>
            <p className="text-gray-500">{profile?.department || "Departamento"}</p>
            <Badge className="mt-2" variant="secondary">{profile?.role || "colaborador"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{profile?.email || user?.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-gray-500">WhatsApp</span>
            <span className="font-medium">{profile?.whatsapp_number || "Não configurado"}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Departamento</span>
            <span className="font-medium">{profile?.department || "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Star className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.monthlyPresence}%</p>
              <p className="text-xs text-gray-500">Taxa de Presença</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Flame className="w-6 h-6 mx-auto mb-1 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">{stats.streak}</p>
              <p className="text-xs text-gray-500">Sequência Atual</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        variant="outline" 
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => {
          signOut();
          toast.success("Logout realizado com sucesso!");
        }}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da Conta
      </Button>
    </div>
  );

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (currentView) {
      case "home": return renderHomeView();
      case "tasks": return renderTasksView();
      case "time": return renderTimeView();
      case "profile": return renderProfileView();
      default: return null;
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
        <Button variant="ghost" size="sm" className="relative" onClick={() => setCurrentView("home")}>
          <Bell className="w-5 h-5" />
          {stats.unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {stats.unreadNotifications}
            </span>
          )}
        </Button>
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
