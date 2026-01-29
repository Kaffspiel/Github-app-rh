import { createContext, useContext, useState, ReactNode } from 'react';

export type View = "dashboard" | "tasks" | "collaborator" | "timetracking" | "gamification" | "reports";

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: "alta" | "média" | "baixa";
    status: "pendente" | "andamento" | "concluido" | "atrasada";
    dueDate: string;
    assignee: string;
    progress: number;
    comments: number;
    checklist: ChecklistItem[];
    createdDate?: string;
    createdBy?: string;
    isDailyRoutine: boolean;
}

export interface TimeRecord {
    id: string;
    employee: string;
    date: string;
    entry1: string;
    exit1: string;
    entry2: string;
    exit2: string;
    status: "normal" | "delay" | "absence" | "error" | "missing-punch";
    issue?: string;
    justification?: {
        text: string;
        attachment?: string;
        status: "pending" | "approved" | "rejected";
    };
}

interface AppContextType {
    tasks: Task[];
    timeRecords: TimeRecord[];
    currentUser: string;
    currentView: View;
    setCurrentView: (view: View) => void;
    taskFilter: string;
    setTaskFilter: (filter: string) => void;
    addTask: (task: Task) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => void;
    deleteTask: (taskId: string) => void;
    addTimeRecord: (record: TimeRecord) => void;
    updateTimeRecord: (record: TimeRecord) => void;
    setCurrentUser: (user: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState("Maria Santos");
    const [currentView, setCurrentView] = useState<View>("dashboard");
    const [taskFilter, setTaskFilter] = useState("todas");

    const [tasks, setTasks] = useState<Task[]>([
        {
            id: "1",
            title: "Revisar relatório financeiro Q1",
            description: "Verificar disparidades na planilha final.",
            assignee: "Maria Santos",
            priority: "alta",
            dueDate: "Hoje 14:00",
            createdDate: "20/05/2024",
            status: "andamento",
            progress: 45,
            comments: 3,
            checklist: [],
            isDailyRoutine: false
        },
        {
            id: "2",
            title: "Abertura de Caixa",
            description: "Realizar contagem inicial, verificar fundo de troco.",
            assignee: "Maria Santos",
            priority: "alta",
            dueDate: "Hoje 08:00",
            createdDate: "28/05/2024",
            status: "pendente",
            progress: 0,
            comments: 0,
            checklist: [
                { id: "1", text: "Contar cédulas", completed: false },
                { id: "2", text: "Verificar moedas", completed: false },
                { id: "3", text: "Ligar terminal", completed: false }
            ],
            isDailyRoutine: true
        },
        {
            id: "3",
            title: "Organizar Vitrine Principal",
            description: "Trocar manequins para coleção de inverno.",
            assignee: "Maria Santos",
            priority: "média",
            dueDate: "Hoje 18:00",
            createdDate: "27/05/2024",
            status: "pendente",
            progress: 0,
            comments: 1,
            checklist: [],
            isDailyRoutine: false
        },
        {
            id: "4",
            title: "Treinamento de Segurança",
            description: "Assistir vídeo obrigatório sobre EPIs.",
            assignee: "Maria Santos",
            priority: "baixa",
            dueDate: "Amanhã 10:00",
            createdDate: "28/05/2024",
            status: "concluido",
            progress: 100,
            comments: 0,
            checklist: [],
            isDailyRoutine: false
        },
        {
            id: "5",
            title: "Recebimento de Mercadoria",
            description: "Conferir entrega da transportadora X.",
            assignee: "João Silva",
            priority: "alta",
            dueDate: "Hoje 10:30",
            createdDate: "28/05/2024",
            status: "atrasada",
            progress: 10,
            comments: 5,
            checklist: [],
            isDailyRoutine: true
        },
        {
            id: "6",
            title: "Inventário do Setor B",
            description: "Contagem cíclica dos eletrônicos.",
            assignee: "João Silva",
            priority: "alta",
            dueDate: "Hoje 17:00",
            createdDate: "25/05/2024",
            status: "andamento",
            progress: 60,
            comments: 2,
            checklist: [],
            isDailyRoutine: false
        },
        {
            id: "7",
            title: "Ligação para Fornecedor",
            description: "Negociar prazo de pagamento da NF 450.",
            assignee: "Ana Lima",
            priority: "alta",
            dueDate: "Ontem 15:00",
            createdDate: "26/05/2024",
            status: "atrasada",
            progress: 0,
            comments: 1,
            checklist: [],
            isDailyRoutine: false
        },
        {
            id: "8",
            title: "Limpeza do Estoque",
            description: "Retirar caixas vazias do corredor 3.",
            assignee: "Ana Lima",
            priority: "baixa",
            dueDate: "Hoje 12:00",
            createdDate: "28/05/2024",
            status: "pendente",
            progress: 0,
            comments: 0,
            checklist: [],
            isDailyRoutine: true
        },
        {
            id: "katie-routine-1",
            title: "Rotina Diária - Gerencial",
            description: "Checklist diário de operações e logística.",
            assignee: "Maria Santos",
            priority: "alta",
            dueDate: "Hoje 18:00",
            createdDate: "28/05/2024",
            status: "andamento",
            progress: 65,
            comments: 0,
            isDailyRoutine: true,
            checklist: [
                { id: "1", text: "08h30 - Todos chegaram?", completed: true },
                { id: "2", text: "08h30 - Cobrar pedidos em produção", completed: true },
                { id: "3", text: "08h30 - Monitorar entregas", completed: true },
                { id: "4", text: "08h30 - Alinhar tarefas operacionais e organizar dia", completed: true },
                { id: "5", text: "09h00 - Monitorar Trello ADM", completed: false },
                { id: "6", text: "09h00 - Avaliação Operacional/Gerencial", completed: true },
                { id: "7", text: "09h00 - Reunião Operacional (Segundas)", completed: false },
                { id: "8", text: "09h10 - Cobrar pedidos em produção (Tiago)", completed: false },
                { id: "9", text: "09h10 - Conferir chegadas da transportadora", completed: false },
                { id: "10", text: "09h20 - Fazer postagem redes sociais", completed: true }
            ]
        }
    ]);

    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([
        {
            id: "1",
            employee: "João Silva",
            date: "28/05/2024",
            entry1: "09:15",
            exit1: "12:00",
            entry2: "13:00",
            exit2: "18:00",
            status: "delay"
        },
        {
            id: "2",
            employee: "Maria Santos",
            date: "28/05/2024",
            entry1: "08:58",
            exit1: "12:05",
            entry2: "13:00",
            exit2: "--:--",
            status: "normal"
        },
        {
            id: "3",
            employee: "Carlos Rocha",
            date: "27/05/2024",
            entry1: "--:--",
            exit1: "--:--",
            entry2: "--:--",
            exit2: "--:--",
            status: "missing-punch"
        },
        {
            id: "4",
            employee: "Ana Lima",
            date: "28/05/2024",
            entry1: "09:05",
            exit1: "12:00",
            entry2: "13:00",
            exit2: "18:00",
            status: "delay"
        },
        {
            id: "5",
            employee: "Pedro Costa",
            date: "28/05/2024",
            entry1: "09:00",
            exit1: "12:00",
            entry2: "13:00",
            exit2: "18:00",
            status: "normal"
        },
        {
            id: "6",
            employee: "Katiele Rocha",
            date: "28/05/2024",
            entry1: "08:30",
            exit1: "12:00",
            entry2: "13:00",
            exit2: "--:--",
            status: "normal"
        }
    ]);

    const addTask = (task: Task) => {
        setTasks((prev) => [...prev, task]);
    };

    const updateTask = (taskId: string, updates: Partial<Task>) => {
        setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    };

    const deleteTask = (taskId: string) => {
        setTasks((prev) => prev.filter(t => t.id !== taskId));
    };

    const addTimeRecord = (record: TimeRecord) => {
        setTimeRecords((prev) => [record, ...prev]);
    };

    const updateTimeRecord = (updatedRecord: TimeRecord) => {
        setTimeRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    };

    return (
        <AppContext.Provider
            value={{
                tasks,
                timeRecords,
                currentUser,
                currentView,
                setCurrentView,
                taskFilter,
                setTaskFilter,
                addTask,
                updateTask,
                deleteTask,
                addTimeRecord,
                updateTimeRecord,
                setCurrentUser
            }}
        >
            {children}
        </AppContext.Provider>
    );
};
