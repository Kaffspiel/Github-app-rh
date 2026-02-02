import { useCallback } from "react";
import { useNotificationContext } from "@/context/NotificationContext";
import { notificationService } from "@/services/notificationService";
import type {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@/types/notifications";
import type { Task } from "@/context/AppContext";

interface NotifyParams {
  type: NotificationType;
  recipientId: string;
  title?: string;
  message?: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  relatedEntity?: {
    type: "task" | "timeRecord" | "announcement";
    id: string;
  };
  variables?: Record<string, string>;
  senderId?: string;
  senderName?: string;
}

interface NotifyTaskParams {
  task: Task;
  recipientId: string;
  type: Extract<NotificationType, "task_assigned" | "task_due_reminder" | "task_overdue" | "task_completed" | "task_comment">;
  comment?: string;
  senderId?: string;
  senderName?: string;
}

interface NotifyClockParams {
  recipientId: string;
  type: Extract<NotificationType, "clock_reminder" | "clock_anomaly" | "justification_required" | "justification_response">;
  data?: {
    horario?: string;
    descricao?: string;
    data?: string;
    status?: string;
    mensagem?: string;
  };
}

export const useNotifications = () => {
  const {
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateDeliveryStatus,
    addToQueue,
    getUnreadCount,
    getNotificationsByRecipient,
    getEmployeeById,
    notifications,
    employees,
  } = useNotificationContext();

  // Notificação genérica
  const notify = useCallback(
    (params: NotifyParams) => {
      const employee = getEmployeeById(params.recipientId);
      if (!employee) {
        console.warn(`Employee not found: ${params.recipientId}`);
        return null;
      }

      // Valida preferências
      const validation = notificationService.validateRecipient(employee, params.type);
      if (!validation.canSend) {
        console.log(`Notification blocked: ${validation.reason}`);
        return null;
      }

      // Processa template
      const variables = {
        nome: employee.name,
        ...params.variables,
      };
      const processed = notificationService.processTemplate(params.type, variables);

      // Determina canais baseado nas preferências
      const channels = params.channels || validation.allowedChannels;

      // Cria notificação
      const notification = createNotification({
        type: params.type,
        title: params.title || processed.title,
        message: params.message || processed.message,
        recipientId: params.recipientId,
        senderId: params.senderId,
        senderName: params.senderName,
        channels,
        priority: params.priority || processed.priority,
        relatedEntity: params.relatedEntity,
      });

      // Se WhatsApp está habilitado, prepara payload para n8n
      if (channels.includes("whatsapp") && employee.whatsapp.isVerified) {
        const payload = notificationService.prepareEvolutionPayload({
          instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE || "teste",
          recipientPhone: employee.whatsapp.number,
          type: params.type,
          message: processed.message,
          notificationId: notification.id,
          buttons: processed.buttons,
        });

        addToQueue({
          notificationId: notification.id,
          webhookUrl: notificationService.getWebhookUrl("send"),
          payload,
          status: "queued",
          attempts: 0,
          maxAttempts: 3,
        });
      }

      return notification;
    },
    [createNotification, getEmployeeById, addToQueue]
  );

  // Notificação de tarefa
  const notifyTask = useCallback(
    (params: NotifyTaskParams) => {
      const { task, recipientId, type, comment, senderId, senderName } = params;

      const priorityMap: Record<string, string> = {
        alta: "Alta 🔴",
        média: "Média 🟡",
        baixa: "Baixa 🟢",
      };

      const variables: Record<string, string> = {
        tarefa: task.title,
        prazo: task.dueDate,
        prioridade: priorityMap[task.priority] || task.priority,
        responsavel: task.assignee,
      };

      if (comment) {
        variables.comentario = comment;
        variables.autor = senderName || "Alguém";
      }

      return notify({
        type,
        recipientId,
        variables,
        relatedEntity: { type: "task", id: task.id },
        senderId,
        senderName,
      });
    },
    [notify]
  );

  // Notificação de ponto
  const notifyClock = useCallback(
    (params: NotifyClockParams) => {
      const { recipientId, type, data } = params;

      return notify({
        type,
        recipientId,
        variables: {
          horario: data?.horario || "",
          descricao: data?.descricao || "",
          data: data?.data || "",
          status: data?.status || "",
          mensagem: data?.mensagem || "",
        },
        relatedEntity: { type: "timeRecord", id: "" },
      });
    },
    [notify]
  );

  // Notificação em lote
  const notifyMany = useCallback(
    (recipientIds: string[], params: Omit<NotifyParams, "recipientId">) => {
      return recipientIds.map((recipientId) =>
        notify({ ...params, recipientId })
      ).filter(Boolean);
    },
    [notify]
  );

  // Comunicado geral
  const sendAnnouncement = useCallback(
    (params: {
      title: string;
      message: string;
      recipientIds?: string[];
      senderId?: string;
      senderName?: string;
    }) => {
      const recipients = params.recipientIds || employees.map((e) => e.id);

      return notifyMany(recipients, {
        type: "announcement",
        variables: {
          titulo: params.title,
          mensagem: params.message,
          remetente: params.senderName || "Sistema",
        },
        senderId: params.senderId,
        senderName: params.senderName,
      });
    },
    [notifyMany, employees]
  );

  return {
    // Funções de disparo
    notify,
    notifyTask,
    notifyClock,
    notifyMany,
    sendAnnouncement,

    // Gerenciamento
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateDeliveryStatus,

    // Consultas
    getUnreadCount,
    getNotificationsByRecipient,
    notifications,
    employees,
  };
};
