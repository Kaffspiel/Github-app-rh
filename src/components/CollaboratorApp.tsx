import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { User, MessageSquare, Clock, MapPin, Play, Pause, ChevronRight, Bell, ClipboardList, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useCollaboratorTasks, CollaboratorTask } from "@/hooks/useCollaboratorTasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function CollaboratorApp() {
  const { tasks, employeeName, isLoading, toggleChecklistItem, updateTaskStatus, skipTimeTracking, projects } = useCollaboratorTasks();
  const [workStatus, setWorkStatus] = useState<"working" | "break" | "off">("off");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "rotinas" | "tarefas" | "concluidas">("all");
  const { toast } = useToast();

  const routineProjects = projects.filter(p => p.is_daily_routine);
  const standaloneRoutineTasks = tasks.filter(t => t.is_daily_routine && (!t.project_id || !projects.find(p => p.id === t.project_id)?.is_daily_routine));
  const assignedTasks = tasks.filter(t => !t.is_daily_routine && (!t.project_id || !projects.find(p => p.id === t.project_id)?.is_daily_routine));

  const getPriorityWeight = (p: string) => {
    switch (p) { case 'alta': return 3; case 'média': return 2; case 'baixa': return 1; default: return 0; }
  };

  const sortedAssignedTasks = [...assignedTasks].sort((a, b) => {
    const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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

  const handleChecklistToggle = async (itemId: string, currentState: boolean) => {
    await toggleChecklistItem(itemId, !currentState);
  };

  const handleStartTask = async (taskId: string) => {
    await updateTaskStatus(taskId, 'andamento');
  };

  const SmallTaskCard = ({ task }: { task: CollaboratorTask }) => (
    <Card className={cn(
      "relative overflow-hidden border border-gray-100 shadow-sm transition-all active:scale-[0.97] group hover:shadow-md h-full flex flex-col",
      task.priority === 'alta' ? "bg-red-50/30" : "bg-white"
    )}>
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full",
        task.priority === 'alta' ? 'bg-red-500' : task.priority === 'média' ? 'bg-orange-400' : 'bg-blue-400'
      )} />

      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2 gap-2">
          <Badge variant="outline" className={cn(
            "text-[8px] px-1.5 h-4 uppercase font-black shrink-0 tracking-tighter",
            task.priority === 'alta' ? "border-red-200 text-red-600" : "border-gray-200 text-gray-500"
          )}>
            {task.priority}
          </Badge>
          {task.status === 'andamento' && <Badge className="bg-blue-600 text-[8px] h-4 animate-pulse">EM CURSO</Badge>}
        </div>

        <h4 className="font-black text-gray-900 line-clamp-2 text-[13px] leading-tight mb-2 group-hover:text-blue-700 transition-colors">
          {task.title}
        </h4>
        
        {task.project_name && (
          <div className="flex items-center gap-1.5 mb-3 bg-gray-50/80 p-1 px-1.5 rounded-md w-fit border border-gray-100">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project_color || '#3b82f6' }} />
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
              {task.project_name}
            </span>
          </div>
        )}

        <p className="text-gray-500 text-[10px] line-clamp-2 mb-4 leading-relaxed font-medium">
          {task.description || 'Sem descrição detalhada'}
        </p>

        <div className="mt-auto pt-3 border-t border-dashed border-gray-100">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-black text-gray-400 uppercase">Progresso</span>
            <span className="text-[10px] font-black text-blue-600">{task.progress}%</span>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={task.progress} className="h-1.5 flex-1 bg-gray-100" />
            <Button 
              size="icon" 
              variant="secondary"
              className={cn(
                "h-8 w-8 rounded-xl shrink-0 shadow-sm",
                task.status === 'pendente' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"
              )}
              onClick={() => task.status === 'pendente' && handleStartTask(task.id)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProjectBriefCard = ({ project, role }: { project: any, role: string }) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'concluido').length;
    const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

    return (
      <Card className="min-w-[200px] bg-white border-blue-50 shadow-sm border-l-4 overflow-hidden" style={{ borderLeftColor: project.color || '#3b82f6' }}>
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-start">
            <h5 className="font-bold text-xs text-gray-800 line-clamp-1">{project.name}</h5>
            <Badge variant="secondary" className="text-[9px] h-4">{role === 'manager' ? 'Gestor' : 'Membro'}</Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
              <span>Suas Tarefas</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const RoutineProjectCard = ({ project, projectTasks, title, description, isLegacy = false }: { 
    project: any, 
    projectTasks: CollaboratorTask[], 
    title: string, 
    description: string,
    isLegacy?: boolean
  }) => {
    const completedCount = projectTasks.filter(t => t.status === 'concluido').length;
    const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

    return (
      <div className={cn(
        "bg-white border-2 rounded-2xl p-4 shadow-sm group transition-all",
        isLegacy ? "border-orange-100 bg-orange-50/10" : "border-blue-50"
      )}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight">{title}</h4>
              {progress === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />}
            </div>
            <p className="text-gray-500 text-[11px] mt-0.5">{description}</p>
          </div>
          <Badge className={cn(
            "text-[10px]",
            progress === 100 ? "bg-emerald-500" : isLegacy ? "bg-orange-500" : "bg-blue-600"
          )}>{progress === 100 ? 'CONCLUÍDO' : `${progress}%`}</Badge>
        </div>

        <div className="space-y-3">
          {projectTasks.length > 0 ? (
            projectTasks.map(task => (
              <div 
                key={task.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer group active:scale-[0.98]"
                onClick={() => updateTaskStatus(task.id, task.status === 'concluido' ? 'pendente' : 'concluido')}
              >
                <div className="pointer-events-none">
                  <Checkbox 
                    id={`task-${task.id}`} 
                    checked={task.status === 'concluido'} 
                    className={cn(
                      "h-5 w-5 rounded-md border-gray-300",
                      isLegacy ? "text-orange-500" : "text-blue-600"
                    )} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm font-bold block truncate transition-all",
                      task.status === 'concluido' ? 'text-gray-300 line-through' : 'text-gray-700'
                    )}>
                      {task.title}
                    </span>
                    {isLegacy && <p className="text-[9px] text-orange-400 font-bold uppercase">Item da Rotina</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-xs text-gray-400 italic">Nenhuma tarefa vinculada.</p>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
           <Progress value={progress} className={cn("h-1.5 flex-1", progress === 100 ? "bg-emerald-50" : "bg-gray-50")} />
           {progress < 100 && (
             <Button 
               variant="ghost" 
               size="sm" 
               className={cn(
                 "h-6 text-[10px] font-bold px-2",
                 isLegacy ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
               )}
               onClick={(e) => {
                 e.stopPropagation();
                 projectTasks.forEach(t => {
                   if (t.status !== 'concluido') updateTaskStatus(t.id, 'concluido');
                 });
               }}
             >
               CONCLUIR TUDO
             </Button>
           )}
        </div>
      </div>
    );
  };

  const today = new Date();
  const formattedDate = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-500">Carregando suas tarefas...</p>
        </div>
      </div>
    );
  }

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
              <p className="text-blue-100 text-sm">Olá, {employeeName?.split(' ')[0] || 'Colaborador'}!</p>
              <p className="text-xs text-blue-200 capitalize">{formattedDate}</p>
            </div>
          </div>

          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full border border-blue-800"></span>
          </Button>
        </div>

        <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-2xl flex items-center justify-between relative z-10 shadow-inner">
          {!skipTimeTracking ? (
            <>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
                   <Clock className="w-5 h-5 text-blue-100" />
                </div>
                <div>
                  <p className="text-blue-100 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">
                    {workStatus === "working" ? "Andamento" : "Offline"}
                  </p>
                  <span className="text-2xl font-mono font-black tracking-tight flex items-center gap-1">
                    {workStatus === "working" ? formatTime(elapsedTime) : "INATIVO"}
                  </span>
                </div>
              </div>
              <Button
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-2xl shadow-xl border-2 border-white/20 transition-all active:scale-90",
                  workStatus === "working" ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                )}
                onClick={handleClockAction}
              >
                {workStatus === "working" ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                   Próximo Objetivo
                </p>
                <h4 className="text-base font-black line-clamp-1 tracking-tight">
                  {sortedAssignedTasks[0]?.title || "Tudo sob controle"}
                </h4>
              </div>
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 shadow-lg shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* Horizontal Navigation Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 sticky top-0 bg-gray-50/80 backdrop-blur-md py-4 z-40 border-b border-gray-100">
          {[
            { id: 'all', label: 'Tudo', icon: ClipboardList },
            { id: 'rotinas', label: 'Rotinas', icon: Clock },
            { id: 'tarefas', label: 'Tarefas', icon: AlertTriangle },
            { id: 'concluidas', label: 'Feito', icon: CheckCircle2 }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveTab(chip.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
                activeTab === chip.id 
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "bg-white border-gray-100 text-gray-400 hover:border-blue-200"
              )}
            >
              <chip.icon className={cn("w-3.5 h-3.5", activeTab === chip.id ? "text-white" : "text-gray-300")} />
              {chip.label}
            </button>
          ))}
        </div>

        {/* Daily Routines Section */}
        {(activeTab === 'all' || activeTab === 'rotinas') && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                Projetos Diários
              </h3>
              {(routineProjects.length > 0 || standaloneRoutineTasks.length > 0) && (
                <Badge variant="secondary" className="rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black border-none px-2 py-0.5">
                  {routineProjects.length + (standaloneRoutineTasks.length > 0 ? 1 : 0)}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {routineProjects.map(project => {
                const projectTasks = tasks.filter(t => t.project_id === project.id);
                return <RoutineProjectCard key={project.id} project={project} projectTasks={projectTasks} title={project.name} description={project.description || 'Rotina operacional'} />;
              })}

              {standaloneRoutineTasks.length > 0 && (
                <RoutineProjectCard 
                  project={{ id: 'legacy-routine', color: '#f59e0b' }} 
                  projectTasks={standaloneRoutineTasks} 
                  title="Sua Rotina Diária" 
                  description="Itens recorrentes pendentes para hoje"
                  isLegacy={true}
                />
              )}

              {routineProjects.length === 0 && standaloneRoutineTasks.length === 0 && (
                <div className="p-8 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-[10px] font-black tracking-widest uppercase">
                  Sem rotinas pendentes
                </div>
              )}
            </div>
          </section>
        )}

        {/* Extra Tasks Section */}
        {(activeTab === 'all' || activeTab === 'tarefas') && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Tarefas Extras
              </h3>
              {sortedAssignedTasks.length > 0 && (
                <Badge variant="secondary" className="rounded-lg bg-orange-50 text-orange-700 text-[10px] font-black border-none px-2 py-0.5">
                  {sortedAssignedTasks.length}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sortedAssignedTasks.length > 0 ? (
                sortedAssignedTasks.map((task) => (
                  <SmallTaskCard key={task.id} task={task} />
                ))
              ) : (
                <div className="col-span-2 p-8 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-[10px] font-black tracking-widest uppercase italic">
                   Limpo! Nenhuma tarefa extra.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Completed Tab Specific Content */}
        {activeTab === 'concluidas' && (
          <section className="animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-3xl p-8 text-center mb-6">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                   <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-emerald-900 font-black uppercase tracking-tighter text-xl">Dever Cumprido!</h4>
                <p className="text-emerald-600 text-xs font-bold mt-1">Veja seus últimos resultados de hoje.</p>
             </div>
             <div className="space-y-2">
                {tasks.filter(t => t.status === 'concluido').slice(0, 10).map(task => (
                   <div key={task.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 opacity-70 grayscale-[0.5]">
                      <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                         <p className="text-xs font-black text-gray-700 line-through tracking-tight">{task.title}</p>
                         <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Finalizado</p>
                      </div>
                   </div>
                ))}
                {tasks.filter(t => t.status === 'concluido').length === 0 && (
                   <p className="text-center py-12 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Nenhum item finalizado hoje.</p>
                )}
             </div>
          </section>
        )}
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
