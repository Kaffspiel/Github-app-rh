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
  status: 'pendente' | 'andamento' | 'concluido' | 'atrasada' | 'cancelada';
  due_date: string | null;
  progress: number;
  is_daily_routine: boolean;
  created_at: string;
  checklist: ChecklistItem[];
  company_id?: string;
  extension_status?: 'none' | 'pending' | 'approved' | 'rejected';
  updated_at?: string;
  project_id?: string | null;
  project_name?: string | null;
  project_color?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  employee_id: string;
  employee_name?: string;
  content: string;
  checklist_item_id?: string;
  created_at: string;
}

export function useCollaboratorTasks() {
  const [tasks, setTasks] = useState<CollaboratorTask[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skipTimeTracking, setSkipTimeTracking] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logTaskProgress, notifyTaskCompleted, notifyChecklistItemCompleted, notifyTaskOverdue } = useTaskNotifications();

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
        .select('id, name, company_id, skip_time_tracking')
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
      setSkipTimeTracking(employee.skip_time_tracking || false);

      // Fetch projects assigned to this employee
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_members')
        .select(`
          role,
          project:projects (*)
        `)
        .eq('employee_id', employee.id);

      if (projectsError) throw projectsError;
      setProjects(projectsData?.map(pm => ({ ...pm.project, role: pm.role })) || []);

      // Fetch tasks assigned to this employee
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects (name, color)
        `)
        .eq('assignee_id', employee.id)
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

      // Check for overdue tasks
      const now = new Date();
      const updatesPromises = (tasksData || []).map(async (task) => {
        if (task.status !== 'concluido' && task.due_date) {
          const dueDate = new Date(task.due_date);

          if (dueDate < now) {
            // Se ainda não foi notificada como vencida
            if (!task.overdue_notified_at) {
              // 1. Notificar gestor e colaborador
              if (employee.company_id) {
                notifyTaskOverdue({
                  taskId: task.id,
                  taskTitle: task.title,
                  employeeName: employee.name,
                  assigneeId: employee.id, // Responsável
                  companyId: employee.company_id,
                  dueDate: task.due_date
                });
              }

              // 2. Marcar como notificada
              await supabase
                .from('tasks')
                .update({ overdue_notified_at: now.toISOString() })
                .eq('id', task.id);

              return { ...task, overdue_notified_at: now.toISOString() };
            }

            // Se já foi notificada, verificar se passaram 10 minutos para mudar status para 'atrasada'
            if (task.status !== 'atrasada') {
              const notifiedAt = new Date(task.overdue_notified_at);
              const tenMinutesInMs = 10 * 60 * 1000;

              if (now.getTime() - notifiedAt.getTime() > tenMinutesInMs) {
                await supabase
                  .from('tasks')
                  .update({ status: 'atrasada' })
                  .eq('id', task.id);

                return { ...task, status: 'atrasada' };
              }
            }
          }
        }
        return task;
      });

      const checkedTasks = await Promise.all(updatesPromises);

      // Map tasks with checklists
      const enrichedTasks: CollaboratorTask[] = checkedTasks.map((task: any) => {
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
          extension_status: task.extension_status,
          updated_at: task.updated_at,
          project_id: task.project_id,
          project_name: task.project?.name,
          project_color: task.project?.color
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
  }, [user?.id, toast, notifyTaskOverdue]);

  const toggleChecklistItem = useCallback(async (itemId: string, completed: boolean): Promise<boolean> => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => {
        if (!t.checklist.some(c => c.id === itemId)) return t;
        
        const updatedChecklist = t.checklist.map(c =>
          c.id === itemId ? { ...c, completed } : c
        );
        const completedCount = updatedChecklist.filter(c => c.completed).length;
        const progress = Math.round((completedCount / updatedChecklist.length) * 100);

        return {
          ...t,
          progress,
          checklist: updatedChecklist
        };
      }));

      const { error } = await supabase
        .from('task_checklist_items')
        .update({ completed })
        .eq('id', itemId);

      if (error) throw error;

      // Find the task and checklist item for logging
      const task = tasks.find(t => t.checklist.some(c => c.id === itemId));
      const checklistItem = task?.checklist.find(c => c.id === itemId);

      // Log progress
      if (task && employeeId && completed) {
        logTaskProgress({
          taskId: task.id,
          employeeId,
          actionType: 'checklist_completed',
          checklistItemId: itemId,
          checklistItemText: checklistItem?.text,
        });

        if (companyId && task.is_daily_routine) {
          notifyChecklistItemCompleted({
            taskId: task.id,
            taskTitle: task.title,
            employeeId,
            employeeName,
            companyId,
            checklistItemText: checklistItem?.text || 'Item desconhecido',
          });
        }
      }

      // Sync progress to DB
      const taskToUpdate = tasks.find(t => t.checklist.some(c => c.id === itemId));
      if (taskToUpdate && taskToUpdate.checklist.length > 0) {
        const updatedChecklist = taskToUpdate.checklist.map(c =>
          c.id === itemId ? { ...c, completed } : c
        );
        const completedCount = updatedChecklist.filter(c => c.completed).length;
        const progress = Math.round((completedCount / updatedChecklist.length) * 100);

        await supabase
          .from('tasks')
          .update({ progress })
          .eq('id', taskToUpdate.id);
      }

      // No full refetch needed if optimistic update worked, but we can do it in background
      fetchMyTasks();
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
  }, [tasks, employeeId, employeeName, companyId, fetchMyTasks, toast, logTaskProgress, notifyChecklistItemCompleted]);

  const updateTaskStatus = useCallback(async (taskId: string, status: string): Promise<boolean> => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: status as any } : t
      ));

      const { data: updatedData, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select();

      if (error) throw error;

      if (!updatedData || updatedData.length === 0) {
        throw new Error('Permissão negada: Não foi possível atualizar a tarefa.');
      }

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

      // Fetch in background for sync
      fetchMyTasks();
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

  const updateTaskProgress = useCallback(async (taskId: string, progress: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ progress })
        .eq('id', taskId);

      if (error) throw error;

      // Log progress update
      if (employeeId) {
        logTaskProgress({
          taskId,
          employeeId,
          actionType: 'progress_updated',
          checklistItemText: `Progress updated to ${progress}%`
        });
      }

      await fetchMyTasks();
      return true;
    } catch (err: any) {
      console.error('Error updating task progress:', err);
      toast({
        title: 'Erro ao atualizar progresso',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [employeeId, fetchMyTasks, toast, logTaskProgress]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<CollaboratorTask>): Promise<boolean> => {
    try {
      // Filter out fields that shouldn't be updated directly or map properly
      const { data: updatedData, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select();

      if (error) throw error;

      await fetchMyTasks();
      return true;
    } catch (err: any) {
      console.error('Error updating task:', err);
      toast({
        title: 'Erro ao atualizar tarefa',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchMyTasks, toast]);

  const createTask = useCallback(async (data: {
    title: string;
    description: string;
    priority: string;
    dueDate?: Date;
    isDailyRoutine?: boolean;
    checklist?: string[];
  }) => {
    try {
      if (!companyId || !employeeId) {
        throw new Error('Informações do colaborador incompletas');
      }

      // 1. Create the task
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          description: data.description,
          priority: data.priority,
          due_date: data.dueDate ? data.dueDate.toISOString() : null,
          status: 'pendente',
          company_id: companyId,
          assignee_id: employeeId,
          created_by: employeeId,
          progress: 0,
          is_daily_routine: data.isDailyRoutine || false
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Create checklist items if any
      if (data.checklist && data.checklist.length > 0 && newTask) {
        const checklistItems = data.checklist.map((text, index) => ({
          task_id: newTask.id,
          text: text,
          completed: false,
          sort_order: index
        }));

        const { error: checklistError } = await supabase
          .from('task_checklist_items')
          .insert(checklistItems);

        if (checklistError) throw checklistError;
      }

      toast({
        title: 'Tarefa criada',
        description: 'Sua tarefa foi criada com sucesso.',
      });

      await fetchMyTasks();
      return true;
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast({
        title: 'Erro ao criar tarefa',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [companyId, employeeId, fetchMyTasks, toast]);

  // Comments operations
  const fetchComments = useCallback(async (taskId: string): Promise<TaskComment[]> => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          employee:employees(name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(c => ({
        id: c.id,
        task_id: c.task_id,
        employee_id: c.employee_id,
        employee_name: c.employee?.name,
        content: c.content,
        created_at: c.created_at,
      }));
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      return [];
    }
  }, []);

  const addComment = useCallback(async (taskId: string, content: string, checklistItemId?: string): Promise<boolean> => {
    try {
      if (!employeeId) {
        toast({
          title: 'Erro',
          description: 'Colaborador não encontrado',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          employee_id: employeeId,
          content,
          checklist_item_id: checklistItemId,
        });

      if (error) throw error;

      await fetchMyTasks();
      return true;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast({
        title: 'Erro ao adicionar comentário',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [employeeId, fetchMyTasks, toast]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  return {
    tasks,
    employeeId,
    employeeName,
    isLoading,
    skipTimeTracking,
    projects,
    refetch: fetchMyTasks,
    toggleChecklistItem,
    updateTaskStatus,
    updateTaskProgress,
    createTask,
    updateTask,
    fetchComments,
    addComment
  };
}
