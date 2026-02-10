import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { format } from "date-fns";

export interface DepartmentStats {
    name: string;
    employeeCount: number;
    totalOccurrences: number;
    totalTasks: number;
    delayedTasks: number;
    completedTasks: number;
    occurrenceRate: number; // occurrences per employee
}

export interface EmployeeRanking {
    id: string;
    name: string;
    department: string;
    occurrences: number;
    delayedTasks: number;
    predictedHours?: number;
    actualHours?: number;
    absenteeismRate?: number;
    productivityScore?: number;
}

export function useCompanyReports() {
    const { companyId } = useCompany();
    const [isLoading, setIsLoading] = useState(false);

    const fetchCompanyStats = useCallback(async (startDate?: Date, endDate?: Date) => {
        if (!companyId) return null;

        setIsLoading(true);
        try {
            // 1. Fetch All Employees
            const { data: employees } = await supabase
                .from('employees')
                .select('id, name, department, role, daily_work_hours')
                .eq('company_id', companyId);

            if (!employees) return null;

            // 2. Fetch All Time Records (for Occurrences and Hours)
            let timeQuery = supabase
                .from('time_tracking_records')
                .select('id, employee_id, status, record_date, total_hours, employees(department)')
                .eq('company_id', companyId);

            if (startDate && endDate) {
                timeQuery = timeQuery
                    .gte('record_date', format(startDate, 'yyyy-MM-dd'))
                    .lte('record_date', format(endDate, 'yyyy-MM-dd'));
            }
            const { data: timeRecords } = await timeQuery;

            // 3. Fetch All Tasks
            let taskQuery = supabase
                .from('tasks')
                .select('id, assignee_id, status, due_date')
                .eq('company_id', companyId);

            if (startDate && endDate) {
                taskQuery = taskQuery
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString());
            }
            const { data: tasks } = await taskQuery;

            // --- Helper: Working Days Count ---
            const getWorkingDays = (start: Date, end: Date) => {
                let count = 0;
                const curDate = new Date(start);
                while (curDate <= end) {
                    const dayOfWeek = curDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                    curDate.setDate(curDate.getDate() + 1);
                }
                return count || 1; // Minimum 1 day
            };

            const workingDays = (startDate && endDate) ? getWorkingDays(startDate, endDate) : 22;

            // --- Aggregation Logic ---

            // Helper to find employee department (fallback if join missing)
            const getDept = (empId: string | null) => {
                if (!empId) return 'Sem Departamento';
                const emp = employees.find(e => e.id === empId);
                return emp?.department || 'Sem Departamento';
            };

            const deptMap = new Map<string, DepartmentStats>();
            const empStatsMap = new Map<string, EmployeeRanking>();

            // Initialize Employee Stats
            employees.forEach(emp => {
                empStatsMap.set(emp.id, {
                    id: emp.id,
                    name: emp.name,
                    department: emp.department || 'Geral',
                    occurrences: 0,
                    delayedTasks: 0
                });
            });

            // Process Time Records (Occurrences)
            (timeRecords || []).forEach(record => {
                if (record.status && record.status !== 'normal') {
                    const empId = record.employee_id;
                    if (empId && empStatsMap.has(empId)) {
                        empStatsMap.get(empId)!.occurrences += 1;
                    }
                }
            });

            // Process Tasks
            (tasks || []).forEach(task => {
                const isDelayed = task.status === 'atrasada' || (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'concluido');
                const isCompleted = task.status === 'concluido';
                const empId = task.assignee_id;

                if (empId && empStatsMap.has(empId) && isDelayed) {
                    empStatsMap.get(empId)!.delayedTasks += 1;
                }

                // Department Stats
                const deptName = getDept(empId);
                if (!deptMap.has(deptName)) {
                    deptMap.set(deptName, { name: deptName, employeeCount: 0, totalOccurrences: 0, totalTasks: 0, delayedTasks: 0, completedTasks: 0, occurrenceRate: 0 });
                }
                const dept = deptMap.get(deptName)!;
                dept.totalTasks += 1;
                if (isDelayed) dept.delayedTasks += 1;
                if (isCompleted) dept.completedTasks += 1;
            });

            // Aggregate Departments from Time Records as well (since some employees might only have Time Records and no Tasks)
            (timeRecords || []).forEach(record => {
                if (record.status && record.status !== 'normal') {
                    const deptName = getDept(record.employee_id);
                    if (!deptMap.has(deptName)) {
                        deptMap.set(deptName, { name: deptName, employeeCount: 0, totalOccurrences: 0, totalTasks: 0, delayedTasks: 0, completedTasks: 0, occurrenceRate: 0 });
                    }
                    deptMap.get(deptName)!.totalOccurrences += 1;
                }
            });

            // Count Employees per Department
            employees.forEach(emp => {
                const deptName = emp.department || 'Geral';
                if (!deptMap.has(deptName)) {
                    deptMap.set(deptName, { name: deptName, employeeCount: 0, totalOccurrences: 0, totalTasks: 0, delayedTasks: 0, completedTasks: 0, occurrenceRate: 0 });
                }
                deptMap.get(deptName)!.employeeCount += 1;
            });

            // Final Calculations
            const departments = Array.from(deptMap.values()).map(d => ({
                ...d,
                occurrenceRate: d.employeeCount > 0 ? parseFloat((d.totalOccurrences / d.employeeCount).toFixed(2)) : 0
            }));

            // Finalizing Employee Stats
            employees.forEach(emp => {
                const stats = empStatsMap.get(emp.id);
                if (stats) {
                    const dailyHours = emp.daily_work_hours || 8;
                    stats.predictedHours = dailyHours * workingDays;

                    // Sum actual hours from time records
                    const empTimeRecords = (timeRecords || []).filter(r => r.employee_id === emp.id);
                    stats.actualHours = empTimeRecords.reduce((sum, r) => {
                        const h = parseFloat(String(r.total_hours || 0));
                        return sum + (isNaN(h) ? 0 : h);
                    }, 0);

                    // Absenteísmo = (Previsto - Realizado) / Previsto
                    stats.absenteeismRate = stats.predictedHours > 0
                        ? Math.max(0, (stats.predictedHours - stats.actualHours) / stats.predictedHours)
                        : 0;

                    // Produtividade (Simplificada): % de tarefas no prazo * (1 - absenteísmo)
                    const empTasks = (tasks || []).filter(t => t.assignee_id === emp.id);
                    const totalTasks = empTasks.length;
                    const onTimeTasks = empTasks.filter(t => t.status === 'concluido' && !(t.due_date && new Date(t.due_date) < new Date())).length;

                    const taskScore = totalTasks > 0 ? (onTimeTasks / totalTasks) : 1;
                    stats.productivityScore = taskScore * (1 - stats.absenteeismRate);
                }
            });

            // Sort Departments by Occurrence Rate Descending
            departments.sort((a, b) => b.occurrenceRate - a.occurrenceRate);

            // Top Offenders (Employees with most occurrences + delays)
            const topOffenders = Array.from(empStatsMap.values())
                .filter(e => e.occurrences > 0 || e.delayedTasks > 0)
                .sort((a, b) => (b.occurrences + b.delayedTasks) - (a.occurrences + a.delayedTasks))
                .slice(0, 10); // Top 10

            return {
                departments,
                topOffenders
            };

        } catch (error) {
            console.error("Error fetching company stats:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    return {
        fetchCompanyStats,
        isLoading
    };
}
