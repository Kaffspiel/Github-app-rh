import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export function useTaskNotifications() {
  const { user } = useAuth();

  const { notifyTask, notify } = useNotifications();

  // Notify collaborator when task is assigned
  const notifyTaskAssigned = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assigneeName: string;
    dueDate?: string;
    priority?: string;
    senderName?: string;
  }) => {
    try {
      // Use the unified notification hook which handles preferences and webhooks
      notifyTask({
        task: {
          id: params.taskId,
          title: params.taskTitle,
          dueDate: params.dueDate || "",
          priority: params.priority || "média",
          assignee: params.assigneeName
        } as any, // Partial task object is sufficient for the template
        recipientId: params.assigneeId,
        type: "task_assigned",
        senderName: params.senderName
      });

      console.log('Task assigned notification sent (queued) to:', params.assigneeName);
    } catch (err) {
      console.error('Error sending task assigned notification:', err);
    }
  }, [notifyTask]);

  // Log progress and optionally notify manager
  const logTaskProgress = useCallback(async (params: {
    taskId: string;
    employeeId: string;
    actionType: 'checklist_completed' | 'task_started' | 'task_completed' | 'progress_updated' | 'task_cancelled' | 'task_updated';
    checklistItemId?: string;
    checklistItemText?: string;
    oldValue?: any;
    newValue?: any;
  }) => {
    try {
      // Insert progress log
      const { error } = await supabase
        .from('task_progress_logs')
        .insert({
          task_id: params.taskId,
          employee_id: params.employeeId,
          action_type: params.actionType,
          checklist_item_id: params.checklistItemId,
          checklist_item_text: params.checklistItemText,
          old_value: params.oldValue,
          new_value: params.newValue,
        });

      if (error) throw error;
      console.log('Task progress logged:', params.actionType);
    } catch (err) {
      console.error('Error logging task progress:', err);
    }
  }, []);

  // Notify manager immediately when task is completed
  const notifyTaskCompleted = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    employeeId: string;
    employeeName: string;
    companyId: string;
  }) => {
    try {
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managers) {
        managers.forEach(manager => {
          notifyTask({
            task: { id: params.taskId, title: params.taskTitle } as any,
            recipientId: manager.id,
            type: "task_completed",
            senderName: params.employeeName
          });
        });
      }
    } catch (err) {
      console.error('Error notifying managers about task completion:', err);
    }
  }, [notifyTask]);

  // Notify manager when a checklist item is completed
  const notifyChecklistItemCompleted = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    employeeId: string;
    employeeName: string;
    companyId: string;
    checklistItemText: string;
  }) => {
    try {
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managers) {
        managers.forEach(manager => {
          // Use generic notify for routine_item_completed
          notify({
            type: 'routine_item_completed',
            recipientId: manager.id,
            variables: {
              colaborador: params.employeeName,
              item: params.checklistItemText,
              rotina: params.taskTitle
            },
            relatedEntity: { type: 'task', id: params.taskId },
            senderName: params.employeeName
          });
        });
      }
    } catch (err) {
      console.error('Error notifying managers about checklist item:', err);
    }
  }, []);

  // Notify manager and collaborator when task is overdue
  const notifyTaskOverdue = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    employeeName: string;
    assigneeId: string; // Adicionado assigneeId
    companyId: string;
    dueDate: string; // Adicionado dueDate
  }) => {
    try {
      // 1. Notify the collaborator responsible for the task
      notifyTask({
        task: {
          id: params.taskId,
          title: params.taskTitle,
          dueDate: params.dueDate,
          assignee: params.employeeName
        } as any,
        recipientId: params.assigneeId,
        type: "task_overdue",
        senderName: "Sistema"
      });

      // 2. Notify managers
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managers) {
        managers.forEach(manager => {
          if (manager.id !== params.assigneeId) { // Evita duplicar se o gestor for o responsável
            notifyTask({
              task: {
                id: params.taskId,
                title: params.taskTitle,
                dueDate: params.dueDate,
                assignee: params.employeeName
              } as any,
              recipientId: manager.id,
              type: "task_overdue",
              senderName: "Sistema"
            });
          }
        });
      }
    } catch (err) {
      console.error('Error notifying overdue task:', err);
    }
  }, [notifyTask]);

  // Notify manager about extension request
  const notifyExtensionRequest = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    employeeName: string;
    companyId: string;
    newDate: string;
    reason: string;
  }) => {
    try {
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managers) {
        managers.forEach(manager => {
          notifyTask({
            task: { id: params.taskId, title: params.taskTitle } as any,
            recipientId: manager.id,
            type: "task_comment",
            comment: `⏳ Pedido de Prorrogação\nNova Data: ${params.newDate}\nMotivo: ${params.reason}`,
            senderName: params.employeeName
          });
        });
      }
    } catch (err) {
      console.error('Error notifying extension request:', err);
    }
  }, [notifyTask]);

  // Notify employee when task is updated
  const notifyTaskUpdated = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    senderName?: string;
    changes: string[];
  }) => {
    try {
      const changeText = params.changes.length > 0
        ? `Alterações em: ${params.changes.join(', ')}`
        : 'Detalhes atualizados';

      notifyTask({
        task: { id: params.taskId, title: params.taskTitle } as any,
        recipientId: params.assigneeId,
        type: "task_comment",
        comment: changeText,
        senderName: params.senderName || 'Sistema'
      });
    } catch (err) {
      console.error('Error sending task updated notification:', err);
    }
  }, [notifyTask]);

  // Notify managers when any task is created
  const notifyTaskCreated = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    companyId: string;
    senderName?: string;
  }) => {
    try {
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managers) {
        managers.forEach(manager => {
          // We can use task_assigned as a proxy or just task_comment
          notifyTask({
            task: { id: params.taskId, title: params.taskTitle } as any,
            recipientId: manager.id,
            type: "task_comment", // "Nova tarefa criada no sistema"
            comment: `📢 Nova tarefa criada: ${params.taskTitle}`,
            senderName: params.senderName || 'Sistema'
          });
        });
      }
    } catch (err) {
      console.error('Error notifying managers about new task:', err);
    }
  }, [notifyTask]);

  // Notify employee when task is cancelled
  const notifyTaskCancelled = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    senderName?: string;
  }) => {
    try {
      notifyTask({
        task: { 
          id: params.taskId, 
          title: params.taskTitle 
        } as any,
        recipientId: params.assigneeId,
        type: "task_cancelled",
        senderName: params.senderName || 'Sistema'
      });
    } catch (err) {
      console.error('Error sending task cancelled notification:', err);
    }
  }, [notifyTask]);

  return {
    notifyTaskAssigned,
    notifyTaskCreated,
    logTaskProgress,
    notifyTaskCompleted,
    notifyChecklistItemCompleted,
    notifyTaskOverdue,
    notifyExtensionRequest,
    notifyTaskUpdated,
    notifyTaskCancelled
  };
}
