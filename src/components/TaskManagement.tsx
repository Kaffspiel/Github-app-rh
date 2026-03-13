import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Filter, User, Calendar, ArrowUpDown, MessageSquare, CheckCircle2, Circle, Clock, AlertCircle, FileText, Pencil, Trash2, ClipboardList, ListTodo, Loader2, Copy, XCircle, MinusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useTasks, Task } from "@/hooks/useTasks";
import { useEmployeesList } from "@/hooks/useEmployeesList";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { RoutineTemplatesTab } from "@/components/tasks/RoutineTemplatesTab";
import { TaskComments } from "@/components/tasks/TaskComments";
import { GoogleCalendarButton } from "@/components/GoogleCalendarButton";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";

export function TaskManagement() {
  const { tasks, isLoading, createTask, updateTask, deleteTask, toggleChecklistItem, addChecklistItem, fetchComments, addComment } = useTasks();
  const { employees } = useEmployeesList();
  const { user, currentRole } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterCollaborator, setFilterCollaborator] = useState("todos");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("prioridade");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"alta" | "média" | "baixa">("média");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [isRoutineTask, setIsRoutineTask] = useState(false);
  const [selectedRole, setSelectedRole] = useState("caixa");
  const [isCreating, setIsCreating] = useState(false);

  const [routines, setRoutines] = useState<any>({
    caixa: [
      { title: "Abertura de Caixa", description: "Realizar contagem inicial, verificar fundo de troco e ligar sistema.", priority: "alta" },
      { title: "Sangria Diária", description: "Retirar excesso de numerário e registrar no sistema.", priority: "alta" },
      { title: "Fechamento de Caixa", description: "Contagem final, impressão de relatórios e organização do posto.", priority: "alta" },
    ],
    estoque: [
      { title: "Recebimento de Mercadoria", description: "Conferir nota fiscal, verificar avarias e dar entrada no sistema.", priority: "alta" },
      { title: "Reposição de Gôndolas", description: "Verificar buracos, buscar produtos no depósito e organizar frente.", priority: "média" },
      { title: "Inventário Rotativo", description: "Contagem de um grupo específico de produtos para auditoria.", priority: "média" },
    ],
    gerencia: [
      { title: "Reunião Matinal", description: "Alinhamento de metas do dia com a equipe.", priority: "alta" },
      { title: "Análise de Quebras", description: "Verificar relatórios de perdas e avarias do dia anterior.", priority: "alta" },
    ],
  });

  const [isEditingRoutines, setIsEditingRoutines] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ title: "", description: "", priority: "média" });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("minhas");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState<string | undefined>(undefined);

  // Get current employee info
  const currentEmployee = employees.find(e => e.email === user?.email);
  const { notifyExtensionRequest } = useTaskNotifications();

  // Extension Request State
  const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
  const { notifications, markAsRead, notify } = useNotifications();

  // Filter extension requests directly from tasks (not notifications)
  const extensionRequests = tasks.filter(t => t.extension_status === 'pending');

  const handleApproveExtension = async (task: Task) => {
    try {
      // For now, approve with current due_date (gestor can edit later)
      await updateTask(task.id, {
        extension_status: 'approved'
      });

      // Notify the assignee
      if (task.assignee_id) {
        notify({
          type: 'task_comment',
          title: '✅ Prorrogação Aprovada',
          message: `Seu pedido de prorrogação para a tarefa "${task.title}" foi aprovado.`,
          recipientId: task.assignee_id,
          priority: 'normal',
          relatedEntity: { type: 'task', id: task.id }
        });
      }

      alert("Prorrogação aprovada com sucesso!");
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      alert("Erro ao aprovar prorrogação.");
    }
  };

  const handleRejectExtension = async (task: Task) => {
    try {
      await updateTask(task.id, {
        extension_status: 'rejected'
      });

      // Notify the assignee
      if (task.assignee_id) {
        notify({
          type: 'task_comment',
          title: '❌ Prorrogação Negada',
          message: `Seu pedido de prorrogação para a tarefa "${task.title}" foi negado. O prazo original permanece.`,
          recipientId: task.assignee_id,
          priority: 'high',
          relatedEntity: { type: 'task', id: task.id }
        });
      }

      alert("Prorrogação negada.");
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
    }
  };

  const handleRequestExtension = async () => {
    if (!selectedTask || !extensionDate || !extensionReason) return;

    if (!currentEmployee) {
      alert("Erro: Seu perfil de funcionário não foi carregado corretamente. Tente recarregar a página.");
      return;
    }

    setIsSubmittingExtension(true);
    try {
      await notifyExtensionRequest({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        employeeName: currentEmployee.name,
        companyId: selectedTask.company_id,
        newDate: format(new Date(extensionDate), "dd/MM/yyyy HH:mm"),
        reason: extensionReason
      });

      await updateTask(selectedTask.id, {
        extension_status: 'pending'
      });

      alert("Solicitação enviada ao gestor!");
      setIsExtensionDialogOpen(false);
      setExtensionDate("");
      setExtensionReason("");
    } catch (error) {
      console.error("Erro ao solicitar prorrogação:", error);
      alert("Erro ao enviar solicitação.");
    } finally {
      setIsSubmittingExtension(false);
      // Optimistic update for UI
      if (selectedTask) setSelectedTask({ ...selectedTask, extension_status: 'pending' });
    }
  };



  useEffect(() => {
    const saved = localStorage.getItem("dailyRoutines");
    if (saved) {
      setRoutines(JSON.parse(saved));
    }
  }, []);

  const saveRoutines = (newRoutines: any) => {
    setRoutines(newRoutines);
    localStorage.setItem("dailyRoutines", JSON.stringify(newRoutines));
  };

  const handleAddRoutine = () => {
    if (!newRoutine.title) return;
    const currentList = routines[selectedRole] || [];
    const updated = {
      ...routines,
      [selectedRole]: [...currentList, newRoutine],
    };
    saveRoutines(updated);
    setNewRoutine({ title: "", description: "", priority: "média" });
  };

  const handleDeleteRoutine = (index: number) => {
    const currentList = [...routines[selectedRole]];
    currentList.splice(index, 1);
    saveRoutines({ ...routines, [selectedRole]: currentList });
  };

  const handleRoutineSelect = (routine: any) => {
    setNewTaskTitle(routine.title);
    setNewTaskDescription(routine.description);
    if (routine.priority) setNewTaskPriority(routine.priority);
    setIsRoutineTask(true);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle) return;

    setIsCreating(true);
    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        due_date: newTaskDue || undefined,
        assignee_id: newTaskAssignee || undefined,
        is_daily_routine: isRoutineTask,
      });

      setIsCreateDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAssignee("");
      setNewTaskPriority("média");
      setNewTaskDue("");
      setIsRoutineTask(false);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "pendente": return <Circle className="w-4 h-4" />;
      case "andamento": return <Clock className="w-4 h-4" />;
      case "atrasada": return <AlertCircle className="w-4 h-4" />;
      case "concluido": return <CheckCircle2 className="w-4 h-4" />;
      case "cancelada": return <XCircle className="w-4 h-4" />;
      case "não feito": return <MinusCircle className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "pendente": return "bg-gray-100 text-gray-600 border-gray-200";
      case "andamento": return "bg-blue-100 text-blue-600 border-blue-200";
      case "atrasada": return "bg-red-100 text-red-600 border-red-200";
      case "concluido": return "bg-green-100 text-green-600 border-green-200";
      case "cancelada": return "bg-gray-100 text-gray-600 border-gray-200";
      case "não feito": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-gray-100";
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "alta": return "border-l-4 border-l-red-500";
      case "média": return "border-l-4 border-l-orange-500";
      case "baixa": return "border-l-4 border-l-blue-500";
      default: return "";
    }
  };

  const getPriorityWeight = (p: string) => {
    switch (p) { case 'alta': return 3; case 'média': return 2; case 'baixa': return 1; default: return 0; }
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return "Sem prazo";
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm");
    } catch {
      return date;
    }
  };

  const filterTasks = (taskList: Task[], checkCollaborator = false) => {
    return taskList.filter(task => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        (task.description?.toLowerCase().includes(searchLower) ?? false) ||
        (task.assignee_name?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = filterStatus === "todas" || task.status === filterStatus;

      const matchesCollaborator = !checkCollaborator ||
        filterCollaborator === "todos" ||
        task.assignee_id === filterCollaborator;

      const matchesDate = !filterDate || (() => {
        if (!task.created_at) return false;
        const taskDate = task.created_at.split('T')[0];
        return taskDate === filterDate;
      })();

      return matchesSearch && matchesStatus && matchesCollaborator && matchesDate;
    }).sort((a, b) => {
      if (sortBy === "prioridade") return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (sortBy === "progresso") return b.progress - a.progress;
      if (sortBy === "prazo") return (a.due_date || '').localeCompare(b.due_date || '');
      return 0;
    });
  };

  const myTasks = tasks.filter(t => t.assignee_id === currentEmployee?.id && t.status !== 'concluido');
  const teamTasks = tasks.filter(t => t.assignee_id !== currentEmployee?.id && t.status !== 'concluido');
  const completedTasks = tasks.filter(t => t.status === 'concluido');

  const filteredMyTasks = filterTasks(myTasks);
  const filteredTeamTasks = filterTasks(teamTasks, true);
  const filteredCompletedTasks = filterTasks(completedTasks, true);

  const handleChecklistToggle = async (taskId: string, itemId: string, currentValue: boolean) => {
    await toggleChecklistItem(itemId, !currentValue);
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`${getPriorityColor(task.priority)} hover:shadow-md transition-all duration-300 h-[420px] flex flex-col ${task._isNew ? 'animate-fade-in ring-2 ring-primary/40' : ''}`}>
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{task.title}</CardTitle>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description || "Sem descrição"}</p>
          </div>
          <Badge variant="outline" className={`${getStatusColor(task.status)} whitespace-nowrap shrink-0`}>
            {getStatusIcon(task.status)}
            <span className="ml-1 capitalize">{task.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col flex-1 min-h-0">
        <div className="shrink-0">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Progresso</span>
            <span className="font-medium">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-xs font-medium text-gray-600">
              Checklist ({task.checklist.filter((i) => i.completed).length}/{task.checklist.length})
            </p>
            {task.is_daily_routine && (
              <Badge variant="outline" className="text-[10px] h-5">Rotina</Badge>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto mt-1 space-y-1 pr-1">
            {task.checklist.length > 0 ? (
              (task.is_daily_routine ? task.checklist : task.checklist.slice(0, 2)).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleChecklistToggle(task.id, item.id, item.completed)}
                  />
                  <span className={item.completed ? "line-through text-gray-400" : "text-gray-700"}>{item.text}</span>
                </div>
              ))
            ) : (
              task.is_daily_routine && <p className="text-sm text-gray-400 italic">Checklist vazio</p>
            )}

            {!task.is_daily_routine && task.checklist.length > 2 && (
              <p className="text-xs text-gray-400 ml-6">+{task.checklist.length - 2} itens</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t shrink-0">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{task.assignee_name || "Não atribuído"}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{task.comments_count}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDueDate(task.due_date)}</span>
            {task.due_date && (
              <GoogleCalendarButton
                title={task.title}
                description={task.description || ""}
                dueDate={task.due_date}
                size="icon"
                showText={false}
                className="h-6 w-6 ml-1"
              />
            )}
          </div>
        </div>

        <Button
          className="w-full shrink-0"
          variant="outline"
          size="sm"
          onClick={() => setSelectedTask(task)}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Tarefas</h1>
          <p className="text-gray-500 mt-1">Gerencie suas tarefas e da sua equipe</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>Selecione uma rotina diária ou crie uma tarefa personalizada</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 overflow-y-auto px-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Título da Tarefa</Label>
                  <Input
                    id="task-title"
                    placeholder="Ex: Revisar relatório mensal"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-description">Descrição</Label>
                  <Textarea
                    id="task-description"
                    placeholder="Descreva os detalhes da tarefa..."
                    rows={4}
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-assignee">Responsável</Label>
                    <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                      <SelectTrigger id="task-assignee">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-priority">Prioridade</Label>
                    <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as any)}>
                      <SelectTrigger id="task-priority">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="média">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due">Data/Hora de Conclusão</Label>
                  <Input
                    id="task-due"
                    type="datetime-local"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-procedure">Anexar Procedimento/Guia</Label>
                  <div className="flex items-center gap-2">
                    <Input id="task-procedure" type="file" className="text-sm cursor-pointer" />
                    <Button variant="outline" size="icon" title="Visualizar Modelo">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Anexe um PDF ou documento com o passo-a-passo desta tarefa.
                  </p>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:pl-8 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Label className="text-lg font-semibold whitespace-nowrap">
                      {isEditingRoutines ? "Gerenciar Modelos" : "Modelos de Rotinas"}
                    </Label>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="caixa">Frente de Caixa</SelectItem>
                          <SelectItem value="estoque">Estoque/Logística</SelectItem>
                          <SelectItem value="gerencia">Gerência</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant={isEditingRoutines ? "default" : "outline"}
                        size="icon"
                        onClick={() => setIsEditingRoutines(!isEditingRoutines)}
                        title={isEditingRoutines ? "Sair da Edição" : "Gerenciar Rotinas"}
                      >
                        {isEditingRoutines ? <CheckCircle2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {isEditingRoutines ? (
                    <div className="space-y-4">
                      <Card className="bg-slate-50 border-dashed">
                        <CardContent className="p-4 space-y-3">
                          <h4 className="font-medium text-sm">Adicionar Nova Rotina</h4>
                          <Input
                            placeholder="Título da Rotina"
                            value={newRoutine.title}
                            onChange={(e) => setNewRoutine({ ...newRoutine, title: e.target.value })}
                          />
                          <Textarea
                            placeholder="Descrição / Passo-a-passo"
                            value={newRoutine.description}
                            onChange={(e) => setNewRoutine({ ...newRoutine, description: e.target.value })}
                          />
                          <div className="flex justify-between items-center">
                            <Select
                              value={newRoutine.priority}
                              onValueChange={(v) => setNewRoutine({ ...newRoutine, priority: v })}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="alta">Alta</SelectItem>
                                <SelectItem value="média">Média</SelectItem>
                                <SelectItem value="baixa">Baixa</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={handleAddRoutine}>
                              <Plus className="w-4 h-4 mr-2" /> Adicionar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {routines[selectedRole as keyof typeof routines]?.map((routine: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-white border rounded hover:bg-gray-50 group">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{routine.title}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteRoutine(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {routines[selectedRole as keyof typeof routines]?.map((routine: any, index: number) => (
                        <Card
                          key={index}
                          className="cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                          onClick={() => handleRoutineSelect(routine)}
                        >
                          <CardContent className="p-4 relative group">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-medium">{routine.title}</h4>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {routine.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {routine.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}

                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Dica:</strong> Selecione uma rotina para preencher a tarefa. Clique no lápis (✏️) acima para criar novos modelos.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTask} disabled={isCreating || !newTaskTitle}>
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Criar Tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedTask} onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
            setShowComments(false);
            setSelectedChecklistItemId(undefined);
          }
        }}>
          <DialogContent className="max-w-2xl">
            {selectedTask ? (
              <>
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pr-10 gap-2">
                    <div>
                      <DialogTitle className="text-xl flex items-center gap-2">
                        {selectedTask.title}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        Criado em {format(new Date(selectedTask.created_at), "dd/MM/yyyy")} por {selectedTask.created_by_name || "Sistema"}
                      </DialogDescription>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(selectedTask.status)} shrink-0 self-start sm:self-center`}>
                      {getStatusIcon(selectedTask.status)}
                      <span className="ml-1 capitalize">{selectedTask.status}</span>
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-lg border gap-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Responsável: {selectedTask.assignee_name || "Não atribuído"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Prazo: {formatDueDate(selectedTask.due_date)}</span>
                    </div>
                    <Badge className={selectedTask.priority === 'alta' ? 'bg-red-500' : selectedTask.priority === 'média' ? 'bg-orange-500' : 'bg-blue-500'}>
                      Prioridade {selectedTask.priority}
                    </Badge>
                  </div>

                  {selectedTask.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Descrição
                      </h4>
                      <div className="p-3 bg-white rounded border text-sm text-gray-600 min-h-[60px]">
                        {selectedTask.description}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ListTodo className="w-4 h-4" /> Checklist de Execução
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {selectedTask.progress}% Concluído
                      </Badge>
                    </div>
                    <Progress value={selectedTask.progress} className="h-2" />
                    <div className="space-y-1 mt-2 max-h-[200px] overflow-y-auto pr-2">
                      {selectedTask.checklist.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 transition-colors">
                          <Checkbox
                            id={`todo-${item.id}`}
                            checked={item.completed}
                            onCheckedChange={() => handleChecklistToggle(selectedTask.id, item.id, item.completed)}
                          />
                          <label
                            htmlFor={`todo-${item.id}`}
                            className={`text-sm flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                          >
                            {item.text}
                          </label>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-7 w-7 ${selectedChecklistItemId === item.id ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                            onClick={() => {
                                setSelectedChecklistItemId(selectedChecklistItemId === item.id ? undefined : item.id);
                                setShowComments(true);
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {selectedTask.checklist.length === 0 && (
                        <p className="text-sm text-gray-400 italic">Nenhum item no checklist</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-between pt-4 border-t items-center mt-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      {selectedTask.due_date && (
                        <GoogleCalendarButton
                          title={selectedTask.title}
                          description={selectedTask.description || ""}
                          dueDate={selectedTask.due_date}
                        />
                      )}

                      {/* Pedido de Prazo */}
                      {(selectedTask.status === 'atrasada' || selectedTask.status === 'pendente') &&
                        currentEmployee?.id === selectedTask.assignee_id && (
                          <Dialog open={isExtensionDialogOpen} onOpenChange={setIsExtensionDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="secondary" size="sm" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 h-9">
                                <Clock className="w-4 h-4 mr-2" />
                                <span className="hidden xs:inline">Pedir Prazo</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Solicitar Prorrogação de Prazo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="ext-date">Nova Data Sugerida</Label>
                                  <Input
                                    id="ext-date"
                                    type="datetime-local"
                                    value={extensionDate}
                                    onChange={(e) => setExtensionDate(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="ext-reason">Motivo</Label>
                                  <Textarea
                                    id="ext-reason"
                                    value={extensionReason}
                                    onChange={(e) => setExtensionReason(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleRequestExtension} disabled={!extensionDate || !extensionReason}>
                                  Enviar Pedido
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                      {/* Ações de Gestor/Admin */}
                      {(currentRole === 'gestor' || currentRole === 'admin') &&
                       selectedTask.status !== 'concluido' &&
                       selectedTask.status !== 'cancelada' &&
                       selectedTask.status !== 'não feito' && (
                        <div className="flex gap-1 border-l pl-2 border-slate-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-slate-700 h-9 px-2"
                            onClick={() => updateTask(selectedTask.id, { status: 'não feito' })}
                            title="Não Feito"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 h-9 px-2"
                            onClick={() => updateTask(selectedTask.id, { status: 'cancelada' })}
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <Button
                        variant={showComments && !selectedChecklistItemId ? "default" : "outline"}
                        size="sm"
                        className="gap-2 h-9"
                        onClick={() => {
                            setShowComments(!showComments || !!selectedChecklistItemId);
                            setSelectedChecklistItemId(undefined);
                        }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Comentários</span> ({selectedTask.comments_count})
                      </Button>

                      <Select
                        value={selectedTask.status}
                        onValueChange={async (value) => {
                          try {
                            await updateTask(selectedTask.id, { status: value as Task['status'] });
                            setSelectedTask({ ...selectedTask, status: value as Task['status'] });
                          } catch (error: any) {
                            console.error("Erro ao atualizar status:", error);
                            alert(`Erro ao atualizar: ${error.message || 'Erro desconhecido'}`);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="andamento">Andamento</SelectItem>
                          <SelectItem value="concluido">Concluída</SelectItem>
                          <SelectItem value="atrasada">Atrasada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                          <SelectItem value="não feito">Não Feito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {showComments && (
                    <div className="pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                      <TaskComments
                        taskId={selectedTask.id}
                        checklistItemId={selectedChecklistItemId}
                        fetchComments={fetchComments}
                        addComment={addComment}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="sr-only">
                <DialogTitle>Detalhes da Tarefa</DialogTitle>
                <DialogDescription>Visualizando detalhes</DialogDescription>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:flex-1 md:min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="flex-1 md:w-[160px]"
              />
              {filterDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterDate("")}
                  className="px-2 h-9 text-gray-500 hover:text-red-500"
                >
                  Limpar
                </Button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="andamento">Em Andamento</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
                <SelectItem value="concluido">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="não feito">Não Feito</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prioridade">Prioridade</SelectItem>
                <SelectItem value="prazo">Prazo</SelectItem>
                <SelectItem value="progresso">Progresso</SelectItem>
                <SelectItem value="criacao">Data de Criação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 gap-2 md:grid md:grid-cols-5 md:gap-0">
          <TabsTrigger value="minhas">
            Minhas Tarefas
            <Badge variant="secondary" className="ml-2">
              {filteredMyTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="equipe">
            Tarefas da Equipe
            <Badge variant="secondary" className="ml-2">
              {filteredTeamTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="calendario">
            Calendário
          </TabsTrigger>
          <TabsTrigger value="concluidas">
            Concluídas
            <Badge variant="secondary" className="ml-2">
              {filteredCompletedTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="colaboradores">
            Colaboradores
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Copy className="w-4 h-4 mr-1" />
            Templates
          </TabsTrigger>
          {(currentRole === 'admin' || currentRole === 'admin_master' || currentRole === 'gestor') && (
            <TabsTrigger value="solicitacoes" className="relative">
              <Clock className="w-4 h-4 mr-1" />
              Solicitações
              {extensionRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {extensionRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="solicitacoes" className="space-y-6">
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="w-1 h-12 bg-yellow-500 rounded" />
            <div>
              <p className="font-medium text-yellow-900">Solicitações de Prorrogação</p>
              <p className="text-sm text-yellow-700">
                Aprove ou rejeite os pedidos de mais prazo feitos pela equipe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extensionRequests.length > 0 ? (
              extensionRequests.map((task) => {
                const assignee = employees.find(e => e.id === task.assignee_id);
                return (
                  <Card key={task.id} className="border-l-4 border-l-yellow-400 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          Prorrogação
                        </Badge>
                        <span className="text-xs text-gray-500">{format(new Date(task.updated_at), "dd/MM HH:mm")}</span>
                      </div>
                      <CardTitle className="text-base mt-2">{assignee?.name || "Colaborador"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                        <p className="font-medium mb-1">Tarefa: {task.title}</p>
                        {task.due_date && <p>Prazo atual: {format(new Date(task.due_date), "dd/MM/yyyy HH:mm")}</p>}
                        <p>Prioridade: {task.priority}</p>
                        <p>Status: {task.status}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                          onClick={() => handleApproveExtension(task)}
                        >
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          size="sm"
                          onClick={() => handleRejectExtension(task)}
                        >
                          Rejeitar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma solicitação pendente.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="minhas" className="space-y-6">
          <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-1 h-12 bg-blue-500 rounded" />
            <div>
              <p className="font-medium text-blue-900">Ordenado por {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</p>
              <p className="text-sm text-blue-700">
                {sortBy === "prioridade" ? "Tarefas de alta prioridade aparecem primeiro" :
                  sortBy === "prazo" ? "Tarefas mais urgentes aparecem primeiro" :
                    sortBy === "progresso" ? "Tarefas mais avançadas aparecem primeiro" : "Mostrando todas as tarefas"}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center gap-2 pl-1">
              <ClipboardList className="w-5 h-5" /> Rotinas Diárias
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyTasks.filter(t => t.is_daily_routine).length > 0 ? (
                filteredMyTasks.filter(t => t.is_daily_routine).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-gray-400 italic bg-gray-50 rounded-lg border border-dashed">
                  Nenhuma rotina diária pendente.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2 pl-1">
              <ListTodo className="w-5 h-5" /> Tarefas Atribuídas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyTasks.filter(t => !t.is_daily_routine).length > 0 ? (
                filteredMyTasks.filter(t => !t.is_daily_routine).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-gray-500">
                  Nenhuma tarefa extra encontrada com os filtros atuais.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <TaskCalendar tasks={tasks} onTaskClick={setSelectedTask} />
        </TabsContent>

        <TabsContent value="equipe" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={filterCollaborator} onValueChange={setFilterCollaborator}>
              <SelectTrigger className="w-[250px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os colaboradores</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeamTasks.length > 0 ? (
              filteredTeamTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-gray-500">
                Yay! Nenhuma tarefa de equipe pendente.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="concluidas" className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg mb-4">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Histórico de tarefas finalizadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompletedTasks.length > 0 ? (
              filteredCompletedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-gray-500">
                Nenhuma tarefa concluída ainda.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="colaboradores" className="space-y-6">
          <div className="flex items-center gap-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="w-1 h-12 bg-purple-500 rounded" />
            <div>
              <p className="font-medium text-purple-900">Visão Geral da Equipe</p>
              <p className="text-sm text-purple-700">
                Veja o que cada colaborador está fazendo no momento e o progresso de suas atividades.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.filter(e => e.id !== currentEmployee?.id).map((employee) => {
              const userTasks = tasks.filter(t => t.assignee_id === employee.id);
              const activeTask = userTasks.find(t => t.status === "andamento") ||
                userTasks.filter(t => t.status === "pendente" || t.status === "atrasada").sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority))[0];

              const completedCount = userTasks.filter(t => t.status === "concluido").length;
              const pendingCount = userTasks.filter(t => t.status !== "concluido").length;

              return (
                <Card key={employee.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{employee.name}</CardTitle>
                        <p className="text-xs text-gray-500">{userTasks.length} tarefas totais</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fazendo Agora</p>
                      {activeTask ? (
                        <>
                          <p className="font-medium text-sm">{activeTask.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={activeTask.progress} className="h-1 flex-1" />
                            <span className="text-xs text-gray-500">{activeTask.progress}%</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhuma tarefa ativa</p>
                      )}
                    </div>

                    <div className="flex justify-around text-center">
                      <div>
                        <p className="text-lg font-bold text-green-600">{completedCount}</p>
                        <p className="text-xs text-gray-500">Concluídas</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-orange-600">{pendingCount}</p>
                        <p className="text-xs text-gray-500">Pendentes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {employees.filter(e => e.id !== currentEmployee?.id).length === 0 && (
              <div className="col-span-full py-8 text-center text-gray-500">
                Nenhum colaborador cadastrado na equipe.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <RoutineTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
