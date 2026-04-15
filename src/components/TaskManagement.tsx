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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Filter, User, Calendar, ArrowUpDown, MessageSquare, CheckCircle2, Circle, Clock, AlertCircle, FileText, Trash2, Loader2, XCircle, MinusCircle, Copy, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { useTasks, Task } from "@/hooks/useTasks";
import { useEmployeesList } from "@/hooks/useEmployeesList";
import { useProjects, Project } from "@/hooks/useProjects";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TaskComments } from "@/components/tasks/TaskComments";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export function TaskManagement() {
  const { tasks, isLoading, createTask, updateTask, deleteTask, toggleChecklistItem, addChecklistItem, fetchComments, addComment, createTasksBatch } = useTasks();
  const { employees } = useEmployeesList();
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const { notifyExtensionRequest, notifyTaskCancelled, logTaskProgress } = useTaskNotifications();
  const { user, currentRole } = useAuth();
  const { toast } = useToast();

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
  const [newTaskProject, setNewTaskProject] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDueDate, setNewProjectDueDate] = useState("");
  const [selectedProjectManagers, setSelectedProjectManagers] = useState<string[]>([]);
  const [selectedProjectParticipants, setSelectedProjectParticipants] = useState<string[]>([]);
  const [newProjectIsDaily, setNewProjectIsDaily] = useState(false);
  const [routineTasksInput, setRoutineTasksInput] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("minhas");
  const [filterProject, setFilterProject] = useState("todos");
  const [showComments, setShowComments] = useState(false);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState<string | undefined>(undefined);

  const currentEmployee = employees.find(e => e.email === user?.email);
  const { notify } = useNotifications();

  const extensionRequests = tasks.filter(t => t.extension_status === 'pending');

  const handleApproveExtension = async (task: Task) => {
    try {
      if (!task.suggested_due_date) {
        alert("Erro: Não há data sugerida para aprovação.");
        return;
      }

      await updateTask(task.id, { 
        extension_status: 'approved',
        due_date: task.suggested_due_date,
        suggested_due_date: null, // Limpa após aprovar
        extension_reason: null     // Limpa após aprovar
      });
      alert(`Prorrogação aprovada! Novo prazo: ${formatDueDate(task.suggested_due_date)}`);
    } catch (error) { console.error(error); }
  };

  const handleRejectExtension = async (task: Task) => {
    try {
      await updateTask(task.id, { extension_status: 'rejected' });
      alert("Prorrogação negada.");
    } catch (error) { console.error(error); }
  };
  
  const handleCancelTask = async (task: Task) => {
    const reason = prompt("Motivo do cancelamento:");
    if (reason === null) return;
    try {
      await updateTask(task.id, { status: 'cancelada' });
      alert("Tarefa cancelada.");
    } catch (error) { console.error(error); }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle || isCreating) return;
    setIsCreating(true);
    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        due_date: newTaskDue || undefined,
        assignee_id: newTaskAssignee || undefined,
        project_id: newTaskProject === "none" ? undefined : newTaskProject,
      });
      setIsCreateDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDue("");
    } finally { setIsCreating(false); }
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    setIsCreatingProject(true);
    try {
      const members = [
        ...selectedProjectManagers.map(id => ({ employee_id: id, role: 'manager' as const })),
        ...selectedProjectParticipants.map(id => ({ employee_id: id, role: 'participant' as const }))
      ];
      const project = await createProject({ 
        name: newProjectName, 
        description: newProjectDescription,
        due_date: newProjectDueDate || undefined,
        is_daily_routine: newProjectIsDaily,
        members
      });

      if (project && newProjectIsDaily && routineTasksInput.trim()) {
        const taskTitles = routineTasksInput.split('\n').map(t => t.trim()).filter(t => t);
        if (taskTitles.length > 0) {
          // Atribuir as tarefas de rotina ao primeiro gestor selecionado ou ao próprio criador
          const primaryAssigneeId = selectedProjectManagers[0] || currentEmployee?.id;
          
          const batchTasks = taskTitles.map(title => ({
            title,
            project_id: project.id,
            assignee_id: primaryAssigneeId,
            is_daily_routine: true,
            priority: 'média' as const,
          }));
          await createTasksBatch(batchTasks);
        }
      }

      setIsProjectDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectDueDate("");
      setNewProjectIsDaily(false);
      setRoutineTasksInput("");
      setSelectedProjectManagers([]);
      setSelectedProjectParticipants([]);
    } finally { setIsCreatingProject(false); }
  };
  
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectDescription(project.description || "");
    setNewProjectDueDate(project.due_date || "");
    setNewProjectIsDaily(project.is_daily_routine || false);
    
    // Set members
    const managers = (project.project_members || [])
      .filter(m => m.role === 'manager')
      .map(m => m.employee_id);
    const participants = (project.project_members || [])
      .filter(m => m.role === 'participant')
      .map(m => m.employee_id);
      
    setSelectedProjectManagers(managers);
    setSelectedProjectParticipants(participants);
    setIsEditProjectDialogOpen(true);
  };
  
  const handleUpdateProject = async () => {
    if (!editingProject) return;
    
    if (!newProjectName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do projeto não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProject(true);
    try {
      const members = [
        ...selectedProjectManagers.map(id => ({ employee_id: id, role: 'manager' as const })),
        ...selectedProjectParticipants.map(id => ({ employee_id: id, role: 'participant' as const }))
      ];
      
      const success = await updateProject(editingProject.id, {
        name: newProjectName,
        description: newProjectDescription,
        due_date: newProjectDueDate || undefined,
        is_daily_routine: newProjectIsDaily,
        members
      });
      
      if (success) {
        setIsEditProjectDialogOpen(false);
        setEditingProject(null);
        setNewProjectName("");
        setNewProjectDescription("");
        setNewProjectDueDate("");
        setNewProjectIsDaily(false);
        setSelectedProjectManagers([]);
        setSelectedProjectParticipants([]);
      }
    } catch (err) {
      console.error("Erro detalhado ao atualizar projeto:", err);
      toast({
        title: "Erro técnico ao atualizar",
        description: (err as any)?.message || "Ocorreu um problema inesperado ao salvar as alterações.",
        variant: "destructive"
      });
    } finally { setIsUpdatingProject(false); }
  };

  const handleMigrateLegacyRoutines = async () => {
    const legacyRoutines = tasks.filter(t => t.is_daily_routine && !t.project_id);
    if (legacyRoutines.length === 0) return;

    setIsMigrating(true);
    try {
      // Group by assignee
      const routinesByAssignee: Record<string, Task[]> = {};
      legacyRoutines.forEach(t => {
        const key = t.assignee_id || 'unassigned';
        if (!routinesByAssignee[key]) routinesByAssignee[key] = [];
        routinesByAssignee[key].push(t);
      });

      for (const [assigneeId, routines] of Object.entries(routinesByAssignee)) {
        const employee = employees.find(e => e.id === assigneeId);
        const projectName = `Rotina Diária - ${employee?.name || 'Geral'}`;
        
        const project = await createProject({
          name: projectName,
          description: "Projeto de rotina auto-migrado",
          is_daily_routine: true,
          members: assigneeId !== 'unassigned' ? [{ employee_id: assigneeId, role: 'manager' }] : []
        });

        if (project) {
          const batchTasks = routines.map(r => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
            assignee_id: assigneeId !== 'unassigned' ? assigneeId : undefined,
            project_id: project.id,
            is_daily_routine: true
          }));
          await createTasksBatch(batchTasks);

          // Cleanup old tasks
          for (const r of routines) {
            await deleteTask(r.id);
          }
        }
      }
      toast({
        title: "Sucesso",
        description: "Todas as rotinas foram transformadas em projetos!",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Falha ao migrar rotinas.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleChecklistToggle = async (taskId: string, itemId: string, currentValue: boolean) => {
    await toggleChecklistItem(itemId, !currentValue);
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "pendente": return <Circle className="w-4 h-4" />;
      case "andamento": return <Clock className="w-4 h-4" />;
      case "atrasada": return <AlertCircle className="w-4 h-4" />;
      case "concluido": return <CheckCircle2 className="w-4 h-4" />;
      case "cancelada": return <XCircle className="w-4 h-4" />;
      case "não feito": return <MinusCircle className="w-4 h-4" />;
      case "waiting_approval": return <Clock className="w-4 h-4 text-orange-500" />;
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
      case "waiting_approval": return "bg-orange-100 text-orange-600 border-orange-200";
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

  const formatDueDate = (date: string | null) => {
    if (!date) return "Sem prazo";
    try { return format(new Date(date), "dd/MM/yyyy HH:mm"); } catch { return date; }
  };

  const filterTasks = (taskList: Task[], checkCollaborator = false) => {
    return taskList.filter(task => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = task.title.toLowerCase().includes(searchLower) || (task.description?.toLowerCase().includes(searchLower) ?? false) || (task.assignee_name?.toLowerCase().includes(searchLower) ?? false);
      const matchesStatus = filterStatus === "todas" || task.status === filterStatus;
      const matchesCollaborator = !checkCollaborator || filterCollaborator === "todos" || task.assignee_id === filterCollaborator;
      const matchesDate = !filterDate || (task.created_at?.split('T')[0] === filterDate);
      const matchesProject = filterProject === "todos" || task.project_id === filterProject;
      return matchesSearch && matchesStatus && matchesCollaborator && matchesDate && matchesProject;
    }).sort((a, b) => {
      if (sortBy === "prioridade") {
        const pWeight = { alta: 3, média: 2, baixa: 1 };
        return (pWeight[b.priority as keyof typeof pWeight] || 0) - (pWeight[a.priority as keyof typeof pWeight] || 0);
      }
      return 0;
    });
  };

  const SimplifiedDatePicker = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) => {
    const setQuickDate = (days: number) => {
      const d = setHours(setMinutes(addDays(new Date(), days), 0), 18);
      onChange(format(d, "yyyy-MM-dd'T'HH:mm"));
    };
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>{label}</Label>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setQuickDate(0)}>Hoje</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setQuickDate(1)}>Amanhã</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setQuickDate(7)}>+7d</Button>
          </div>
        </div>
        <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="h-10" />
      </div>
    );
  };

  const MultiSelector = ({ options, selected, onSelect, label }: { options: any[], selected: string[], onSelect: (ids: string[]) => void, label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start h-auto min-h-10 py-2 px-3">
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 && <span className="text-muted-foreground text-sm">Selecionar...</span>}
              {selected.map(id => <Badge key={id} variant="secondary" className="mr-1">{employees.find(e => e.id === id)?.name}</Badge>)}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>S/ resultados</CommandEmpty><CommandGroup>
            {employees.map(emp => (
              <CommandItem key={emp.id} onSelect={() => onSelect(selected.includes(emp.id) ? selected.filter(id => id !== emp.id) : [...selected, emp.id])}>
                <div className={cn("mr-2 h-4 w-4 border rounded-sm", selected.includes(emp.id) && "bg-primary")} /> {emp.name}
              </CommandItem>
            ))}
          </CommandGroup></CommandList></Command>
        </PopoverContent>
      </Popover>
    </div>
  );

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`${getPriorityColor(task.priority)} hover:shadow-md transition-all duration-300 h-[420px] flex flex-col`}>
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{task.title}</CardTitle>
              {task.project_name && <Badge variant="outline" className="text-[10px] h-5" style={{ borderColor: task.project_color || '#3b82f6', color: task.project_color || '#3b82f6' }}>{task.project_name}</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description || "Sem descrição"}</p>
          </div>
          <Badge variant="outline" className={`${getStatusColor(task.status)} whitespace-nowrap shrink-0`}>{getStatusIcon(task.status)}<span className="ml-1 capitalize">{task.status}</span></Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col flex-1 min-h-0">
        <div className="shrink-0"><div className="flex justify-between text-sm mb-1"><span>Progresso</span><span>{task.progress}%</span></div><Progress value={task.progress} className="h-2" /></div>
        <div className="flex-1 min-h-0 overflow-y-auto mt-1 space-y-1">
          <p className="text-xs font-medium text-gray-600 mb-1">Checklist ({task.checklist.filter(i => i.completed).length}/{task.checklist.length})</p>
          {task.checklist.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm"><Checkbox checked={item.completed} onCheckedChange={() => handleChecklistToggle(task.id, item.id, item.completed)} /><span className={item.completed ? "line-through text-gray-400" : "text-gray-700"}>{item.text}</span></div>
          ))}
          {task.checklist.length > 3 && <p className="text-xs text-gray-400 ml-6">+{task.checklist.length - 3} itens</p>}
        </div>
        <div className="flex justify-between pt-2 border-t mt-auto shrink-0 text-sm text-gray-600">
          <div className="flex items-center gap-1"><User className="w-4 h-4" />{task.assignee_name || "N/A"}</div>
          <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDueDate(task.due_date)}</div>
        </div>
        <Button className="w-full shrink-0" variant="outline" size="sm" onClick={() => setSelectedTask(task)}>Ver Detalhes</Button>
      </CardContent>
    </Card>
  );

  const ProjectCard = ({ project }: { project: Project }) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => t.status === 'concluido').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return (
      <Card className="hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: project.color || '#3b82f6' }}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{totalTasks} tarefas</Badge>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{project.description || "Sem descrição definida."}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span>Progresso Geral</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Prazo: {formatDueDate(project.due_date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {project.project_members?.slice(0, 5).map(m => (
              <div key={m.id} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold" title={employees.find(e => e.id === m.employee_id)?.name}>
                {employees.find(e => e.id === m.employee_id)?.name?.charAt(0)}
              </div>
            ))}
            {(project.project_members?.length || 0) > 5 && (
              <span className="text-[10px] text-gray-400">+{project.project_members!.length - 5}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 text-xs h-8" 
              variant="outline"
              onClick={() => {
                setFilterProject(project.id);
                setActiveTab("equipe");
                setFilterStatus("todas");
                setFilterCollaborator("todos");
                setSearchQuery("");
              }}
            >
              Ver Tarefas
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditProject(project)}>
              <Pencil className="w-4 h-4 text-gray-500" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deleteProject(project.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filteredMyTasks = filterTasks(tasks.filter(t => t.assignee_id === currentEmployee?.id && t.status !== 'concluido'));
  const filteredTeamTasks = filterTasks(tasks.filter(t => t.assignee_id !== currentEmployee?.id && t.status !== 'concluido'), true);
  const filteredCompletedTasks = filterTasks(tasks.filter(t => t.status === 'concluido'), true);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Gestão de Tarefas</h1><p className="text-gray-500 mt-1">Gerencie projetos e atividades da equipe</p></div>
        <div className="flex gap-2">
          <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 mr-2" />Novo Projeto</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar Novo Projeto</DialogTitle><DialogDescription>Defina os detalhes, prazos e equipe do projeto.</DialogDescription></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Nome do Projeto</Label><Input placeholder="Ex: Expansão Matriz" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="Objetivos..." value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} /></div>
                  <SimplifiedDatePicker label="Prazo Final (Projeto)" value={newProjectDueDate} onChange={setNewProjectDueDate} />
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="is-routine" checked={newProjectIsDaily} onCheckedChange={setNewProjectIsDaily} />
                    <Label htmlFor="is-routine">Este projeto é uma Rotina Diária</Label>
                  </div>
                  {newProjectIsDaily && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                      <Label className="text-blue-600 font-bold">Tarefas da Rotina (Colar lista)</Label>
                      <Textarea 
                        placeholder="Um item por linha...
Ex: Limpar balcão
Verificar estoque
Abrir caixa" 
                        value={routineTasksInput} 
                        onChange={(e) => setRoutineTasksInput(e.target.value)}
                        className="h-32 font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <MultiSelector label="Responsáveis (Managers)" options={employees} selected={selectedProjectManagers} onSelect={setSelectedProjectManagers} />
                  <MultiSelector label="Participantes" options={employees} selected={selectedProjectParticipants} onSelect={setSelectedProjectParticipants} />
                </div>
              </div>
              <DialogFooter><Button onClick={handleCreateProject} disabled={isCreatingProject}>{isCreatingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Projeto</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nova Tarefa</Button></DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar Nova Tarefa</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Título</Label><Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="..." /></div>
                  <div className="space-y-2"><Label>Descrição</Label><Textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="..." /></div>
                  <div className="space-y-2"><Label>Projeto</Label>
                    <Select value={newTaskProject} onValueChange={setNewTaskProject}>
                      <SelectTrigger><SelectValue placeholder="Vincular..." /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Responsável</Label>
                    <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                      <SelectTrigger><SelectValue placeholder="Atribuir a..." /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Prioridade</Label>
                      <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="média">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <SimplifiedDatePicker label="Prazo" value={newTaskDue} onChange={setNewTaskDue} />
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleCreateTask} disabled={isCreating}>{isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Tarefa</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2"><Label>Pesquisar</Label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input placeholder="Título ou colaborador..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></div>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todos os status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="andamento">Em Andamento</SelectItem><SelectItem value="atrasada">Atrasada</SelectItem><SelectItem value="concluido">Concluída</SelectItem></SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-[180px]"><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="prioridade">Prioridade</SelectItem><SelectItem value="prazo">Prazo</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start border-b h-auto p-0 pb-px bg-transparent rounded-none gap-6 overflow-x-auto">
          <TabsTrigger value="minhas" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Minhas ({filteredMyTasks.length})</TabsTrigger>
          <TabsTrigger value="equipe" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Equipe</TabsTrigger>
          <TabsTrigger value="projetos" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Projetos ({projects.length})</TabsTrigger>
          <TabsTrigger value="calendario" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Calendário</TabsTrigger>
          <TabsTrigger value="concluidas" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2">Concluídas</TabsTrigger>
          {extensionRequests.length > 0 && <TabsTrigger value="solicitacoes" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 px-0 pb-2 text-orange-600">Solicitações ({extensionRequests.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="minhas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredMyTasks.length > 0 ? filteredMyTasks.map(t => <TaskCard key={t.id} task={t} />) : <div className="col-span-full py-12 text-center text-gray-400">Nenhuma tarefa encontrada.</div>}</TabsContent>
        <TabsContent value="equipe" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterProject !== "todos" && (
            <div className="col-span-full mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600">{projects.find(p => p.id === filterProject)?.name}</Badge>
                <span className="text-sm text-blue-700">Filtrando tarefas deste projeto</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={() => setFilterProject("todos")}>Limpar Filtro</Button>
            </div>
          )}
          {filteredTeamTasks.length > 0 ? filteredTeamTasks.map(t => <TaskCard key={t.id} task={t} />) : <div className="col-span-full py-12 text-center text-gray-400">Nenhuma tarefa encontrada.</div>}
        </TabsContent>
        <TabsContent value="projetos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.filter(t => t.is_daily_routine && !t.project_id).length > 0 && (
            <Card className="col-span-full border-blue-200 bg-blue-50/50 shadow-sm">
              <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg"><Clock className="w-6 h-6" /></div>
                  <div>
                    <h4 className="font-bold text-blue-900">Transformação de Rotinas</h4>
                    <p className="text-sm text-blue-700">Existem itens no modelo antigo que precisam ser transformados em Projetos.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleMigrateLegacyRoutines} 
                  disabled={isMigrating} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-6 rounded-xl shadow-blue-200 shadow-xl transition-all active:scale-95"
                >
                  {isMigrating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  MIGRAR AGORA
                </Button>
              </CardContent>
            </Card>
          )}
          {projects.length > 0 ? projects.map(p => <ProjectCard key={p.id} project={p} />) : <div className="col-span-full py-12 text-center text-gray-400">Nenhum projeto cadastrado.</div>}
        </TabsContent>
        <TabsContent value="calendario"><TaskCalendar tasks={tasks} onTaskClick={setSelectedTask} /></TabsContent>
        <TabsContent value="concluidas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredCompletedTasks.map(t => <TaskCard key={t.id} task={t} />)}</TabsContent>
        
        <TabsContent value="solicitacoes" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {extensionRequests.map(t => (
            <Card key={t.id} className="border-l-4 border-l-orange-500 overflow-hidden shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex justify-between items-start">
                  <span>{t.title}</span>
                  <Badge variant="outline" className="text-[10px] text-orange-600 bg-orange-50 border-orange-100 uppercase font-black">Pendente</Badge>
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                    {t.assignee_name?.[0] || "?"}
                  </div>
                  <p className="text-xs font-bold text-slate-600">{t.assignee_name}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span>Prazo Atual</span>
                    <span>Novo Sugerido</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-xs">
                    <span className="text-slate-400 line-through">{formatDueDate(t.due_date)}</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{formatDueDate(t.suggested_due_date)}</span>
                  </div>
                </div>
                
                {t.extension_reason && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Motivo:</span>
                    <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-2">{t.extension_reason}</p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 rounded-xl"
                    onClick={() => handleApproveExtension(t)}
                  >
                    Aprovar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-2 border-slate-100 text-slate-500 font-bold h-10 rounded-xl hover:bg-slate-50"
                    onClick={() => handleRejectExtension(t)}
                  >
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader><div className="flex justify-between items-center pr-10"><DialogTitle className="text-xl">{selectedTask.title}</DialogTitle><Badge variant="outline" className={getStatusColor(selectedTask.status)}>{selectedTask.status}</Badge></div></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg border text-sm"><span>Responsável: {selectedTask.assignee_name || "N/A"}</span><span>Prazo: {formatDueDate(selectedTask.due_date)}</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-blue-700">Projeto</Label>
                    <Select value={selectedTask.project_id || "none"} onValueChange={(val) => updateTask(selectedTask.id, { project_id: val === "none" ? null : val })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-blue-700">Status da Tarefa</Label>
                    <Select value={selectedTask.status} onValueChange={(val) => updateTask(selectedTask.id, { status: val as any })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecionar status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="atrasada">Atrasada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                        <SelectItem value="não feito">Não Feito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label className="font-semibold">Descrição</Label><div className="p-3 bg-slate-50 border rounded text-sm">{selectedTask.description || "Sem descrição."}</div></div>
                <div className="space-y-3"><div className="flex justify-between items-center"><Label className="font-semibold">Checklist</Label><Badge variant="secondary">{selectedTask.progress}%</Badge></div>
                  <div className="space-y-1">{selectedTask.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded transition-colors">
                      <Checkbox checked={item.completed} onCheckedChange={() => handleChecklistToggle(selectedTask.id, item.id, item.completed)} />
                      <span className={cn("text-sm flex-1", item.completed && "line-through text-muted-foreground")}>{item.text}</span>
                    </div>
                  ))}</div>
                </div>
                <div className="flex gap-2">
                  {selectedTask.status === 'pendente' && <Button className="flex-1 bg-blue-600" onClick={() => updateTask(selectedTask.id, { status: 'andamento' })}>Iniciar</Button>}
                  {selectedTask.status === 'andamento' && <Button className="flex-1 bg-green-600" onClick={() => updateTask(selectedTask.id, { status: 'concluido' })}>Concluir</Button>}
                  <Button variant="outline" className="text-red-600" onClick={() => handleCancelTask(selectedTask)}><Trash2 className="w-4 h-4 mr-1" />Cancelar</Button>
                </div>
                {showComments && <div className="pt-4 border-t"><TaskComments taskId={selectedTask.id} fetchComments={fetchComments} addComment={addComment} /></div>}
                <Button variant="ghost" className="w-full" onClick={() => setShowComments(!showComments)}>{showComments ? "Ocultar Comentários" : "Ver Comentários"}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Edição de Projeto */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Projeto</DialogTitle><DialogDescription>Atualize os detalhes e equipe do projeto.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome do Projeto</Label><Input placeholder="..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="..." value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} /></div>
              <SimplifiedDatePicker label="Prazo Final (Projeto)" value={newProjectDueDate} onChange={setNewProjectDueDate} />
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="edit-is-routine" checked={newProjectIsDaily} onCheckedChange={setNewProjectIsDaily} />
                <Label htmlFor="edit-is-routine">Projeto de Rotina Diária</Label>
              </div>
            </div>
            <div className="space-y-4">
              <MultiSelector label="Responsáveis (Managers)" options={employees} selected={selectedProjectManagers} onSelect={setSelectedProjectManagers} />
              <MultiSelector label="Participantes" options={employees} selected={selectedProjectParticipants} onSelect={setSelectedProjectParticipants} />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateProject} 
              disabled={isUpdatingProject}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdatingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
