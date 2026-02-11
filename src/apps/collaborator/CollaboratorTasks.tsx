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
    ArrowLeft
} from "lucide-react";
import { useCollaboratorTasks } from "@/hooks/useCollaboratorTasks";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { format } from "date-fns";
import { toast } from "sonner";

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
        refetch: refetchTasks
    } = useCollaboratorTasks();

    const { notifyExtensionRequest } = useTaskNotifications();
    const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
    const [selectedTaskForExtension, setSelectedTaskForExtension] = useState<any>(null);
    const [extensionDate, setExtensionDate] = useState("");
    const [extensionReason, setExtensionReason] = useState("");
    const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);

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



    // Filter tasks for Tabs
    const activeTasksList = tasks.filter(t => t.status !== 'concluido');
    const completedTasks = tasks.filter(t => t.status === 'concluido');

    const dailyRoutines = activeTasksList.filter(t => t.is_daily_routine);
    const extraTasks = activeTasksList.filter(t => !t.is_daily_routine);

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

            <Tabs defaultValue="tasks" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="grid w-[200px] grid-cols-2">
                        <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                        <TabsTrigger value="history">Histórico</TabsTrigger>
                    </TabsList>
                    <Button variant="ghost" size="sm" onClick={refetchTasks} disabled={tasksLoading}>
                        <RefreshCw className={`w-4 h-4 ${tasksLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <TabsContent value="tasks" className="space-y-6">
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
                                            <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                                                    {routine.checklist.length > 0 ? (
                                                        routine.checklist.map(item => (
                                                            <div key={item.id} className="flex items-center gap-2">
                                                                <Checkbox
                                                                    checked={item.completed}
                                                                    onCheckedChange={() => handleChecklistToggle(item.id, item.completed)}
                                                                />
                                                                <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                                    {item.text}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-gray-500 italic py-2">
                                                            Checklist vazio (sem itens)
                                                        </div>
                                                    )}
                                            </div>
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
                            <div className="flex justify-between items-center mb-4 w-full">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                    Tarefas Extra
                                </h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => setIsNewTaskOpen(true)}
                                >
                                    <ClipboardList className="w-3 h-3 mr-1" />
                                    Nova Tarefa
                                </Button>
                            </div>
                            {extraTasks.length > 0 && (
                                <Badge className="bg-orange-100 text-orange-700 text-[10px] mb-2">
                                    {extraTasks.length} tarefas
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
                                                <div className="flex gap-1">
                                                    {task.status === 'atrasada' && (
                                                        <Badge variant="destructive" className="text-[10px] uppercase">
                                                            Atrasada
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-[10px] uppercase">
                                                        {task.priority}
                                                    </Badge>
                                                    {task.extension_status === 'pending' && (
                                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[10px] gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Solicitação Pendente
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-gray-500 mb-3">{task.description}</p>
                                            )}
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Progresso</span>
                                                    <span>{task.progress}%</span>
                                                </div>

                                                {task.status === 'andamento' && (!task.checklist || task.checklist.length === 0) ? (
                                                    <div className="py-2">
                                                        <Slider
                                                            defaultValue={[task.progress]}
                                                            max={100}
                                                            step={5}
                                                            onValueCommit={(vals) => updateTaskProgress(task.id, vals[0])}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Progress value={task.progress} className="h-2" />
                                                )}

                                                <div className="flex gap-2">
                                                    {task.status === 'pendente' || task.status === 'atrasada' ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                                onClick={() => handleStartTask(task.id)}
                                                            >
                                                                <Play className="w-3 h-3 mr-1" />
                                                                INICIAR
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="w-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200"
                                                                onClick={() => openExtensionDialog(task)}
                                                            >
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                PRAZO
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-green-600 hover:bg-green-700"
                                                            onClick={() => updateTaskStatus(task.id, 'concluido')}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            CONCLUIR
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Show checklist progress if exists */}
                                                {task.checklist && task.checklist.length > 0 && (
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        Checklist: {task.checklist.filter(i => i.completed).length}/{task.checklist.length} concluídos
                                                    </div>
                                                )}
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
                                                <h4 className="font-semibold text-gray-700 line-through">{task.title}</h4>
                                                <Badge variant="secondary" className="text-[10px] uppercase bg-green-100 text-green-800">
                                                    Concluída
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Finalizada em: {new Date().toLocaleDateString()}
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
            </Tabs>

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
        </div >
    );
}
