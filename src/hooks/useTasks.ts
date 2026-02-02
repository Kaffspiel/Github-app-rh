import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  sort_order: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  employee_id: string;
  employee_name?: string;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'alta' | 'média' | 'baixa';
  status: 'pendente' | 'andamento' | 'concluido' | 'atrasada';
  due_date: string | null;
  assignee_id: string | null;
  assignee_name?: string;
  progress: number;
  is_daily_routine: boolean;
  created_by: string | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  checklist: ChecklistItem[];
  comments_count: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'alta' | 'média' | 'baixa';
  due_date?: string;
  assignee_id?: string;
  is_daily_routine?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: 'alta' | 'média' | 'baixa';
  status?: 'pendente' | 'andamento' | 'concluido' | 'atrasada';
  due_date?: string;
  assignee_id?: string;
  progress?: number;
  is_daily_routine?: boolean;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const { notifyTaskAssigned, notifyTaskUpdated } = useTaskNotifications();

  const fetchTasks = useCallback(async () => {
    if (!companyId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch tasks with assignee and creator info
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!tasks_assignee_id_fkey(id, name),
          creator:employees!tasks_created_by_fkey(id, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Check for overdue tasks and update them
      if (tasksData) {
        const now = new Date();
        const overdueTasks = tasksData.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          // Check if due date is in the past, and status is not 'concluido' or 'atrasada'
          return dueDate < now && task.status !== 'concluido' && task.status !== 'atrasada';
        });

        if (overdueTasks.length > 0) {
          const overdueIds = overdueTasks.map(t => t.id);
          console.log('Marking overdue tasks:', overdueIds);

          // Update in Supabase
          await supabase
            .from('tasks')
            .update({ status: 'atrasada' })
            .in('id', overdueIds);

          // Update local data immediate reflection
          overdueTasks.forEach(t => {
            t.status = 'atrasada';
          });

          toast({
            title: 'Tarefas Atualizadas',
            description: `${overdueTasks.length} tarefa(s) marcada(s) como atrasada(s).`,
          });
        }
      }

      // Fetch checklists for all tasks
      const taskIds = tasksData?.map(t => t.id) || [];

      let checklistsData: any[] = [];
      let commentsCountData: any[] = [];

      if (taskIds.length > 0) {
        const { data: checklists, error: checklistError } = await supabase
          .from('task_checklist_items')
          .select('*')
          .in('task_id', taskIds)
          .order('sort_order', { ascending: true });

        if (checklistError) throw checklistError;
        checklistsData = checklists || [];

        // Get comment counts
        const { data: comments, error: commentsError } = await supabase
          .from('task_comments')
          .select('task_id')
          .in('task_id', taskIds);

        if (commentsError) throw commentsError;
        commentsCountData = comments || [];
      }

      // Map tasks with checklists and comment counts
      const enrichedTasks: Task[] = (tasksData || []).map(task => {
        const taskChecklists = checklistsData.filter(c => c.task_id === task.id);
        const taskCommentsCount = commentsCountData.filter(c => c.task_id === task.id).length;

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority as Task['priority'],
          status: task.status as Task['status'],
          due_date: task.due_date,
          assignee_id: task.assignee_id,
          assignee_name: task.assignee?.name,
          progress: task.progress,
          is_daily_routine: task.is_daily_routine,
          created_by: task.created_by,
          created_by_name: task.creator?.name,
          created_at: task.created_at,
          updated_at: task.updated_at,
          company_id: task.company_id,
          checklist: taskChecklists.map(c => ({
            id: c.id,
            text: c.text,
            completed: c.completed,
            sort_order: c.sort_order,
          })),
          comments_count: taskCommentsCount,
        };
      });

      setTasks(enrichedTasks);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar tarefas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    if (!companyId) {
      toast({
        title: 'Erro',
        description: 'Empresa não selecionada',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Get current employee id
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          company_id: companyId,
          title: input.title,
          description: input.description || null,
          priority: input.priority || 'média',
          due_date: input.due_date ? new Date(input.due_date).toISOString() : null,
          assignee_id: input.assignee_id || null,
          is_daily_routine: input.is_daily_routine || false,
          created_by: employee?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Tarefa criada',
        description: `"${input.title}" foi adicionada com sucesso.`,
      });

      // Send notification if task was assigned
      if (input.assignee_id && data) {
        const assignee = await supabase
          .from('employees')
          .select('id, name')
          .eq('id', input.assignee_id)
          .single();

        if (assignee.data) {
          const currentEmployee = await supabase
            .from('employees')
            .select('name')
            .eq('user_id', user?.id)
            .maybeSingle();

          notifyTaskAssigned({
            taskId: data.id,
            taskTitle: input.title,
            assigneeId: input.assignee_id,
            assigneeName: assignee.data.name,
            senderName: currentEmployee?.data?.name,
          });
        }
      }

      await fetchTasks();
      return data as Task;
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast({
        title: 'Erro ao criar tarefa',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [companyId, user?.id, fetchTasks, toast, notifyTaskAssigned]);



  const updateTask = useCallback(async (taskId: string, input: UpdateTaskInput): Promise<boolean> => {
    try {
      // Get current task data
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('assignee_id, title, description, priority, due_date, status')
        .eq('id', taskId)
        .maybeSingle();

      const updateData = {
        ...input,
        due_date: input.due_date ? new Date(input.due_date).toISOString() : input.due_date
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Tarefa atualizada',
        description: 'As alterações foram salvas.',
      });

      // Notifications Logic
      if (currentTask && input.assignee_id && input.assignee_id !== currentTask.assignee_id) {
        // Reassigned -> Notify New Assignee
        const assignee = await supabase
          .from('employees')
          .select('id, name')
          .eq('id', input.assignee_id)
          .single();

        if (assignee.data) {
          const currentUser = await supabase
            .from('employees')
            .select('name')
            .eq('user_id', user?.id)
            .maybeSingle();

          notifyTaskAssigned({
            taskId: taskId,
            taskTitle: input.title || currentTask.title,
            assigneeId: input.assignee_id,
            assigneeName: assignee.data.name,
            senderName: currentUser?.data?.name,
          });
        }
      } else if (currentTask && currentTask.assignee_id) {
        // Updated (same assignee) -> Notify Update
        const changes: string[] = [];
        if (input.title && input.title !== currentTask.title) changes.push('Título');
        if (input.description && input.description !== currentTask.description) changes.push('Descrição');
        if (input.priority && input.priority !== currentTask.priority) changes.push('Prioridade');
        if (input.due_date && input.due_date !== currentTask.due_date) changes.push('Prazo');
        if (input.status && input.status !== currentTask.status) changes.push('Status');

        if (changes.length > 0) {
          const currentUser = await supabase
            .from('employees')
            .select('name')
            .eq('user_id', user?.id)
            .maybeSingle();

          notifyTaskUpdated({
            taskId,
            taskTitle: currentTask.title,
            assigneeId: currentTask.assignee_id,
            senderName: currentUser?.data?.name,
            changes
          });
        }
      }

      await fetchTasks();
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
  }, [fetchTasks, toast, user?.id, notifyTaskAssigned, notifyTaskUpdated]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Tarefa excluída',
        description: 'A tarefa foi removida.',
      });

      await fetchTasks();
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Erro ao excluir tarefa',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTasks, toast]);

  // Checklist operations
  const addChecklistItem = useCallback(async (taskId: string, text: string): Promise<boolean> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const sortOrder = task?.checklist.length || 0;

      const { error } = await supabase
        .from('task_checklist_items')
        .insert({
          task_id: taskId,
          text,
          sort_order: sortOrder,
        });

      if (error) throw error;

      await fetchTasks();
      return true;
    } catch (err: any) {
      console.error('Error adding checklist item:', err);
      toast({
        title: 'Erro ao adicionar item',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [tasks, fetchTasks, toast]);

  const toggleChecklistItem = useCallback(async (itemId: string, completed: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({ completed })
        .eq('id', itemId);

      if (error) throw error;

      // Recalculate task progress
      const task = tasks.find(t => t.checklist.some(c => c.id === itemId));
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

      await fetchTasks();
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
  }, [tasks, fetchTasks, toast]);

  const deleteChecklistItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchTasks();
      return true;
    } catch (err: any) {
      console.error('Error deleting checklist item:', err);
      toast({
        title: 'Erro ao excluir item',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTasks, toast]);

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

  const addComment = useCallback(async (taskId: string, content: string): Promise<boolean> => {
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!employee) {
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
          employee_id: employee.id,
          content,
        });

      if (error) throw error;

      await fetchTasks();
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
  }, [user?.id, fetchTasks, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    fetchComments,
    addComment,
  };
}
