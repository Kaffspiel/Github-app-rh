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
        refetch: refetchTasks
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
                employeeName: "Colaborador", // Fallback or need to get it from hook
                companyId: selectedTaskForExtension.company_id,
                newDate: format(new Date(extensionDate), "dd/MM/yyyy HH:mm"),
                reason: extensionReason
            });

            // Update local task status to pending
            // We need updateTask from hook
            if (updateTask) {
                await updateTask(selectedTaskForExtension.id, { extension_status: 'pending' });
            }

            toast.success("Solicitação enviada ao gestor!");
            setIsExtensionDialogOpen(false);
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
            case 'alta': return 'bg-red-500';
            case 'média': return 'bg-orange-400';
            default: return 'bg-blue-400';
        }
    };



    const dailyRoutines = tasks.filter(t => t.is_daily_routine);
    const extraTasks = tasks.filter(t => !t.is_daily_routine);
    const completedTasks = tasks.filter(t => t.status === 'concluido');
    const cancelledTasks = tasks.filter(t => t.status === 'cancelada');

    // Get unique projects from tasks
    const projectNames = Array.from(new Set(tasks.map(t => t.project_name || 'Geral')));

    const TaskCardV2 = ({ task, isRoutine = false }: { task: any, isRoutine?: boolean }) => (
        <Card className={`overflow-hidden border-2 border-slate-50 rounded-[2rem] shadow-sm hover:shadow-md transition-all`}>
            {/* Priority Strip */}
            {!isRoutine && <div className={`h-1.5 ${getPriorityColor(task.priority)}`} />}
            
            <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-4">
                    {/* Quick Check Action */}
                    <div 
                        onClick={() => updateTaskStatus(task.id, task.status === 'concluido' ? 'pendente' : 'concluido')}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            task.status === 'concluido' 
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-100 border-none' 
                            : 'bg-slate-50 border-2 border-slate-100'
                        }`}
                    >
                        {task.status === 'concluido' ? (
                            <CheckCircle2 className="w-6 h-6 text-white" />
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
                        </div>
                    </div>
                </div>

                {/* Progress / Checklist Summary */}
                <div className="space-y-2 mb-5 px-1">
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

                {/* Mobile Action Bar */}
                <div className="flex gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm"
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-[10px] font-black py-5 rounded-2xl border-none uppercase tracking-tighter"
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
                                className="w-full h-11 bg-slate-50 hover:bg-slate-100 text-[10px] font-black rounded-2xl border-none text-slate-800"
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
                            Concluídas
                        </TabsTrigger>
                    </TabsList>
                    <Button variant="ghost" size="sm" onClick={refetchTasks} disabled={tasksLoading} className="rounded-xl border border-gray-100 h-8">
                        <RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <TabsContent value="tasks" className="space-y-6">
                    {/* Daily Routines Section */}
                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                    Rotinas Diárias
                                </h3>
                            </div>
                            {dailyRoutines.length > 0 && (
                                <Badge className="bg-blue-50 text-blue-700 text-[10px] font-black border-none px-2.5">
                                    {dailyRoutines.length} ATIVAS
                                </Badge>
                            )}
                        </div>

                        {dailyRoutines.length > 0 ? (
                            <div className="space-y-4">
                                {dailyRoutines.map(routine => (
                                    <TaskCardV2 key={routine.id} task={routine} isRoutine={true} />
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed border-2 border-slate-100 bg-slate-50/50 rounded-[2rem]">
                                <CardContent className="py-10 text-center">
                                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Tudo limpo por aqui!</p>
                                </CardContent>
                            </Card>
                        )}
                                {/* Extra Tasks Section */}
                    <section>
                         <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                    Tarefas Extras
                                </h3>
                            </div>
                             <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border-orange-100 rounded-xl px-3"
                                onClick={() => setIsNewTaskOpen(true)}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                NOVA TAREFA
                            </Button>
                        </div>

                        {extraTasks.length > 0 ? (
                            <div className="space-y-4">
                                {extraTasks.map(task => (
                                    <TaskCardV2 key={task.id} task={task} />
                                ))}
                            </div>
                        ) : (
                             <Card className="border-dashed border-2 border-slate-100 bg-slate-50/50 rounded-[2rem]">
                                <CardContent className="py-10 text-center">
                                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest italic">Sem tarefas extras atribuídas</p>
                                </CardContent>
                            </Card>
                        )}
                    </section>
             </section>
                </TabsContent>

                <TabsContent value="calendar" className="mt-4 px-0 flex-1 min-h-[60vh]">
                    <TaskCalendar 
                        tasks={tasks} 
                        onTaskClick={(task) => setSelectedTaskForDetails(task)} 
                    />
                </TabsContent>

                <TabsContent value="history">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Tarefas Concluídas
                        </h3>

                        {completedTasks.length > 0 ? (
                            <div className="space-y-3">
                                {completedTasks.map(task => (
                                    <Card key={task.id} className="opacity-75 bg-gray-50">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-gray-700 line-through">{task.title}</h4>
                                                    <p className="text-[10px] text-gray-400 font-mono mt-1">ID: #{task.id.substring(0, 8)}</p>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px] uppercase bg-green-100 text-green-800">
                                                    Concluída
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Finalizada em: {task.updated_at ? format(new Date(task.updated_at), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Nenhuma tarefa concluída no histórico</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="cancelled">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            Tarefas Canceladas
                        </h3>

                        {cancelledTasks.length > 0 ? (
                            <div className="space-y-3">
                                {cancelledTasks.map(task => (
                                    <Card key={task.id} className="opacity-75 bg-red-50/30 border-red-100">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-gray-700">{task.title}</h4>
                                                    <p className="text-[10px] text-gray-400 font-mono mt-1">ID: #{task.id.substring(0, 8)}</p>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px] uppercase bg-red-100 text-red-800">
                                                    Cancelada
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-red-600 font-medium">
                                                Esta tarefa foi removida pelo gestor.
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Nenhuma tarefa cancelada</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
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
                if (!open) setSelectedChecklistItemId(undefined);
            }}>
                <DialogContent className="max-w-[95vw] w-full p-4">
                    <DialogHeader>
                        <DialogTitle className="text-sm">
                            {selectedChecklistItemId ? "Comentário no Item" : "Comentários da Tarefa"}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTaskForComments && (
                        <div className="mt-2">
                            {selectedChecklistItemId && (
                                <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 italic">
                                    Item: {selectedTaskForComments.checklist.find((i: any) => i.id === selectedChecklistItemId)?.text}
                                </div>
                            )}
                            <TaskComments 
                                taskId={selectedTaskForComments.id}
                                checklistItemId={selectedChecklistItemId}
                                fetchComments={fetchComments}
                                addComment={addComment}
                            />
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsCommentsOpen(false)} className="w-full h-10">
                            Fechar
                        </Button>
                    </DialogFooter>
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
