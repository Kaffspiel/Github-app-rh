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
import { Plus, Search, Filter, User, Calendar, ArrowUpDown, MessageSquare, CheckCircle2, Circle, Clock, AlertCircle, FileText, Pencil, Trash2, ClipboardList, ListTodo } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp, Task } from "@/context/AppContext";

export function TaskManagement() {
  const { tasks, addTask, currentUser, taskFilter, setTaskFilter } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState(taskFilter);
  const [filterCollaborator, setFilterCollaborator] = useState("todos");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("prioridade");

  useEffect(() => {
    setFilterStatus(taskFilter);
  }, [taskFilter]);

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setTaskFilter(value);
  };

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"alta" | "média" | "baixa">("média");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [isRoutineTask, setIsRoutineTask] = useState(false);
  const [selectedRole, setSelectedRole] = useState("caixa");

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

  const handleCreateTask = () => {
    if (!newTaskTitle) return;

    const newTask: Task = {
      id: Math.random().toString(),
      title: newTaskTitle,
      description: newTaskDescription,
      assignee: newTaskAssignee || currentUser,
      priority: (newTaskPriority as "alta" | "média" | "baixa") || "média",
      status: "pendente",
      dueDate: newTaskDue || new Date().toLocaleString("pt-BR"),
      createdDate: new Date().toLocaleDateString("pt-BR"),
      createdBy: currentUser,
      progress: 0,
      comments: 0,
      checklist: [],
      isDailyRoutine: isRoutineTask
    };

    addTask(newTask);
    setIsCreateDialogOpen(false);

    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskAssignee("");
    setNewTaskPriority("média");
    setNewTaskDue("");
    setIsRoutineTask(false);
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "pendente": return <Circle className="w-4 h-4" />;
      case "andamento": return <Clock className="w-4 h-4" />;
      case "atrasada": return <AlertCircle className="w-4 h-4" />;
      case "concluido": return <CheckCircle2 className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "pendente": return "bg-gray-100 text-gray-600 border-gray-200";
      case "andamento": return "bg-blue-100 text-blue-600 border-blue-200";
      case "atrasada": return "bg-red-100 text-red-600 border-red-200";
      case "concluido": return "bg-green-100 text-green-600 border-green-200";
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

  const filterTasks = (taskList: Task[], checkCollaborator = false) => {
    return taskList.filter(task => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.assignee.toLowerCase().includes(searchLower);

      const matchesStatus = filterStatus === "todas" || task.status === filterStatus;

      const matchesCollaborator = !checkCollaborator ||
        filterCollaborator === "todos" ||
        task.assignee.toLowerCase().includes(filterCollaborator) ||
        (filterCollaborator === "maria" && task.assignee.includes("Maria")) ||
        (filterCollaborator === "ana" && task.assignee.includes("Ana")) ||
        (filterCollaborator === "carlos" && task.assignee.includes("Carlos")) ||
        (filterCollaborator === "pedro" && task.assignee.includes("Pedro")) ||
        (filterCollaborator === "julia" && task.assignee.includes("Julia"));

      const matchesDate = !filterDate || (() => {
        if (!task.createdDate) return false;
        const [day, month, year] = task.createdDate.split('/');
        const taskFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return taskFormatted === filterDate;
      })();

      return matchesSearch && matchesStatus && matchesCollaborator && matchesDate;
    }).sort((a, b) => {
      if (sortBy === "prioridade") return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (sortBy === "progresso") return b.progress - a.progress;
      if (sortBy === "prazo") return a.dueDate.localeCompare(b.dueDate);
      return 0;
    });
  };

  const myTasks = tasks.filter(t => t.assignee === currentUser);
  const teamTasks = tasks.filter(t => t.assignee !== currentUser);

  const filteredMyTasks = filterTasks(myTasks);
  const filteredTeamTasks = filterTasks(teamTasks, true);

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`${getPriorityColor(task.priority)} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          </div>
          <Badge variant="outline" className={`${getStatusColor(task.status)} whitespace-nowrap`}>
            {getStatusIcon(task.status)}
            <span className="ml-1 capitalize">{task.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Progresso</span>
            <span className="font-medium">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600">
            Checklist ({task.checklist.filter((i) => i.completed).length}/{task.checklist.length})
          </p>
          {task.checklist.slice(0, 2).map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={item.completed} disabled />
              <span className={item.completed ? "line-through text-gray-400" : "text-gray-700"}>{item.text}</span>
            </div>
          ))}
          {task.checklist.length > 2 && (
            <p className="text-xs text-gray-400 ml-6">+{task.checklist.length - 2} itens</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{task.assignee}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{task.comments}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{task.dueDate}</span>
          </div>
        </div>

        <Button
          className="w-full"
          variant="outline"
          size="sm"
          onClick={() => setSelectedTask(task)}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
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
                        <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                        <SelectItem value="Ana Lima">Ana Lima</SelectItem>
                        <SelectItem value="Carlos Rocha">Carlos Rocha</SelectItem>
                        <SelectItem value="Pedro Costa">Pedro Costa</SelectItem>
                        <SelectItem value="Julia Mendes">Julia Mendes</SelectItem>
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
              <Button onClick={handleCreateTask}>Criar Tarefa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            {selectedTask && (
              <>
                <DialogHeader>
                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <DialogTitle className="text-xl flex items-center gap-2">
                        {selectedTask.title}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        Criado em {selectedTask.createdDate} por {selectedTask.createdBy}
                      </DialogDescription>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(selectedTask.status)}`}>
                      {getStatusIcon(selectedTask.status)}
                      <span className="ml-1 capitalize">{selectedTask.status}</span>
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Responsável: {selectedTask.assignee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Prazo: {selectedTask.dueDate}</span>
                    </div>
                    <Badge className={selectedTask.priority === 'alta' ? 'bg-red-500' : selectedTask.priority === 'média' ? 'bg-orange-500' : 'bg-blue-500'}>
                      Prioridade {selectedTask.priority}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Descrição</h4>
                    <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 border rounded-md">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Checklist de Execução</h4>
                      <span className="text-xs text-gray-500">{selectedTask.progress}% Concluído</span>
                    </div>
                    <Progress value={selectedTask.progress} className="h-2 mb-3" />
                    <div className="space-y-2">
                      {selectedTask.checklist.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 transition-colors">
                          <Checkbox id={`todo-${item.id}`} checked={item.completed} disabled />
                          <label
                            htmlFor={`todo-${item.id}`}
                            className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                          >
                            {item.text}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" /> Comentários ({selectedTask.comments})
                    </Button>
                    <Button size="sm">Atualizar Progresso</Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
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
                className="w-[160px]"
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
            <Select value={filterStatus} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="andamento">Em Andamento</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
                <SelectItem value="concluido">Concluída</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
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

      <Tabs defaultValue="minhas" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
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
          <TabsTrigger value="colaboradores">
            Colaboradores
          </TabsTrigger>
        </TabsList>

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
              {filteredMyTasks.filter(t => t.isDailyRoutine).length > 0 ? (
                filteredMyTasks.filter(t => t.isDailyRoutine).map((task) => (
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
              {filteredMyTasks.filter(t => !t.isDailyRoutine).length > 0 ? (
                filteredMyTasks.filter(t => !t.isDailyRoutine).map((task) => (
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

        <TabsContent value="equipe" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={filterCollaborator} onValueChange={setFilterCollaborator}>
              <SelectTrigger className="w-[250px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os colaboradores</SelectItem>
                <SelectItem value="maria">Maria Santos</SelectItem>
                <SelectItem value="ana">Ana Lima</SelectItem>
                <SelectItem value="carlos">Carlos Rocha</SelectItem>
                <SelectItem value="pedro">Pedro Costa</SelectItem>
                <SelectItem value="julia">Julia Mendes</SelectItem>
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
                Nenhuma tarefa encontrada com os filtros atuais.
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
            {Array.from(new Set(tasks.map(t => t.assignee).filter(a => a !== currentUser))).map((assignee) => {
              const userTasks = tasks.filter(t => t.assignee === assignee);
              const activeTask = userTasks.find(t => t.status === "andamento") ||
                userTasks.filter(t => t.status === "pendente" || t.status === "atrasada").sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority))[0];

              const completedCount = userTasks.filter(t => t.status === "concluido").length;
              const pendingCount = userTasks.filter(t => t.status !== "concluido").length;

              return (
                <Card key={assignee} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {assignee.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{assignee}</CardTitle>
                        <p className="text-xs text-gray-500">{userTasks.length} tarefas totais</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fazendo Agora</p>
                      {activeTask ? (
                        <>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-sm text-gray-900 line-clamp-1" title={activeTask.title}>{activeTask.title}</span>
                            <Badge variant="outline" className={`scale-90 ${getStatusColor(activeTask.status)}`}>
                              {activeTask.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Conclusão</span>
                              <span>{activeTask.progress}%</span>
                            </div>
                            <Progress value={activeTask.progress} className="h-2" />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhuma tarefa ativa no momento.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-green-50 p-2 rounded border border-green-100">
                        <p className="text-lg font-bold text-green-700">{completedCount}</p>
                        <p className="text-xs text-green-600">Concluídas</p>
                      </div>
                      <div className="bg-orange-50 p-2 rounded border border-orange-100">
                        <p className="text-lg font-bold text-orange-700">{pendingCount}</p>
                        <p className="text-xs text-orange-600">Pendentes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
