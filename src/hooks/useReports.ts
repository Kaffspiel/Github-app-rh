import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface DashboardStats {
    totalTasks: number;
    completedTasks: number;
    delayedTasks: number;
    occurrences: number;
    justifications: number;
    reoccurrences: number;
}

export interface ReportRecord {
    id: string;
    date: string;
    type: "task" | "occurrence" | "justification" | "decision";
    title: string;
    description: string;
    status?: "pending" | "approved" | "rejected" | "completed";
    details?: any;
}

export interface EmployeeDossier {
    id: string;
    name: string;
    department: string;
    position: string;
    admissionDate: string;
    records: ReportRecord[];
    summary: DashboardStats;
}

export function useReports() {
    const { companyId } = useCompany();
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats>({
        totalTasks: 0,
        completedTasks: 0,
        delayedTasks: 0,
        occurrences: 0,
        justifications: 0,
        reoccurrences: 0
    });

    const fetchEmployeeDossier = useCallback(async (employeeId: string, startDate?: Date, endDate?: Date) => {
        if (!companyId || !employeeId) return null;

        setIsLoading(true);
        try {
            // 1. Fetch Employee Details
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('id', employeeId)
                .single();

            if (!employee) return null;

            // 2. Fetch Tasks
            let tasksQuery = supabase
                .from('tasks')
                .select('*')
                .eq('company_id', companyId)
                .eq('assignee_id', employeeId);

            if (startDate && endDate) {
                tasksQuery = tasksQuery
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString());
            }

            const { data: tasks } = await tasksQuery;

            // 3. Fetch Time Records (Occurrences)
            let timeQuery = supabase
                .from('time_tracking_records')
                .select('*')
                .eq('company_id', companyId)
                .eq('employee_id', employeeId);

            if (startDate && endDate) {
                timeQuery = timeQuery
                    .gte('record_date', format(startDate, 'yyyy-MM-dd'))
                    .lte('record_date', format(endDate, 'yyyy-MM-dd'));
            }

            const { data: timeRecords } = await timeQuery;

            // Process Tasks
            const validTasks = tasks || [];
            const completedTasks = validTasks.filter(t => t.status === 'concluido');
            const delayedTasks = validTasks.filter(t => t.status === 'atrasada' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'concluido'));

            // Process Occurrences (from Time Records)
            // Logic: status != 'normal' is an occurrence
            const validTimeRecords = timeRecords || [];
            const occurrences = validTimeRecords.filter(r => r.status && r.status !== 'normal');

            // Map to Records
            const records: ReportRecord[] = [
                ...validTasks.map(t => ({
                    id: t.id,
                    date: format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
                    type: 'task' as const,
                    title: `Tarefa: ${t.title}`,
                    description: t.description || 'Sem descrição',
                    status: (t.status === 'concluido' ? 'completed' : 'pending') as ReportRecord['status'],
                    details: {
                        dueDate: t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy HH:mm') : null,
                        delay: t.status === 'atrasada' ? 'Sim' : null
                    }
                })),
                ...occurrences.map(r => ({
                    id: r.id,
                    date: format(new Date(r.record_date), 'dd/MM/yyyy HH:mm'),
                    type: 'occurrence' as const,
                    title: `Ocorrência de Ponto: ${translateStatus(r.status)}`,
                    description: r.notes || r.anomalies?.join(', ') || 'Sem detalhes',
                    status: 'pending' as ReportRecord['status'],
                    details: {
                        cancellation_reason: null
                    }
                }))
            ];

            // Sort by date desc
            records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const dossier: EmployeeDossier = {
                id: employee.id,
                name: employee.name,
                department: employee.department || 'Geral',
                position: employee.role === 'gestor' ? 'Gestor' : 'Colaborador',
                admissionDate: format(new Date(employee.created_at), 'dd/MM/yyyy'),
                records: records,
                summary: {
                    totalTasks: validTasks.length,
                    completedTasks: completedTasks.length,
                    delayedTasks: delayedTasks.length,
                    occurrences: occurrences.length,
                    justifications: 0, // Mock for now
                    reoccurrences: 0 // Mock for now
                }
            };

            return dossier;

        } catch (error) {
            console.error("Error fetching dossier:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    return {
        fetchEmployeeDossier,
        isLoading
    };
}

function translateStatus(status: string | null) {
    switch (status) {
        case 'delay': return 'Atraso';
        case 'absence': return 'Falta';
        case 'missing-punch': return 'Batida Ausente';
        case 'error': return 'Erro';
        default: return 'Ocorrência';
    }
}
