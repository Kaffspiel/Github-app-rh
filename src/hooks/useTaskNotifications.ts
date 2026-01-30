import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useTaskNotifications() {
  const { user } = useAuth();

  // Notify collaborator when task is assigned
  const notifyTaskAssigned = useCallback(async (params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assigneeName: string;
    senderName?: string;
  }) => {
    try {
      // Get the employee details for recipient
      const { data: recipient, error: recipientError } = await supabase
        .from('employees')
        .select('id, notify_tasks, notify_in_app, notify_whatsapp, whatsapp_verified, whatsapp_number')
        .eq('id', params.assigneeId)
        .single();

      if (recipientError || !recipient) {
        console.warn('Recipient not found for notification:', params.assigneeId);
        return;
      }

      // Check if notifications are enabled
      if (!recipient.notify_tasks) {
        console.log('Task notifications disabled for this employee');
        return;
      }

      const channels: string[] = [];
      if (recipient.notify_in_app) channels.push('in_app');
      if (recipient.notify_whatsapp && recipient.whatsapp_verified && recipient.whatsapp_number) {
        channels.push('whatsapp');
      }

      if (channels.length === 0) return;

      // Create notification directly in the database
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          type: 'task_assigned',
          title: '📋 Nova Tarefa Atribuída',
          message: `Você recebeu a tarefa "${params.taskTitle}". Acesse o app para ver os detalhes.`,
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

      console.log('Task assigned notification sent to:', params.assigneeName);
    } catch (err) {
      console.error('Error sending task assigned notification:', err);
    }
  }, []);

  // Log progress and optionally notify manager
  const logTaskProgress = useCallback(async (params: {
    taskId: string;
    employeeId: string;
    actionType: 'checklist_completed' | 'task_started' | 'task_completed';
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

  return {
    notifyTaskAssigned,
    logTaskProgress,
    notifyTaskCompleted,
  };
}
