import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
    Trash2
} from "lucide-react";
import { useCollaboratorTasks } from "@/hooks/useCollaboratorTasks";
import { toast } from "sonner";

interface NewTaskData {
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    isDailyRoutine: boolean;
    checklist: string[];
}

export default function CollaboratorTasks() {
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
        refetch: refetchTasks
    } = useCollaboratorTasks();

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
                                    <div className="space-y-2">
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

                <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nova Tarefa</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Título</Label>
                                <Input
                                    id="title"
                                    value={newTaskData.title}
                                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                                    placeholder="Ex: Organizar estoque"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={newTaskData.description}
                                    onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                                    placeholder="Detalhes da tarefa..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="priority">Prioridade</Label>
                                    <Select
                                        value={newTaskData.priority}
                                        onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="baixa">Baixa</SelectItem>
                                            <SelectItem value="média">Média</SelectItem>
                                            <SelectItem value="alta">Alta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dueDate">Prazo</Label>
                                    <Input
                                        id="dueDate"
                                        type="date"
                                        value={newTaskData.dueDate}
                                        onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 border p-3 rounded-md">
                                <Checkbox
                                    id="isDaily"
                                    checked={newTaskData.isDailyRoutine}
                                    onCheckedChange={(checked) => setNewTaskData({ ...newTaskData, isDailyRoutine: checked as boolean })}
                                />
                                <Label htmlFor="isDaily" className="cursor-pointer">
                                    É uma Rotina Diária?
                                </Label>
                            </div>

                            <div className="space-y-2">
                                <Label>Checklist (Opcional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={currentChecklistItem}
                                        onChange={(e) => setCurrentChecklistItem(e.target.value)}
                                        placeholder="Adicionar item..."
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                                    />
                                    <Button onClick={handleAddChecklistItem} size="sm" type="button">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                {newTaskData.checklist.length > 0 && (
                                    <ScrollArea className="h-[150px] border rounded-md p-2">
                                        <div className="space-y-1">
                                            {newTaskData.checklist.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                                    <span>{item}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveChecklistItem(index)} className="h-6 w-6 p-0 text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateTask}>Salvar Tarefa</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
                                            {task.status === 'pendente' ? (
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleStartTask(task.id)}
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    INICIAR
                                                </Button>
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
        </div>
    );
}
