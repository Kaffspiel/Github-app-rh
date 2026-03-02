import { createContext, useContext, useState, ReactNode } from 'react';

export type View = "dashboard" | "tasks" | "collaborator" | "timetracking" | "absenteeism" | "gamification" | "reports" | "employees" | "occurrences" | "rules" | "strategic_rh";

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
    expectedStart?: string;
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

    const [tasks, setTasks] = useState<Task[]>([]);

    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);

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
