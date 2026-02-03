import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export function useTaskNotifications() {
  const { user } = useAuth();

  const { notifyTask } = useNotifications();

  // Notify collaborator when task is assigned
  const notifyTaskAssigned = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assigneeName: string;
    senderName?: string;
  }) => {
    try {
      // Use the unified notification hook which handles preferences and webhooks
      notifyTask({
        task: {
          id: params.taskId,
          title: params.taskTitle,
          dueDate: "", // Optional in notification
          priority: "média", // Defaults if not passed, or we could fetch
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
    actionType: 'checklist_completed' | 'task_started' | 'task_completed' | 'progress_updated';
    checklistItemId?: string;
    checklistItemText?: string;
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
      // Find managers/admins in the company
      const { data: managers, error: managersError } = await supabase
        .from('employees')
        .select('id, name, notify_tasks, notify_in_app')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managersError || !managers || managers.length === 0) {
        console.log('No managers found to notify');
        return;
      }

      // Create notifications for each manager
      const notifications = managers
        .filter(m => m.notify_tasks && m.notify_in_app)
        .map(manager => ({
          type: 'task_completed' as const,
          title: '✅ Tarefa Concluída',
          message: `${params.employeeName} concluiu a tarefa "${params.taskTitle}".`,
          recipient_id: manager.id,
          sender_name: params.employeeName,
          channels: ['in_app'],
          priority: 'normal' as const,
          related_entity_type: 'task',
          related_entity_id: params.taskId,
          status: 'pending' as const,
          in_app_status: 'delivered',
          in_app_delivered_at: new Date().toISOString(),
        }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
        console.log('Task completed notifications sent to managers');
      }
    } catch (err) {
      console.error('Error notifying managers about task completion:', err);
    }
  }, []);

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
      // Find managers/admins in the company
      const { data: managers, error: managersError } = await supabase
        .from('employees')
        .select('id, name, notify_tasks, notify_in_app')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managersError || !managers || managers.length === 0) {
        return;
      }

      // Create notifications for each manager
      const notifications = managers
        .filter(m => m.notify_tasks && m.notify_in_app)
        .map(manager => ({
          type: 'checklist_completed', // Ensure this types matches DB enum or text
          title: '☑️ Item de Checklist Concluído',
          message: `${params.employeeName} marcou "${params.checklistItemText}" como feito na tarefa "${params.taskTitle}".`,
          recipient_id: manager.id,
          sender_name: params.employeeName,
          channels: ['in_app'],
          priority: 'low',
          related_entity_type: 'task',
          related_entity_id: params.taskId,
          status: 'pending',
          in_app_status: 'delivered',
          in_app_delivered_at: new Date().toISOString(),
        }));

      if (notifications.length > 0) {
        // We cast to any here because 'checklist_completed' might not be in the stricter frontend type definition yet
        // but Postgres usually accepts text if the column is text or if it matches the enum.
        // If it's a strict enum in DB, we'll see an error. Based on migration 20260129... it is an enum.
        // Let's check the enum definition in the migration file.
        // The enum is: 'task_assigned', 'task_due_reminder', 'task_overdue', 'task_completed', 'task_comment', ...
        // It DOES NOT have 'checklist_completed'.
        // I must use 'task_completed' or 'task_comment' or generic. 
        // Or I should use 'task_completed' but with a specific title.
        // Actually, looking at the migration, I can't easily add an enum value without a migration.
        // I will use 'task_comment' as a proxy for "update" or just use 'task_completed' with a clear title.
        // OR better, I should check if I can use a generic type?
        // Let's use 'task_comment' as it is less intrusive than 'task_completed', or maybe 'task_assigned'?
        // No, 'task_comment' seems best fit for "update on a task".

        const safeNotifications = notifications.map(n => ({
          ...n,
          type: 'task_comment' // Fallback to existing enum
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(safeNotifications as any);

        if (error) throw error;
        console.log('Checklist item notifications sent to managers');
      }
    } catch (err) {
      console.error('Error notifying managers about checklist item:', err);
    }
  }, []);

  // Notify manager when task is overdue
  const notifyTaskOverdue = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    employeeName: string;
    companyId: string;
  }) => {
    try {
      // Find managers
      const { data: managers, error: managersError } = await supabase
        .from('employees')
        .select('id, name, notify_tasks, notify_in_app')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managersError || !managers || managers.length === 0) return;

      // Create notifications
      const notifications = managers
        .filter(m => m.notify_tasks && m.notify_in_app)
        .map(manager => ({
          type: 'task_overdue', // Supported by enum
          title: '⚠️ Tarefa Atrasada',
          message: `A tarefa "${params.taskTitle}" de ${params.employeeName} está atrasada.`,
          recipient_id: manager.id,
          sender_name: 'Sistema',
          channels: ['in_app'],
          priority: 'high',
          related_entity_type: 'task',
          related_entity_id: params.taskId,
          status: 'pending',
          in_app_status: 'delivered',
          in_app_delivered_at: new Date().toISOString(),
        }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications as any);

        if (error) throw error;
        console.log('Task overdue notifications sent');
      }
    } catch (err) {
      console.error('Error notifying overdue task:', err);
    }
  }, []);

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
      // Find managers
      const { data: managers, error: managersError } = await supabase
        .from('employees')
        .select('id, name, notify_tasks, notify_in_app')
        .eq('company_id', params.companyId)
        .in('role', ['admin', 'gestor']);

      if (managersError || !managers || managers.length === 0) return;

      // Create notifications
      const notifications = managers
        // .filter(m => m.notify_tasks && m.notify_in_app) // Removed filter: Extension requests are mandatory work items
        .map(manager => ({
          type: 'task_comment', // Using generic type as proxy
          title: '⏳ Pedido de Prorrogação',
          message: `${params.employeeName} pediu mais prazo na tarefa "${params.taskTitle}".\nNova Data: ${params.newDate}\nMotivo: ${params.reason}`,
          // DEBUG: Log
          _debug: console.log('DEBUG: Creating extension notification for', manager.name, manager.id),
          recipient_id: manager.id,
          sender_name: params.employeeName,
          channels: ['in_app'],
          priority: 'high',
          related_entity_type: 'task',
          related_entity_id: params.taskId,
          status: 'pending',
          in_app_status: 'delivered',
          in_app_delivered_at: new Date().toISOString(),
        }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications as any);

        if (error) throw error;
        console.log('Extension request notifications sent');
      }
    } catch (err) {
      console.error('Error notifying extension request:', err);
    }
  }, []);

  // Notify employee when task is updated
  const notifyTaskUpdated = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    senderName?: string;
    changes: string[]; // List of changed fields for the message
  }) => {
    try {
      // Get recipient settings
      const { data: recipient, error: recipientError } = await supabase
        .from('employees')
        .select('id, notify_tasks, notify_in_app, notify_whatsapp, whatsapp_verified, whatsapp_number')
        .eq('id', params.assigneeId)
        .single();

      if (recipientError || !recipient || !recipient.notify_tasks) return;

      const channels: string[] = [];
      if (recipient.notify_in_app) channels.push('in_app');
      if (recipient.notify_whatsapp && recipient.whatsapp_verified && recipient.whatsapp_number) {
        channels.push('whatsapp');
      }

      if (channels.length === 0) return;

      const changeText = params.changes.length > 0
        ? `Alterações em: ${params.changes.join(', ')}`
        : 'Detalhes atualizados';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          type: 'task_comment', // Using generic/comment type as fallback for update
          title: '📝 Tarefa Atualizada',
          message: `A tarefa "${params.taskTitle}" foi atualizada. ${changeText}.`,
          recipient_id: params.assigneeId,
          sender_name: params.senderName || 'Sistema',
          channels,
          priority: 'normal',
          related_entity_type: 'task',
          related_entity_id: params.taskId,
          status: 'pending',
          in_app_status: 'delivered',
          in_app_delivered_at: new Date().toISOString(),
        });

      if (notifError) throw notifError;
      console.log('Task updated notification sent to:', params.assigneeId);
    } catch (err) {
      console.error('Error sending task updated notification:', err);
    }
  }, []);

  return {
    notifyTaskAssigned,
    logTaskProgress,
    notifyTaskCompleted,
    notifyChecklistItemCompleted,
    notifyTaskOverdue,
    notifyExtensionRequest,
    notifyTaskUpdated
  };
}
