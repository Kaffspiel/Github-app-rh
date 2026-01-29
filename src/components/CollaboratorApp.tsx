import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, MessageSquare, Clock, MapPin, Play, Pause, ChevronRight, Bell, ClipboardList, AlertTriangle, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp, Task } from "@/context/AppContext";

export function CollaboratorApp() {
  const { tasks, currentUser } = useApp();
  const [workStatus, setWorkStatus] = useState<"working" | "break" | "off">("off");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [viewAsUser, setViewAsUser] = useState(currentUser);

  useEffect(() => {
    setViewAsUser(currentUser);
  }, [currentUser]);

  const userTasks = tasks.filter(t => t.assignee === viewAsUser && t.status !== 'concluido');
  const dailyRoutines = userTasks.filter(t => t.isDailyRoutine);
  const assignedTasks = userTasks.filter(t => !t.isDailyRoutine);

  const getPriorityWeight = (p: string) => {
    switch (p) { case 'alta': return 3; case 'média': return 2; case 'baixa': return 1; default: return 0; }
  };

  const sortedAssignedTasks = [...assignedTasks].sort((a, b) => {
    const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (weightDiff !== 0) return weightDiff;
    const dateA = a.createdDate ? new Date(a.createdDate.split('/').reverse().join('-')).getTime() : Date.now();
    const dateB = b.createdDate ? new Date(b.createdDate.split('/').reverse().join('-')).getTime() : Date.now();
    return dateA - dateB;
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (workStatus === "working") {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workStatus]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClockAction = () => {
    setWorkStatus(prev => (prev === "working" ? "break" : "working"));
  };

  const SmallTaskCard = ({ task }: { task: Task }) => (
    <Card className={`relative overflow-hidden border-0 shadow-md transition-all active:scale-95 group hover:shadow-lg ${task.priority === 'alta' ? 'bg-orange-50/50' : 'bg-white'}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${task.priority === 'alta' ? 'bg-red-500' : task.priority === 'média' ? 'bg-orange-400' : 'bg-blue-400'
        }`} />

      <CardContent className="p-4 flex flex-col h-full justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-900 line-clamp-2 text-sm leading-tight pr-2 group-hover:text-blue-700 transition-colors">
              {task.title}
            </h4>
            <Badge variant="outline" className="text-[9px] px-1 h-4 uppercase font-bold shrink-0">
              {task.priority}
            </Badge>
          </div>

          <p className="text-gray-500 text-[11px] line-clamp-2 mb-3 leading-snug">
            {task.description}
          </p>
        </div>

        <div className="space-y-3 mt-auto">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
              <span>Progresso</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1.5 rounded-full bg-gray-100" />
          </div>

          <Button size="sm" className={`w-full text-[11px] font-bold h-8 rounded-lg ${task.progress === 0
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}>
            {task.progress === 0 ? "INICIAR" : "CONTINUAR"}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 font-sans max-w-md mx-auto md:max-w-full md:mx-0 border-x md:border-none shadow-xl md:shadow-none bg-white">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8" />

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full border-2 border-white/30 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Olá, bom trabalho!</p>
              <h1 className="text-xl font-bold">{viewAsUser}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={viewAsUser} onValueChange={setViewAsUser}>
              <SelectTrigger className="w-[140px] h-9 bg-white/10 border-white/20 text-white text-xs">
                <Eye className="w-3 h-3 mr-2" />
                <SelectValue placeholder="Ver como..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                <SelectItem value="João Silva">João Silva</SelectItem>
                <SelectItem value="Ana Lima">Ana Lima</SelectItem>
                <SelectItem value="Carlos Rocha">Carlos Rocha</SelectItem>
                <SelectItem value="Pedro Costa">Pedro Costa</SelectItem>
                <SelectItem value="Katiele Rocha">Katiele Rocha</SelectItem>
                <SelectItem value="Julia Mendes">Julia Mendes</SelectItem>
              </SelectContent>
            </Select>

            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full border border-blue-800"></span>
            </Button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl flex items-center justify-between relative z-10">
          <div>
            <p className="text-blue-100 text-xs uppercase tracking-wider mb-1">
              {workStatus === "working" ? "Jornada em andamento" : "Você está offline"}
            </p>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-300" />
              <span className="text-3xl font-mono font-semibold tracking-tight">
                {workStatus === "working" ? formatTime(elapsedTime) : "--:--:--"}
              </span>
            </div>
          </div>
          <Button
            size="icon"
            className={`h-12 w-12 rounded-full shadow-lg border-2 border-white/20 transition-all ${workStatus === "working"
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-green-500 hover:bg-green-600"
              }`}
            onClick={handleClockAction}
          >
            {workStatus === "working" ? <Pause className="fill-white" /> : <Play className="fill-white ml-1" />}
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Loja Centro • São Paulo</span>
          {viewAsUser !== currentUser && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-100">
              MODO ESPELHO
            </Badge>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Rotinas Diárias
            </h3>
            {dailyRoutines.length > 0 && (
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {dailyRoutines.length}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {dailyRoutines.length > 0 ? (
              dailyRoutines.map(routine => (
                <div key={routine.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm group active:bg-blue-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{routine.title}</h4>
                      <p className="text-gray-500 text-[11px] mt-1">{routine.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">{routine.priority}</Badge>
                  </div>
                  <div className="space-y-2">
                    {routine.checklist.length > 0 ? (
                      routine.checklist.map(item => (
                        <div key={item.id} className="flex items-center gap-2 group/item">
                          <Checkbox id={`r-${item.id}`} checked={item.completed} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <label htmlFor={`r-${item.id}`} className={`text-xs ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'} font-medium cursor-pointer`}>
                            {item.text}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <div className="flex-1 mr-4">
                          <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase mb-1">
                            <span>Conclusão</span>
                            <span>{routine.progress}%</span>
                          </div>
                          <Progress value={routine.progress} className="h-1 bg-gray-100" />
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-blue-600 hover:bg-blue-50">
                          DETALHES
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium">
                Nenhuma rotina pendente.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Tarefas Extra
            </h3>
            {sortedAssignedTasks.length > 0 && (
              <Badge variant="secondary" className="rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                {sortedAssignedTasks.length}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {sortedAssignedTasks.length > 0 ? (
              sortedAssignedTasks.map((task) => (
                <SmallTaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="col-span-2 p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium">
                Pode Relaxar! Nenhuma tarefa extra atribuída.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#1dbf57] shadow-xl shadow-green-200 border-2 border-white ring-4 ring-green-100/50"
        >
          <MessageSquare className="w-7 h-7 fill-white text-white" />
        </Button>
      </div>
    </div>
  );
}
