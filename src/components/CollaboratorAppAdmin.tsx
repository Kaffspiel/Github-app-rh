import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, MessageSquare, Clock, Play, Pause, ChevronRight, Bell, ClipboardList, AlertTriangle, Loader2, Phone, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { useEmployeesList } from "@/hooks/useEmployeesList";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  progress: number;
  is_daily_routine: boolean;
  created_at: string;
  checklist: { id: string; text: string; completed: boolean }[];
}

export function CollaboratorAppAdmin() {
  const { companyId } = useCompany();
  const { employees, isLoading: employeesLoading } = useEmployeesList();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; email: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callMessage, setCallMessage] = useState("");
  const [isCalling, setIsCalling] = useState(false);

  // Fetch tasks when employee is selected
  useEffect(() => {
    if (!selectedEmployeeId) {
      setTasks([]);
      setSelectedEmployee(null);
      return;
    }

    const emp = employees.find(e => e.id === selectedEmployeeId);
    setSelectedEmployee(emp ? { id: emp.id, name: emp.name, email: emp.email } : null);

    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('assignee_id', selectedEmployeeId)
          .in('status', ['pendente', 'andamento']);

        if (tasksError) throw tasksError;

        if (tasksData && tasksData.length > 0) {
          const taskIds = tasksData.map(t => t.id);
          const { data: checklistData } = await supabase
            .from('task_checklist_items')
            .select('*')
            .in('task_id', taskIds)
            .order('sort_order');

          const tasksWithChecklist = tasksData.map(task => ({
            ...task,
            checklist: (checklistData || [])
              .filter(item => item.task_id === task.id)
              .map(item => ({ id: item.id, text: item.text, completed: item.completed }))
          }));

          setTasks(tasksWithChecklist);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [selectedEmployeeId, employees]);

  const handleCallEmployee = async () => {
    if (!selectedEmployee || !companyId) return;

    setIsCalling(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        company_id: companyId,
        recipient_id: selectedEmployee.id,
        type: 'announcement',
        title: '📞 Chamado do Gestor',
        message: callMessage || 'Você está sendo chamado pelo seu gestor. Por favor, entre em contato.',
        priority: 'high',
        channels: ['in_app', 'whatsapp'],
        status: 'pending'
      });

      if (error) throw error;

      toast.success(`${selectedEmployee.name} foi chamado com sucesso!`);
      setCallDialogOpen(false);
      setCallMessage("");
    } catch (err) {
      console.error('Error calling employee:', err);
      toast.error('Erro ao chamar colaborador');
    } finally {
      setIsCalling(false);
    }
  };

  const dailyRoutines = tasks.filter(t => t.is_daily_routine);
  const assignedTasks = tasks.filter(t => !t.is_daily_routine);

  const getPriorityWeight = (p: string) => {
    switch (p) { case 'alta': return 3; case 'média': return 2; case 'baixa': return 1; default: return 0; }
  };

  const sortedAssignedTasks = [...assignedTasks].sort((a, b) => {
    const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const today = new Date();
  const formattedDate = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const SmallTaskCard = ({ task }: { task: Task }) => (
    <Card className={`relative overflow-hidden border-0 shadow-md ${task.priority === 'alta' ? 'bg-orange-50/50' : 'bg-white'}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${task.priority === 'alta' ? 'bg-red-500' : task.priority === 'média' ? 'bg-orange-400' : 'bg-blue-400'}`} />
      <CardContent className="p-4 flex flex-col h-full justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-900 line-clamp-2 text-sm leading-tight pr-2">{task.title}</h4>
            <Badge variant="outline" className="text-[9px] px-1 h-4 uppercase font-bold shrink-0">{task.priority}</Badge>
          </div>
          <p className="text-gray-500 text-[11px] line-clamp-2 mb-3 leading-snug">{task.description || 'Sem descrição'}</p>
        </div>
        <div className="space-y-3 mt-auto">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
              <span>Progresso</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1.5 rounded-full bg-gray-100" />
          </div>
          <Badge className={`w-full justify-center ${task.status === 'pendente' ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"}`}>
            {task.status === 'pendente' ? "PENDENTE" : "EM ANDAMENTO"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header with Employee Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Visualização do App do Colaborador</h2>
          <p className="text-sm text-gray-500">Selecione um colaborador para ver o app dele e enviar chamados</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione um colaborador" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEmployee && (
            <Button 
              onClick={() => setCallDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="w-4 h-4 mr-2" />
              Chamar
            </Button>
          )}
        </div>
      </div>

      {/* Mobile App Preview */}
      {!selectedEmployeeId ? (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-center text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Selecione um colaborador</p>
            <p className="text-sm">para visualizar o app dele</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="max-w-md mx-auto border shadow-xl rounded-3xl overflow-hidden bg-white">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white rounded-b-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8" />

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full border-2 border-white/30 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Visualizando: {selectedEmployee?.name.split(' ')[0]}</p>
                  <p className="text-xs text-blue-200 capitalize">{formattedDate}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 relative">
                <Bell className="w-6 h-6" />
              </Button>
            </div>

            <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl flex items-center justify-between relative z-10">
              <div>
                <p className="text-blue-100 text-xs uppercase tracking-wider mb-1">Status do colaborador</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-300" />
                  <span className="text-xl font-mono font-semibold tracking-tight">--:--:--</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-400/50 flex items-center justify-center">
                <Pause className="fill-white text-white" />
              </div>
            </div>
          </div>

          <div className="p-5 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-xs font-medium">Rotinas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{dailyRoutines.length}</p>
                  <p className="text-xs text-green-600">pendentes hoje</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">Tarefas</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{sortedAssignedTasks.length}</p>
                  <p className="text-xs text-orange-600">atribuídas</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Routines Section */}
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
                    <div key={routine.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm leading-tight">{routine.title}</h4>
                          <p className="text-gray-500 text-[11px] mt-1">{routine.description || 'Sem descrição'}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">{routine.priority}</Badge>
                      </div>
                      <div className="space-y-2">
                        {routine.checklist.length > 0 ? (
                          routine.checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Checkbox id={`r-${item.id}`} checked={item.completed} disabled className="h-4 w-4" />
                              <label className={`text-xs ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'} font-medium`}>
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

            {/* Extra Tasks Section */}
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
                    Nenhuma tarefa extra atribuída.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Call Employee Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Chamar {selectedEmployee?.name}
            </DialogTitle>
            <DialogDescription>
              Envie um chamado para o colaborador. Ele receberá uma notificação no app e via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Mensagem do chamado (opcional)..."
              value={callMessage}
              onChange={(e) => setCallMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCallEmployee}
              disabled={isCalling}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCalling ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
