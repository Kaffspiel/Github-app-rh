import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  sort_order: number;
}

export interface CollaboratorTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'alta' | 'média' | 'baixa';
  status: 'pendente' | 'andamento' | 'concluido' | 'atrasada';
  due_date: string | null;
  progress: number;
  is_daily_routine: boolean;
  created_at: string;
  checklist: ChecklistItem[];
  company_id?: string;
}

export function useCollaboratorTasks() {
  const [tasks, setTasks] = useState<CollaboratorTask[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logTaskProgress, notifyTaskCompleted } = useTaskNotifications();

  const fetchMyTasks = useCallback(async () => {
    if (!user?.id) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // First get the employee record for this user
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (employeeError) throw employeeError;
      
      if (!employee) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      setEmployeeId(employee.id);
      setEmployeeName(employee.name);
      setCompanyId(employee.company_id);

      // Fetch tasks assigned to this employee
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', employee.id)
        .neq('status', 'concluido')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch checklists for all tasks
      const taskIds = tasksData?.map(t => t.id) || [];
      let checklistsData: any[] = [];

      if (taskIds.length > 0) {
        const { data: checklists, error: checklistError } = await supabase
          .from('task_checklist_items')
          .select('*')
          .in('task_id', taskIds)
          .order('sort_order', { ascending: true });

        if (checklistError) throw checklistError;
        checklistsData = checklists || [];
      }

      // Map tasks with checklists
      const enrichedTasks: CollaboratorTask[] = (tasksData || []).map(task => {
        const taskChecklists = checklistsData.filter(c => c.task_id === task.id);

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority as CollaboratorTask['priority'],
          status: task.status as CollaboratorTask['status'],
          due_date: task.due_date,
          progress: task.progress,
          is_daily_routine: task.is_daily_routine,
          created_at: task.created_at,
          company_id: task.company_id,
          checklist: taskChecklists.map(c => ({
            id: c.id,
            text: c.text,
            completed: c.completed,
            sort_order: c.sort_order,
          })),
        };
      });

      setTasks(enrichedTasks);
    } catch (err: any) {
      console.error('Error fetching collaborator tasks:', err);
      toast({
        title: 'Erro ao carregar tarefas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  const toggleChecklistItem = useCallback(async (itemId: string, completed: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({ completed })
        .eq('id', itemId);

      if (error) throw error;

      // Find the task and checklist item for logging
      const task = tasks.find(t => t.checklist.some(c => c.id === itemId));
      const checklistItem = task?.checklist.find(c => c.id === itemId);
      
      // Log the progress
      if (task && employeeId && completed) {
        logTaskProgress({
          taskId: task.id,
          employeeId,
          actionType: 'checklist_completed',
          checklistItemId: itemId,
          checklistItemText: checklistItem?.text,
        });
      }

      // Recalculate task progress
      if (task && task.checklist.length > 0) {
        const updatedChecklist = task.checklist.map(c => 
          c.id === itemId ? { ...c, completed } : c
        );
        const completedCount = updatedChecklist.filter(c => c.completed).length;
        const progress = Math.round((completedCount / updatedChecklist.length) * 100);

        await supabase
          .from('tasks')
          .update({ progress })
          .eq('id', task.id);
      }

      await fetchMyTasks();
      return true;
    } catch (err: any) {
      console.error('Error toggling checklist item:', err);
      toast({
        title: 'Erro ao atualizar item',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [tasks, employeeId, fetchMyTasks, toast, logTaskProgress]);

  const updateTaskStatus = useCallback(async (taskId: string, status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      const task = tasks.find(t => t.id === taskId);

      // Log progress
      if (employeeId) {
        if (status === 'andamento') {
          logTaskProgress({
            taskId,
            employeeId,
            actionType: 'task_started',
          });
        } else if (status === 'concluido') {
          logTaskProgress({
            taskId,
            employeeId,
            actionType: 'task_completed',
          });

          // Notify manager when task is completed
          if (task && companyId) {
            notifyTaskCompleted({
              taskId,
              taskTitle: task.title,
              employeeId,
              employeeName,
              companyId,
            });
          }
        }
      }

      toast({
        title: 'Status atualizado',
        description: status === 'concluido' ? 'Tarefa concluída!' : 'Status da tarefa atualizado.',
      });

      await fetchMyTasks();
      return true;
    } catch (err: any) {
      console.error('Error updating task status:', err);
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [tasks, employeeId, employeeName, companyId, fetchMyTasks, toast, logTaskProgress, notifyTaskCompleted]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  return {
    tasks,
    employeeId,
    employeeName,
    isLoading,
    refetch: fetchMyTasks,
    toggleChecklistItem,
    updateTaskStatus,
  };
}
