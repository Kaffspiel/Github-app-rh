import type { Employee } from "@/types/employee";
import type {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@/types/notifications";
import {
  defaultTemplates as templates,
  notificationCategories,
} from "@/types/notifications";
import type { EvolutionSendMessagePayload } from "@/types/evolution-api";
import { truncateButtonTitle, EVOLUTION_LIMITS } from "@/types/evolution-api";
// URLs dos webhooks n8n (configurar conforme ambiente)
const N8N_WEBHOOKS = {
  send: import.meta.env.VITE_N8N_WEBHOOK_SEND || "https://n8n.kaffspiel.cloud/webhook/opscontrol-send",
  status: import.meta.env.VITE_N8N_WEBHOOK_STATUS || "https://n8n.kaffspiel.cloud/webhook/opscontrol-status",
};

interface ValidationResult {
  canSend: boolean;
  reason?: string;
  allowedChannels: NotificationChannel[];
}

interface ProcessedTemplate {
  title: string;
  message: string;
  priority: NotificationPriority;
  buttons?: Array<{ id: string; title: string }>;
}

interface PreparePayloadParams {
  instanceName: string;
  recipientPhone: string;
  type: NotificationType;
  message: string;
  notificationId: string;
  buttons?: Array<{ id: string; title: string }>;
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
}

// Verifica se está no horário silencioso
const isInQuietHours = (
  quietStart?: string,
  quietEnd?: string
): boolean => {
  if (!quietStart || !quietEnd) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietStart.split(":").map(Number);
  const [endHour, endMin] = quietEnd.split(":").map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Horário silencioso cruza meia-noite (ex: 22:00 - 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
};

// Verifica categoria da notificação
const getNotificationCategory = (type: NotificationType): string | null => {
  for (const [category, types] of Object.entries(notificationCategories)) {
    if (types.includes(type)) {
      return category;
    }
  }
  return null;
};

export const notificationService = {
  // Valida se pode enviar para o destinatário
  validateRecipient: (
    employee: Employee,
    type: NotificationType
  ): ValidationResult => {
    if (!employee.isActive) {
      return {
        canSend: false,
        reason: "Colaborador inativo",
        allowedChannels: [],
      };
    }

    const prefs = employee.notificationPreferences;
    const category = getNotificationCategory(type);
    const allowedChannels: NotificationChannel[] = [];

    // Verifica preferência de categoria
    if (category && !prefs.categories[category as keyof typeof prefs.categories]) {
      return {
        canSend: false,
        reason: `Categoria ${category} desabilitada pelo usuário`,
        allowedChannels: [],
      };
    }

    // Isenção automática de notificações de ponto para isentos de ponto
    if (category === "timeTracking" && employee.skipTimeTracking) {
      return {
        canSend: false,
        reason: "Colaborador isento de controle de ponto",
        allowedChannels: [],
      };
    }

    // Verifica horário silencioso (apenas para WhatsApp)
    const inQuietHours = isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd);

    // In-app sempre permitido se habilitado
    if (prefs.enableInApp) {
      allowedChannels.push("in_app");
    }

    const whatsapp = employee?.whatsapp;
    let hasValidPhone = false;
    if (whatsapp !== undefined && whatsapp !== null && whatsapp.number) {
      hasValidPhone = notificationService.isValidBrazilianPhone(whatsapp.number);
    }

    if (prefs.enableWhatsApp && !inQuietHours && (whatsapp?.isVerified || hasValidPhone)) {
      allowedChannels.push("whatsapp");
    }

    if (allowedChannels.length === 0) {
      return {
        canSend: false,
        reason: inQuietHours
          ? "Horário silencioso ativo"
          : "Todos os canais desabilitados",
        allowedChannels: [],
      };
    }

    return {
      canSend: true,
      allowedChannels,
    };
  },

  // Processa template com variáveis
  processTemplate: (
    type: NotificationType,
    variables: Record<string, string>
  ): ProcessedTemplate => {
    const template = templates.find((t) => t.type === type);

    if (!template) {
      return {
        title: "Notificação",
        message: variables.mensagem || "Você tem uma nova notificação.",
        priority: "normal",
      };
    }

    // Substitui variáveis no template
    let message = template.textTemplate;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, "g"), value || "");
    }

    // Prepara botões se existirem
    let buttons: Array<{ id: string; title: string }> | undefined;
    if (template.buttonsTemplate) {
      buttons = template.buttonsTemplate.buttons.map((btn) => ({
        id: btn.id,
        title: truncateButtonTitle(btn.title),
      }));
    }

    return {
      title: template.name,
      message,
      priority: template.defaultPriority,
      buttons,
    };
  },

  // Prepara payload para Evolution API
  prepareEvolutionPayload: (params: PreparePayloadParams): EvolutionSendMessagePayload => {
    const { instanceName, recipientPhone, type, message, notificationId, buttons, imageUrl, documentUrl, documentName } = params;

    // Limpa número do telefone
    const cleanPhone = recipientPhone.replace(/\D/g, "");

    // Determina tipo de mensagem
    if (imageUrl) {
      return {
        instanceName,
        number: cleanPhone,
        messageType: "image",
        image: {
          url: imageUrl,
          caption: message.substring(0, 1024), // Limite de caption
        },
        metadata: {
          notificationId,
          notificationType: type,
        },
      };
    }

    if (documentUrl && documentName) {
      return {
        instanceName,
        number: cleanPhone,
        messageType: "document",
        document: {
          url: documentUrl,
          fileName: documentName,
          caption: message.substring(0, 1024),
        },
        metadata: {
          notificationId,
          notificationType: type,
        },
      };
    }

    // CONVERSION TO TEXT: Buttons are failing on some devices, so we convert them to text options.
    let textMessage = message;
    if (buttons && buttons.length > 0) {
      const limitedButtons = buttons.slice(0, EVOLUTION_LIMITS.MAX_BUTTONS);

      // Append options to the message
      textMessage += "\n\nOpções disponíveis:";
      limitedButtons.forEach(btn => {
        textMessage += `\n- ${btn.title}`;
      });

      // Add instruction for interaction
      textMessage += "\n(Responda com a opção desejada)";
    }

    // Always return as text
    return {
      instanceName,
      number: cleanPhone,
      messageType: "text",
      text: {
        message: textMessage.substring(0, EVOLUTION_LIMITS.MAX_TEXT_LENGTH),
      },
      metadata: {
        notificationId,
        notificationType: type,
      },
    };
  },

  // Retorna URL do webhook n8n
  getWebhookUrl: (type: "send" | "status"): string => {
    return N8N_WEBHOOKS[type];
  },

  // Formata número para WhatsApp
  formatPhoneNumber: (phone: string): string => {
    return phone.replace(/\D/g, "");
  },

  // Valida número WhatsApp (formato brasileiro)
  isValidBrazilianPhone: (phone: string): boolean => {
    const clean = phone.replace(/\D/g, "");
    // Formato: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
    return /^55\d{10,11}$/.test(clean);
  },
};
