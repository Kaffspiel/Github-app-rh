// Tipos de notificação do sistema

export type NotificationType =
  | "task_assigned"
  | "task_due_reminder"
  | "task_overdue"
  | "task_completed"
  | "task_comment"
  | "clock_reminder"
  | "clock_anomaly"
  | "justification_required"
  | "justification_response"
  | "announcement"
  | "gamification_badge";

export type NotificationChannel = "whatsapp" | "in_app";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationStatus = "pending" | "queued" | "sent" | "delivered" | "read" | "failed";

export interface WhatsAppDeliveryStatus {
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  messageId?: string;         // ID retornado pela Evolution API
  instanceName?: string;      // Instância Evolution usada
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
}

export interface InAppDeliveryStatus {
  status: "pending" | "delivered" | "read";
  deliveredAt?: string;
  readAt?: string;
}

export interface DeliveryStatus {
  whatsapp?: WhatsAppDeliveryStatus;
  in_app?: InAppDeliveryStatus;
}

export interface RelatedEntity {
  type: "task" | "timeRecord" | "announcement";
  id: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;

  // Destinatário
  recipientId: string;
  recipientPhone: string;     // Para WhatsApp (formato: 5511999999999)

  // Remetente (opcional)
  senderId?: string;
  senderName?: string;

  // Canais de envio
  channels: NotificationChannel[];
  priority: NotificationPriority;

  // Entidade relacionada (para deep link)
  relatedEntity?: RelatedEntity;

  // Status geral
  status: NotificationStatus;

  // Status por canal
  deliveryStatus: DeliveryStatus;

  // Timestamps
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
}

// Templates de Mensagem

export type ButtonAction = "open_task" | "confirm" | "reject" | "snooze";

export interface ButtonTemplate {
  id: string;
  title: string;        // Máximo 20 caracteres (limite Evolution API)
  action: ButtonAction;
}

export interface ButtonsTemplate {
  title: string;
  buttons: ButtonTemplate[];
}

export interface MessageTemplate {
  id: string;
  type: NotificationType;
  name: string;

  // Template de texto (suporta variáveis: {{nome}}, {{tarefa}}, etc.)
  textTemplate: string;

  // Template com botões (opcional)
  buttonsTemplate?: ButtonsTemplate;

  // Configuração
  defaultPriority: NotificationPriority;
  isActive: boolean;
}

// Templates padrão do sistema
export const defaultTemplates: MessageTemplate[] = [
  {
    id: "task_assigned",
    type: "task_assigned",
    name: "Nova Tarefa Atribuída",
    textTemplate: "Olá {{nome}}! Você recebeu uma nova tarefa:\n\n*{{tarefa}}*\n\nPrazo: {{prazo}}\nPrioridade: {{prioridade}}",
    buttonsTemplate: {
      title: "O que deseja fazer?",
      buttons: [
        { id: "ver", title: "Ver Tarefa", action: "open_task" },
        { id: "ok", title: "Entendido", action: "confirm" },
      ],
    },
    defaultPriority: "normal",
    isActive: true,
  },
  {
    id: "task_due_reminder",
    type: "task_due_reminder",
    name: "Lembrete de Prazo",
    textTemplate: "Olá {{nome}}! Lembrete: a tarefa *{{tarefa}}* vence em {{tempo}}.\n\nPrazo: {{prazo}}",
    buttonsTemplate: {
      title: "Ações:",
      buttons: [
        { id: "ver", title: "Ver Tarefa", action: "open_task" },
        { id: "snooze", title: "Lembrar depois", action: "snooze" },
      ],
    },
    defaultPriority: "normal",
    isActive: true,
  },
  {
    id: "task_overdue",
    type: "task_overdue",
    name: "Tarefa Atrasada",
    textTemplate: "⚠️ Atenção {{nome}}! A tarefa abaixo está atrasada:\n\n*{{tarefa}}*\n\nPrazo era: {{prazo}}",
    buttonsTemplate: {
      title: "Ação necessária:",
      buttons: [
        { id: "ver", title: "Ver Tarefa", action: "open_task" },
      ],
    },
    defaultPriority: "high",
    isActive: true,
  },
  {
    id: "task_completed",
    type: "task_completed",
    name: "Tarefa Concluída",
    textTemplate: "✅ {{nome}}, a tarefa *{{tarefa}}* foi concluída por {{responsavel}}.",
    defaultPriority: "low",
    isActive: true,
  },
  {
    id: "task_comment",
    type: "task_comment",
    name: "Novo Comentário",
    textTemplate: "💬 {{autor}} comentou na tarefa *{{tarefa}}*:\n\n\"{{comentario}}\"",
    buttonsTemplate: {
      title: "Responder:",
      buttons: [
        { id: "ver", title: "Ver Tarefa", action: "open_task" },
      ],
    },
    defaultPriority: "normal",
    isActive: true,
  },
  {
    id: "clock_reminder",
    type: "clock_reminder",
    name: "Lembrete de Ponto",
    textTemplate: "⏰ Olá {{nome}}! Não esqueça de bater o ponto.\n\nHorário previsto: {{horario}}",
    buttonsTemplate: {
      title: "Confirmar:",
      buttons: [
        { id: "ok", title: "Entendido", action: "confirm" },
      ],
    },
    defaultPriority: "normal",
    isActive: true,
  },
  {
    id: "clock_anomaly",
    type: "clock_anomaly",
    name: "Anomalia de Ponto",
    textTemplate: "⚠️ {{nome}}, identificamos uma anomalia no seu ponto:\n\n{{descricao}}\n\nData: {{data}}",
    buttonsTemplate: {
      title: "O que deseja fazer?",
      buttons: [
        { id: "justificar", title: "Justificar", action: "open_task" },
      ],
    },
    defaultPriority: "high",
    isActive: true,
  },
  {
    id: "justification_required",
    type: "justification_required",
    name: "Justificativa Necessária",
    textTemplate: "📝 {{nome}}, você precisa justificar a ocorrência:\n\n{{descricao}}\n\nData: {{data}}",
    buttonsTemplate: {
      title: "Ação:",
      buttons: [
        { id: "justificar", title: "Justificar agora", action: "open_task" },
      ],
    },
    defaultPriority: "high",
    isActive: true,
  },
  {
    id: "justification_response",
    type: "justification_response",
    name: "Resposta de Justificativa",
    textTemplate: "{{nome}}, sua justificativa foi {{status}}.\n\n{{mensagem}}",
    defaultPriority: "normal",
    isActive: true,
  },
  {
    id: "announcement",
    type: "announcement",
    name: "Comunicado",
    textTemplate: "📢 *{{titulo}}*\n\n{{mensagem}}\n\n— {{remetente}}",
    defaultPriority: "normal",
    isActive: true,
  },
  {
    id: "gamification_badge",
    type: "gamification_badge",
    name: "Nova Conquista",
    textTemplate: "🏆 Parabéns {{nome}}! Você conquistou:\n\n*{{badge}}*\n\n{{descricao}}",
    defaultPriority: "low",
    isActive: true,
  },
];

// Fila de Notificações (para processamento n8n)

export type QueueStatus = "queued" | "processing" | "completed" | "sent" | "failed" | "retrying";

export interface QueueResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface NotificationQueueItem {
  id: string;
  notificationId: string;

  // Webhook n8n
  webhookUrl: string;

  // Payload para Evolution API
  payload: import("./evolution-api").EvolutionSendMessagePayload;

  // Controle
  status: QueueStatus;
  attempts: number;
  maxAttempts: number;

  // Resposta do webhook
  response?: QueueResponse;

  // Timestamps
  createdAt: string;
  processedAt?: string;
  nextRetryAt?: string;
}

// Categorias de notificação para preferências
export const notificationCategories: Record<string, NotificationType[]> = {
  tasks: ["task_assigned", "task_due_reminder", "task_overdue", "task_completed", "task_comment"],
  timeTracking: ["clock_reminder", "clock_anomaly", "justification_required", "justification_response"],
  reminders: ["task_due_reminder", "clock_reminder"],
  announcements: ["announcement", "gamification_badge"],
};
