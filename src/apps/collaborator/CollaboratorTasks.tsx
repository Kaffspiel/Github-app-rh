import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertCircle,
    ClipboardList,
    Play,
    CheckCircle2,
    RefreshCw,
    Plus,
    Trash2,
    Clock,
    ArrowLeft,
    MessageSquare
} from "lucide-react";
import { useCollaboratorTasks } from "@/hooks/useCollaboratorTasks";
import { TaskComments } from "@/components/tasks/TaskComments";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { format } from "date-fns";
import { toast } from "sonner";
import { GoogleCalendarButton } from "@/components/GoogleCalendarButton";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";

interface NewTaskData {
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    isDailyRoutine: boolean;
    checklist: string[];
}

interface CollaboratorTasksProps {
    onBack?: () => void;
}

export default function CollaboratorTasks({ onBack }: CollaboratorTasksProps) {
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [newTaskData, setNewTaskData] = useState<NewTaskData>({
        title: '',
        description: '',
        priority: 'média',
        dueDate: '',
        isDailyRoutine: false,
        checklist: []
    });
    const [currentChecklistItem, setCurrentChecklistItem] = useState('');

    // Use the collaborator tasks hook
    const {
        tasks,
        isLoading: tasksLoading,
        toggleChecklistItem,
        updateTaskStatus,
        updateTaskProgress,
        createTask,
        updateTask,
        fetchComments,
        addComment,
        addChecklistItem,
        refetch: refetchTasks,
        projects,
        isUpdatingStatus
    } = useCollaboratorTasks();

    const { notifyExtensionRequest } = useTaskNotifications();
    const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
    const [selectedTaskForExtension, setSelectedTaskForExtension] = useState<any>(null);
    const [extensionDate, setExtensionDate] = useState("");
    const [extensionReason, setExtensionReason] = useState("");
    const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [selectedTaskForComments, setSelectedTaskForComments] = useState<any>(null);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any>(null);
    const [selectedChecklistItemId, setSelectedChecklistItemId] = useState<string | undefined>(undefined);
    const [filterProject, setFilterProject] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"status" | "project">("status");
    const [searchQuery, setSearchQuery] = useState("");
    const [isRequestingExtensionInComments, setIsRequestingExtensionInComments] = useState(false);

    const handleRequestExtension = async () => {
        if (!selectedTaskForExtension || !extensionDate || !extensionReason) return;

        setIsSubmittingExtension(true);
        try {
            // We need companyId and employeeName. useCollaboratorTasks provides employeeName, but maybe not companyId directly in the hook return? 
            // The hook tracks it internally. We might need to ask the hook to expose it or fetch it?
            // Actually, the hook exposes `employeeName`. For companyId, let's assume the task has it or we can pass it if we expost it.
            // Let's check useCollaboratorTasks.ts return. It returns `employeeName`. It doesn't return `companyId`.
            // However, the task object has `company_id`.

            await notifyExtensionRequest({
                taskId: selectedTaskForExtension.id,
                taskTitle: selectedTaskForExtension.title,
                employeeName: employeeName || "Colaborador",
                companyId: selectedTaskForExtension.company_id,
                newDate: format(new Date(extensionDate), "dd/MM/yyyy HH:mm"),
                reason: extensionReason
            });

            // Update local task status to pending AND save suggested data
            if (updateTask) {
                await updateTask(selectedTaskForExtension.id, { 
                    extension_status: 'pending',
                    suggested_due_date: new Date(extensionDate).toISOString(),
                    extension_reason: extensionReason
                });
            }

            toast.success("Solicitação enviada ao gestor!");
            setIsExtensionDialogOpen(false);
            setIsRequestingExtensionInComments(false);
            setExtensionDate("");
            setExtensionReason("");
            setSelectedTaskForExtension(null);
        } catch (error) {
            console.error("Erro ao solicitar prorrogação:", error);
            toast.error("Erro ao enviar solicitação.");
        } finally {
            setIsSubmittingExtension(false);
        }
    };

    const openExtensionDialog = (task: any) => {
        setSelectedTaskForExtension(task);
        setIsExtensionDialogOpen(true);
    };

    const openCommentsDialog = (task: any, itemId?: string) => {
        setSelectedTaskForComments(task);
        setSelectedChecklistItemId(itemId);
        setIsCommentsOpen(true);
    };

    const handleCreateTask = async () => {
        if (!newTaskData.title) {
            toast.error("O título é obrigatório");
            return;
        }

        const success = await createTask({
            title: newTaskData.title,
            description: newTaskData.description,
            priority: newTaskData.priority,
            dueDate: newTaskData.dueDate ? new Date(newTaskData.dueDate) : undefined,
            isDailyRoutine: newTaskData.isDailyRoutine,
            checklist: newTaskData.checklist
        });

        if (success) {
            setIsNewTaskOpen(false);
            setNewTaskData({
                title: '',
                description: '',
                priority: 'média',
                dueDate: '',
                isDailyRoutine: false,
                checklist: []
            });
            setCurrentChecklistItem('');
        }
    };

    const handleAddChecklistItem = () => {
        if (!currentChecklistItem.trim()) return;
        setNewTaskData(prev => ({
            ...prev,
            checklist: [...prev.checklist, currentChecklistItem.trim()]
        }));
        setCurrentChecklistItem('');
    };

    const handleRemoveChecklistItem = (index: number) => {
        setNewTaskData(prev => ({
            ...prev,
            checklist: prev.checklist.filter((_, i) => i !== index)
        }));
    };

    const handleStartTask = async (taskId: string) => {
        await updateTaskStatus(taskId, 'andamento');
    };

    const handleChecklistToggle = async (itemId: string, currentState: boolean) => {
        await toggleChecklistItem(itemId, !currentState);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'alta': return 'bg-rose-500';
            case 'média': return 'bg-amber-400';
            default: return 'bg-sky-400';
        }
    };

    // --- Filter and Group Logic ---
    // Only active tasks for the main dashboard tabs(excluding history)
    const activeTasks = tasks.filter(t => t.status !== 'concluido' && t.status !== 'cancelada');
    
    // Process search and project filtering on active tasks
    const filteredActiveTasks = activeTasks.filter(t => {
        const matchesProject = filterProject === "all" || t.project_id === filterProject;
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesProject && matchesSearch;
    });

    // Separated categories for display in active view
    const dailyRoutines = filteredActiveTasks.filter(t => t.is_daily_routine);
    const extraTasks = filteredActiveTasks.filter(t => !t.is_daily_routine);
    
    // Global lists for history tabs
    const completedTasks = tasks.filter(t => t.status === 'concluido');
    const cancelledTasks = tasks.filter(t => t.status === 'cancelada');

    // Project progress calculation
    const projectStats = projects.map(proj => {
        const projTasks = tasks.filter(t => t.project_id === proj.id);
        const activeProjTasks = projTasks.filter(t => t.status !== 'concluido' && t.status !== 'cancelada');
        const avgProgress = projTasks.length > 0 
            ? Math.round(projTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / projTasks.length)
            : 0;
            
        return {
            ...proj,
            avgProgress,
            activeCount: activeProjTasks.length
        };
    }).sort((a, b) => b.activeCount - a.activeCount); // Projects with more tasks first

    const unassignedTasks = activeTasks.filter(t => !t.project_id);
    const unassignedProgress = unassignedTasks.length > 0
        ? Math.round(unassignedTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / unassignedTasks.length)
        : 0;

    const TaskCardV2 = ({ task, isRoutine = false }: { task: any, isRoutine?: boolean }) => {
        const [newItemText, setNewItemText] = useState("");
        const [isAddingItem, setIsAddingItem] = useState(false);

        const handleAddItem = async () => {
            if (!newItemText.trim()) return;
            setIsAddingItem(true);
            const success = await addChecklistItem(task.id, newItemText.trim());
            if (success) setNewItemText("");
            setIsAddingItem(false);
        };

        return (
            <Card className={`overflow-hidden border-2 border-slate-50 rounded-[2rem] shadow-sm hover:shadow-md transition-all`}>
                {/* Priority Strip */}
                {!isRoutine && <div className={`h-1.5 ${getPriorityColor(task.priority)}`} />}
                
                <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                        {/* Quick Check Action */}
                        <div 
                            onClick={() => {
                                if (isUpdatingStatus) return;
                                if (task.status === 'atrasada') {
                                    toast.error("Tarefa atrasada! Peça uma prorrogação em 'TRATAR' antes de concluir.");
                                    return;
                                }
                                updateTaskStatus(task.id, task.status === 'concluido' ? 'pendente' : 'concluido');
                            }}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isUpdatingStatus || task.status === 'atrasada' ? 'opacity-50' : ''
                            } ${
                                task.status === 'concluido' 
                                ? 'bg-emerald-500 shadow-lg shadow-emerald-100 border-none' 
                                : task.status === 'atrasada'
                                ? 'bg-red-50 border-2 border-red-100'
                                : 'bg-slate-50 border-2 border-slate-100'
                            }`}
                        >
                            {isUpdatingStatus ? (
                                <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                            ) : task.status === 'concluido' ? (
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            ) : task.status === 'atrasada' ? (
                                <AlertCircle className="w-6 h-6 text-red-400" />
                            ) : (
                                <div className="w-6 h-6 rounded-md border-2 border-slate-200" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-[13px] font-black text-gray-800 leading-tight line-clamp-2 ${task.status === 'concluido' ? 'line-through opacity-50' : ''}`}>
                                    {task.title}
                                </h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                                    {task.project_name || (isRoutine ? 'ROTINA' : 'TAREFA')}
                                </span>
                                {task.status === 'atrasada' && (
                                    <Badge variant="destructive" className="text-[8px] h-4 py-0 font-black">ATRASADA</Badge>
                                )}
                                {task.extension_status === 'pending' && (
                                    <Badge variant="secondary" className="text-[8px] h-4 py-0 font-black bg-orange-100 text-orange-600 border-none">AGUARDANDO REAGENDAMENTO</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2 mb-4 px-1">
                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Progresso</span>
                            <span>{task.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${task.status === 'concluido' ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                style={{ width: `${task.progress}%` }} 
                            />
                        </div>
                    </div>

                    {/* CHECKLIST SECTION */}
                    <div className="space-y-3 mb-5 px-1 bg-slate-50/50 p-4 rounded-3xl border border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist</span>
                            <Badge variant="secondary" className="text-[8px] bg-white text-slate-400 border-none">
                                {task.checklist.filter((i: any) => i.completed).length}/{task.checklist.length}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            {task.checklist.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 group">
                                    <Checkbox 
                                        id={`item-${item.id}`} 
                                        checked={item.completed}
                                        onCheckedChange={(checked) => toggleChecklistItem(item.id, !!checked)}
                                        className="rounded-lg w-5 h-5 border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label 
                                        htmlFor={`item-${item.id}`}
                                        className={`text-[11px] font-semibold flex-1 cursor-pointer transition-colors ${
                                            item.completed ? 'text-slate-300 line-through' : 'text-slate-600'
                                        }`}
                                    >
                                        {item.text}
                                    </label>
                                </div>
                            ))}
                        </div>

                        {/* Quick Add Checklist Item */}
                        <div className="pt-2 flex gap-2">
                            <Input 
                                placeholder="Novo item..." 
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="h-9 rounded-xl bg-white border-slate-100 text-[11px] font-bold focus-visible:ring-blue-100"
                            />
                            <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-9 w-9 rounded-xl border-slate-100 text-blue-600 hover:bg-blue-50"
                                onClick={handleAddItem}
                                disabled={isAddingItem || !newItemText.trim()}
                            >
                                <Plus className={`w-4 h-4 ${isAddingItem ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Action Bar */}
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm"
                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-[10px] font-black py-5 rounded-2xl border-none uppercase tracking-tighter text-slate-700"
                            onClick={() => openCommentsDialog(task)}
                        >
                            📂 TRATAR
                        </Button>
                        <div className="flex-1">
                            {task.due_date ? (
                                <GoogleCalendarButton
                                    title={task.title}
                                    description={task.description || ""}
                                    dueDate={task.due_date}
                                    size="sm"
                                    showText={true}
                                    className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-[10px] font-black rounded-2xl border-none text-slate-800"
                                />
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full h-11 bg-slate-50 opacity-40 text-[10px] font-black rounded-2xl border-none text-slate-400"
                                    disabled
                                >
                                    📅 AGENDA
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-4 space-y-6">
            {/* Header with back button */}
            {onBack && (
                <div className="flex items-center gap-3 -mx-4 -mt-4 px-4 py-3 bg-white border-b sticky top-0 z-10">
                    <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="font-semibold text-gray-900">Gestão de Tarefas</h2>
                </div>
            )}

            <Tabs defaultValue="tasks" className="w-full flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="flex bg-transparent p-0 gap-6 w-auto">
                        <TabsTrigger 
                            value="tasks" 
                            className="bg-transparent border-none p-0 text-[10px] uppercase font-bold tracking-widest text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                        >
                            Tarefas
                        </TabsTrigger>
                        <TabsTrigger 
                            value="calendar"
                            className="bg-transparent border-none p-0 text-[10px] uppercase font-bold tracking-widest text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                        >
                            Calendário
                        </TabsTrigger>
                        <TabsTrigger 
                            value="history"
                            className="bg-transparent border-none p-0 text-[10px] uppercase font-bold tracking-widest text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                        >
                            Histórico
                        </TabsTrigger>
                        <TabsTrigger 
                            value="cancelled"
                            className="bg-transparent border-none p-0 text-[10px] uppercase font-bold tracking-widest text-gray-400 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-2"
                        >
                            Canceladas
                        </TabsTrigger>
                    </TabsList>
                    <Button variant="ghost" size="sm" onClick={refetchTasks} disabled={tasksLoading} className="rounded-xl border border-gray-100 h-8">
                        <RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <TabsContent value="tasks" className="mt-0 border-none p-0 outline-none flex-1 flex flex-col">
                    {/* --- SEARCH AREA --- */}
                    <div className="px-1 mb-6">
                        <div className="relative group">
                            <Input 
                                placeholder="Buscar tarefa específica..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 rounded-[1.5rem] bg-white border-slate-100 text-[13px] font-medium pl-11 shadow-sm group-focus-within:shadow-md transition-all"
                            />
                            <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 -mx-1 px-1">
                        <div className="space-y-8 pb-10">
                            {/* --- PROJECTS SECTION --- */}
                            <section>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Meus Projetos</h3>
                                    {filterProject !== "all" && (
                                        <button 
                                            onClick={() => setFilterProject("all")}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
                                        >
                                            Ver Todos
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* All Projects Card */}
                                    <div 
                                        onClick={() => setFilterProject("all")}
                                        className={`p-4 rounded-[2rem] border-2 transition-all cursor-pointer ${
                                            filterProject === "all" 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                            : 'bg-white border-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl mb-3 flex items-center justify-center ${filterProject === "all" ? 'bg-white/20' : 'bg-blue-50'}`}>
                                            <ClipboardList className={`w-4 h-4 ${filterProject === "all" ? 'text-white' : 'text-blue-600'}`} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase leading-tight">Painel Geral</p>
                                        <p className={`text-[9px] mt-1 font-bold ${filterProject === "all" ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {activeTasks.length} Ativas
                                        </p>
                                    </div>

                                    {/* Dynamic Project Cards */}
                                    {projectStats.map((proj) => (
                                        <div 
                                            key={proj.id}
                                            onClick={() => setFilterProject(proj.id)}
                                            className={`p-4 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden ${
                                                filterProject === proj.id 
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-xl' 
                                                : 'bg-white border-slate-50 text-slate-600'
                                            }`}
                                        >
                                            {/* Progress background line */}
                                            <div 
                                                className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${filterProject === proj.id ? 'bg-blue-400' : 'bg-blue-600'}`} 
                                                style={{ width: `${proj.avgProgress}%` }}
                                            />
                                            
                                            <div className="flex justify-between items-start mb-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${filterProject === proj.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                                                    <span className="text-[10px] font-black">{proj.avgProgress}%</span>
                                                </div>
                                                {proj.activeCount > 0 && (
                                                    <Badge className={`px-1.5 h-4 text-[8px] border-none ${filterProject === proj.id ? 'bg-blue-500 text-white' : 'bg-orange-50 text-orange-600'}`}>
                                                        {proj.activeCount}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] font-black uppercase leading-tight line-clamp-2">{proj.name}</p>
                                        </div>
                                    ))}

                                    {/* Unassigned Tasks pseudo-project */}
                                    {unassignedTasks.length > 0 && (
                                        <div 
                                            onClick={() => setFilterProject("unassigned")}
                                            className={`p-4 rounded-[2rem] border-2 transition-all cursor-pointer ${
                                                filterProject === "unassigned" 
                                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' 
                                                : 'bg-white border-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl mb-3 flex items-center justify-center ${filterProject === "unassigned" ? 'bg-white/20' : 'bg-amber-50'}`}>
                                                <AlertCircle className={`w-4 h-4 ${filterProject === "unassigned" ? 'text-white' : 'text-amber-600'}`} />
                                            </div>
                                            <p className="text-[11px] font-black uppercase leading-tight">Extras / Sem Projeto</p>
                                            <p className={`text-[9px] mt-1 font-bold ${filterProject === "unassigned" ? 'text-amber-100' : 'text-slate-400'}`}>
                                                {unassignedTasks.length} Ativas
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-5 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                        <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                                            {filterProject === "all" ? "Fluxo Ativo" : "Detalhamento"}
                                        </h3>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 text-[10px] font-black uppercase tracking-widest bg-white text-blue-600 border-slate-100 rounded-xl"
                                        onClick={() => setIsNewTaskOpen(true)}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        ADICIONAR
                                    </Button>
                                </div>

                                {filteredActiveTasks.length > 0 ? (
                                    <div className="space-y-4">
                                        {filteredActiveTasks.map(task => (
                                            <TaskCardV2 key={task.id} task={task} isRoutine={task.is_daily_routine} />
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="border-dashed border-2 border-slate-100 bg-slate-50/50 rounded-[2rem]">
                                        <CardContent className="py-20 text-center">
                                            <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Nenhuma tarefa ativa</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </section>
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="calendar" className="mt-4 px-0 flex-1 min-h-[60vh]">
                    <TaskCalendar 
                        tasks={tasks} 
                        onTaskClick={(task) => setSelectedTaskForDetails(task)} 
                    />
                </TabsContent>

                <TabsContent value="history">
                    <ScrollArea className="h-[70vh]">
                        <div className="space-y-4 pb-10">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                Histórico Concluído
                            </h3>

                            {completedTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {completedTasks.map(task => (
                                        <Card key={task.id} className="opacity-75 bg-gray-50 border-none rounded-[1.5rem]">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-700 line-through text-sm">{task.title}</h4>
                                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{task.id.substring(0, 8)}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[9px] uppercase bg-green-100 text-green-800 border-none">
                                                        OK
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border-none bg-slate-50/50 rounded-[1.5rem]">
                                    <CardContent className="py-8 text-center">
                                        <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Histórico Vazio</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="cancelled">
                    <ScrollArea className="h-[70vh]">
                        <div className="space-y-4 pb-10">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                Tarefas Canceladas
                            </h3>

                            {cancelledTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {cancelledTasks.map(task => (
                                        <Card key={task.id} className="opacity-75 bg-red-50/30 border-red-100 rounded-[1.5rem]">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-600 text-sm">{task.title}</h4>
                                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{task.id.substring(0, 8)}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[9px] uppercase bg-red-100 text-red-800 border-none">
                                                        X
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border-none bg-slate-50/50 rounded-[1.5rem]">
                                    <CardContent className="py-8 text-center">
                                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Nenhum Cancelamento</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>

            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Nova Tarefa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="task-title">Título</Label>
                            <Input
                                id="task-title"
                                placeholder="O que precisa ser feito?"
                                value={newTaskData.title}
                                onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-desc">Descrição (Opcional)</Label>
                            <Textarea
                                id="task-desc"
                                placeholder="Detalhes da tarefa..."
                                value={newTaskData.description}
                                onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="task-priority">Prioridade</Label>
                                <Select
                                    value={newTaskData.priority}
                                    onValueChange={(value) => setNewTaskData(prev => ({ ...prev, priority: value }))}
                                >
                                    <SelectTrigger id="task-priority">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="baixa">Baixa</SelectItem>
                                        <SelectItem value="média">Média</SelectItem>
                                        <SelectItem value="alta">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="task-date">Prazo (Opcional)</Label>
                                <Input
                                    id="task-date"
                                    type="datetime-local"
                                    value={newTaskData.dueDate}
                                    onChange={(e) => setNewTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Label>Checklist</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Adicionar item..."
                                    value={currentChecklistItem}
                                    onChange={(e) => setCurrentChecklistItem(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                                />
                                <Button type="button" size="icon" onClick={handleAddChecklistItem}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                {newTaskData.checklist.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                                        <span className="truncate flex-1 mr-2">{item}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveChecklistItem(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2 pb-4">
                            <Checkbox 
                                id="is-daily" 
                                checked={newTaskData.isDailyRoutine}
                                onCheckedChange={(checked) => setNewTaskData(prev => ({ ...prev, isDailyRoutine: !!checked }))}
                            />
                            <Label htmlFor="is-daily" className="text-sm cursor-pointer">Definir como Rotina Diária</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTask} disabled={!newTaskData.title}>Criar Tarefa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isExtensionDialogOpen} onOpenChange={setIsExtensionDialogOpen}>
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
                            <Label htmlFor="ext-reason">Motivo do Atraso</Label>
                            <Textarea
                                id="ext-reason"
                                placeholder="Explique por que precisa de mais tempo..."
                                value={extensionReason}
                                onChange={(e) => setExtensionReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExtensionDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleRequestExtension}
                            disabled={!extensionDate || !extensionReason || isSubmittingExtension}
                        >
                            {isSubmittingExtension ? "Enviando..." : "Enviar Solicitação"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCommentsOpen} onOpenChange={(open) => {
                setIsCommentsOpen(open);
                if (!open) {
                    setSelectedChecklistItemId(undefined);
                    setIsRequestingExtensionInComments(false);
                }
            }}>
                <DialogContent className="max-w-[95vw] w-full p-4 rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center justify-between">
                            <span>{isRequestingExtensionInComments ? "Solicitar Novo Prazo" : (selectedChecklistItemId ? "Comentário no Item" : "Comentários da Tarefa")}</span>
                            {isRequestingExtensionInComments && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-bold uppercase text-slate-400"
                                    onClick={() => setIsRequestingExtensionInComments(false)}
                                >
                                    Voltar
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedTaskForComments && (
                        <div className="mt-2">
                            {isRequestingExtensionInComments ? (
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nova Data Sugerida</Label>
                                        <Input
                                            type="datetime-local"
                                            value={extensionDate}
                                            onChange={(e) => setExtensionDate(e.target.value)}
                                            className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Motivo da Prorrogação</Label>
                                        <Textarea
                                            placeholder="Explique ao gestor o motivo do novo prazo..."
                                            value={extensionReason}
                                            onChange={(e) => setExtensionReason(e.target.value)}
                                            className="min-h-[120px] rounded-2xl border-slate-100 bg-slate-50 font-bold resize-none p-4"
                                        />
                                    </div>
                                    <Button 
                                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 uppercase tracking-widest text-xs"
                                        onClick={() => {
                                            setSelectedTaskForExtension(selectedTaskForComments);
                                            handleRequestExtension();
                                        }}
                                        disabled={!extensionDate || !extensionReason || isSubmittingExtension}
                                    >
                                        {isSubmittingExtension ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : "Enviar para Aprovação"}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {selectedChecklistItemId && (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] text-blue-700 font-bold">
                                            ITEM: {selectedTaskForComments.checklist.find((i: any) => i.id === selectedChecklistItemId)?.text}
                                        </div>
                                    )}
                                    <TaskComments 
                                        taskId={selectedTaskForComments.id}
                                        checklistItemId={selectedChecklistItemId}
                                        fetchComments={fetchComments}
                                        addComment={addComment}
                                    />
                                    
                                    {!selectedChecklistItemId && selectedTaskForComments.status !== 'concluido' && (
                                        <div className="mt-6 pt-4 border-t border-slate-50">
                                            <Button 
                                                variant="outline" 
                                                className="w-full h-12 border-2 border-slate-100 rounded-2xl text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50"
                                                onClick={() => setIsRequestingExtensionInComments(true)}
                                            >
                                                🕒 Pedir Prorrogação de Prazo
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    
                    {!isRequestingExtensionInComments && (
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setIsCommentsOpen(false)} className="w-full h-12 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                Fechar
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhes da Tarefa para o Calendário */}
            <Dialog open={!!selectedTaskForDetails} onOpenChange={(open) => !open && setSelectedTaskForDetails(null)}>
                <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden border-none">
                    {selectedTaskForDetails && (
                        <div className="flex flex-col">
                            <div className={`h-2 ${getPriorityColor(selectedTaskForDetails.priority)}`} />
                            <div className="p-5 space-y-4">
                                <DialogHeader className="text-left">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <DialogTitle className="text-xl font-bold">{selectedTaskForDetails.title}</DialogTitle>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: #{selectedTaskForDetails.id}</p>
                                        </div>
                                        <Badge variant="outline" className="capitalize">{selectedTaskForDetails.status}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Prazo: {selectedTaskForDetails.due_date ? format(new Date(selectedTaskForDetails.due_date), "dd/MM/yyyy HH:mm") : "Sem prazo"}</span>
                                    </div>
                                </DialogHeader>

                                {selectedTaskForDetails.description && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-sm text-slate-600">
                                        {selectedTaskForDetails.description}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist</span>
                                        <span className="text-xs font-bold text-primary">{selectedTaskForDetails.progress}%</span>
                                    </div>
                                    <Progress value={selectedTaskForDetails.progress} className="h-2" />
                                    
                                    <ScrollArea className="max-h-[200px] pr-3">
                                        <div className="space-y-2">
                                            {selectedTaskForDetails.checklist.map((item: any) => (
                                                <div key={item.id} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-md">
                                                    <Checkbox
                                                        id={`detail-item-${item.id}`}
                                                        checked={item.completed}
                                                        onCheckedChange={() => handleChecklistToggle(item.id, item.completed)}
                                                    />
                                                    <label 
                                                        htmlFor={`detail-item-${item.id}`}
                                                        className={`text-sm flex-1 ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                                    >
                                                        {item.text}
                                                    </label>
                                                </div>
                                            ))}
                                            {selectedTaskForDetails.checklist.length === 0 && (
                                                <p className="text-center py-4 text-xs text-slate-400 italic">Nenhum item adicionado</p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button 
                                        variant="outline" 
                                        className="gap-2"
                                        onClick={() => {
                                            setSelectedTaskForComments(selectedTaskForDetails);
                                            setIsCommentsOpen(true);
                                        }}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Comentários
                                    </Button>
                                    <GoogleCalendarButton
                                        title={selectedTaskForDetails.title}
                                        description={selectedTaskForDetails.description || ""}
                                        dueDate={selectedTaskForDetails.due_date}
                                        className="w-full"
                                    />
                                </div>
                                
                                <Button className="w-full bg-primary" onClick={() => setSelectedTaskForDetails(null)}>
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
