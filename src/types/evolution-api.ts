// Tipos específicos para integração com Evolution API via n8n

import type { NotificationType } from "./notifications";

// === PAYLOADS DE ENVIO (App -> n8n -> Evolution) ===

export type EvolutionMessageType = "text" | "image" | "document" | "buttons" | "list";

export interface TextMessage {
  message: string;
}

export interface ImageMessage {
  url: string;
  caption?: string;
}

export interface DocumentMessage {
  url: string;
  fileName: string;
  caption?: string;
}

export interface ReplyButton {
  type: "reply";
  reply: {
    id: string;
    title: string;  // Máximo 20 caracteres
  };
}

export interface ButtonsMessage {
  title: string;
  description?: string;
  footer?: string;
  buttons: ReplyButton[];  // Máximo 3 botões
}

export interface ListRow {
  rowId: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];  // Máximo 10 itens por seção
}

export interface ListMessage {
  title: string;
  description: string;
  buttonText: string;
  footerText?: string;
  sections: ListSection[];  // Máximo 10 seções
}

export interface EvolutionMetadata {
  notificationId: string;
  notificationType: NotificationType;
}

// Payload principal para envio via n8n
export interface EvolutionSendMessagePayload {
  instanceName: string;       // Nome da instância no Evolution
  number: string;             // Formato: 5511999999999 (sem + ou espaços)
  
  messageType: EvolutionMessageType;
  
  // Conteúdo (apenas um será preenchido, conforme messageType)
  text?: TextMessage;
  image?: ImageMessage;
  document?: DocumentMessage;
  buttons?: ButtonsMessage;
  list?: ListMessage;
  
  // Metadados para tracking
  metadata?: EvolutionMetadata;
}

// === WEBHOOKS RECEBIDOS (Evolution -> n8n -> App) ===

export type EvolutionEventType = 
  | "messages.upsert"       // Nova mensagem recebida
  | "messages.update"       // Atualização de status (enviado, entregue, lido)
  | "connection.update";    // Status da conexão

export type EvolutionMessageStatus = 
  | "PENDING"       // Aguardando envio
  | "SERVER_ACK"    // Recebido pelo servidor WhatsApp
  | "DELIVERY_ACK"  // Entregue ao destinatário
  | "READ";         // Lido pelo destinatário

export interface EvolutionMessageKey {
  remoteJid: string;    // Formato: 5511999999999@s.whatsapp.net
  fromMe: boolean;      // true se enviada por nós
  id: string;           // ID único da mensagem
}

export interface EvolutionTextContent {
  conversation?: string;  // Texto simples
  extendedTextMessage?: {
    text: string;
  };
}

export interface EvolutionButtonResponse {
  selectedButtonId: string;
}

export interface EvolutionListResponse {
  singleSelectReply: {
    selectedRowId: string;
  };
}

export interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text: string;
  };
  buttonsResponseMessage?: EvolutionButtonResponse;
  listResponseMessage?: EvolutionListResponse;
}

export interface EvolutionMessageData {
  key: EvolutionMessageKey;
  pushName?: string;                    // Nome do contato
  message?: EvolutionMessageContent;
  messageTimestamp: number;
  status?: EvolutionMessageStatus;
}

// Payload recebido do webhook Evolution (via n8n)
export interface EvolutionWebhookPayload {
  event: EvolutionEventType;
  instance: string;
  data?: EvolutionMessageData;
}

// === HELPERS ===

// Converte número para formato remoteJid
export const createJidFromPhone = (phone: string): string => {
  // Remove qualquer caractere não numérico
  const cleanPhone = phone.replace(/\D/g, "");
  return `${cleanPhone}@s.whatsapp.net`;
};

// Extrai número do remoteJid
export const extractPhoneFromJid = (jid: string): string => {
  return jid.replace("@s.whatsapp.net", "").replace("@c.us", "");
};

// Mapeia status Evolution para status interno
export const mapEvolutionStatus = (
  status: EvolutionMessageStatus
): "pending" | "sent" | "delivered" | "read" => {
  const statusMap: Record<EvolutionMessageStatus, "pending" | "sent" | "delivered" | "read"> = {
    PENDING: "pending",
    SERVER_ACK: "sent",
    DELIVERY_ACK: "delivered",
    READ: "read",
  };
  return statusMap[status];
};

// Extrai resposta de botão
export const extractButtonResponse = (
  message: EvolutionMessageContent | undefined
): string | null => {
  return message?.buttonsResponseMessage?.selectedButtonId || null;
};

// Extrai resposta de lista
export const extractListResponse = (
  message: EvolutionMessageContent | undefined
): string | null => {
  return message?.listResponseMessage?.singleSelectReply?.selectedRowId || null;
};

// Extrai texto da mensagem
export const extractMessageText = (
  message: EvolutionMessageContent | undefined
): string | null => {
  if (!message) return null;
  return message.conversation || message.extendedTextMessage?.text || null;
};

// Limites da Evolution API
export const EVOLUTION_LIMITS = {
  BUTTON_TITLE_MAX_LENGTH: 20,
  MAX_BUTTONS: 3,
  MAX_LIST_SECTIONS: 10,
  MAX_LIST_ROWS_PER_SECTION: 10,
  MAX_TEXT_LENGTH: 4096,
} as const;

// Valida título de botão
export const validateButtonTitle = (title: string): boolean => {
  return title.length <= EVOLUTION_LIMITS.BUTTON_TITLE_MAX_LENGTH;
};

// Trunca título de botão se necessário
export const truncateButtonTitle = (title: string): string => {
  if (title.length <= EVOLUTION_LIMITS.BUTTON_TITLE_MAX_LENGTH) {
    return title;
  }
  return title.substring(0, EVOLUTION_LIMITS.BUTTON_TITLE_MAX_LENGTH - 3) + "...";
};
