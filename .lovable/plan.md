
# Estrutura de Dados para Notificações com Evolution API + n8n

## Visao Geral

Estrutura otimizada para integrar com **Evolution API** (WhatsApp) via **n8n**, suportando:
- Envio de mensagens de texto, imagens e documentos
- Recebimento de respostas dos colaboradores
- Webhooks bidirecionais (app -> n8n -> Evolution -> WhatsApp)

---

## Arquivos a Criar

```text
src/
├── types/
│   ├── employee.ts           # Interface Employee com dados WhatsApp
│   ├── notifications.ts      # Tipos de notificacao e mensagem
│   └── evolution-api.ts      # Tipos especificos da Evolution API
├── context/
│   └── NotificationContext.tsx
├── hooks/
│   └── useNotifications.ts
└── services/
    └── notificationService.ts
```

---

## Estruturas de Dados

### 1. Employee (Colaborador)
```typescript
interface Employee {
  id: string;
  name: string;
  email: string;
  role: "colaborador" | "gestor" | "admin";
  department: string;
  isActive: boolean;
  
  // WhatsApp (Evolution API)
  whatsapp: {
    number: string;           // 5511999999999 (sem +)
    isVerified: boolean;      // Numero validado
    lastSeen?: string;        // Ultima interacao
    profilePicUrl?: string;   // Foto do perfil
  };
  
  // Preferencias
  notificationPreferences: {
    enableWhatsApp: boolean;
    enableInApp: boolean;
    quietHoursStart?: string; // "22:00"
    quietHoursEnd?: string;   // "07:00"
    categories: {
      tasks: boolean;
      timeTracking: boolean;
      reminders: boolean;
      announcements: boolean;
    };
  };
}
```

### 2. Notification (Notificacao)
```typescript
type NotificationType =
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

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // Destinatario
  recipientId: string;
  recipientPhone: string;     // Para WhatsApp
  
  // Remetente
  senderId?: string;
  senderName?: string;
  
  // Canais
  channels: ("whatsapp" | "in_app")[];
  priority: "low" | "normal" | "high" | "urgent";
  
  // Entidade relacionada (para deep link)
  relatedEntity?: {
    type: "task" | "timeRecord" | "announcement";
    id: string;
  };
  
  // Status
  status: "pending" | "queued" | "sent" | "delivered" | "read" | "failed";
  
  // Status por canal
  deliveryStatus: {
    whatsapp?: WhatsAppDeliveryStatus;
    in_app?: InAppDeliveryStatus;
  };
  
  // Timestamps
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
}

interface WhatsAppDeliveryStatus {
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  messageId?: string;         // ID retornado pela Evolution
  instanceName?: string;      // Instancia Evolution usada
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
}

interface InAppDeliveryStatus {
  status: "pending" | "delivered" | "read";
  deliveredAt?: string;
  readAt?: string;
}
```

### 3. Evolution API Types (Payloads para n8n)
```typescript
// Payload para enviar mensagem via n8n -> Evolution
interface EvolutionSendMessagePayload {
  instanceName: string;       // Nome da instancia no Evolution
  number: string;             // 5511999999999
  
  // Tipo de mensagem
  messageType: "text" | "image" | "document" | "buttons" | "list";
  
  // Conteudo (varia por tipo)
  text?: {
    message: string;
  };
  
  image?: {
    url: string;
    caption?: string;
  };
  
  document?: {
    url: string;
    fileName: string;
    caption?: string;
  };
  
  // Botoes interativos
  buttons?: {
    title: string;
    description?: string;
    footer?: string;
    buttons: Array<{
      type: "reply";
      reply: {
        id: string;
        title: string;        // Max 20 chars
      };
    }>;
  };
  
  // Lista de opcoes
  list?: {
    title: string;
    description: string;
    buttonText: string;
    footerText?: string;
    sections: Array<{
      title: string;
      rows: Array<{
        rowId: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
  
  // Metadados para tracking
  metadata?: {
    notificationId: string;
    notificationType: NotificationType;
  };
}

// Webhook recebido do Evolution (via n8n)
interface EvolutionWebhookPayload {
  event: "messages.upsert" | "messages.update" | "connection.update";
  instance: string;
  
  // Para mensagens recebidas/atualizadas
  data?: {
    key: {
      remoteJid: string;      // 5511999999999@s.whatsapp.net
      fromMe: boolean;
      id: string;
    };
    pushName?: string;        // Nome do contato
    message?: {
      conversation?: string;  // Texto simples
      extendedTextMessage?: {
        text: string;
      };
      buttonsResponseMessage?: {
        selectedButtonId: string;
      };
      listResponseMessage?: {
        singleSelectReply: {
          selectedRowId: string;
        };
      };
    };
    messageTimestamp: number;
    status?: "PENDING" | "SERVER_ACK" | "DELIVERY_ACK" | "READ";
  };
}
```

### 4. Notification Queue (Fila para n8n)
```typescript
interface NotificationQueueItem {
  id: string;
  notificationId: string;
  
  // Webhook n8n
  webhookUrl: string;         // URL do workflow n8n
  
  // Payload Evolution
  payload: EvolutionSendMessagePayload;
  
  // Controle
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  
  // Resposta
  response?: {
    success: boolean;
    messageId?: string;
    error?: string;
    timestamp: string;
  };
  
  createdAt: string;
  processedAt?: string;
  nextRetryAt?: string;
}
```

### 5. Templates de Mensagem
```typescript
interface MessageTemplate {
  id: string;
  type: NotificationType;
  name: string;
  
  // Template de texto
  textTemplate: string;       // Suporta variaveis: {{nome}}, {{tarefa}}, etc.
  
  // Template com botoes (opcional)
  buttonsTemplate?: {
    title: string;
    buttons: Array<{
      id: string;
      title: string;
      action: "open_task" | "confirm" | "reject" | "snooze";
    }>;
  };
  
  // Configuracao
  defaultPriority: "low" | "normal" | "high" | "urgent";
  isActive: boolean;
}

// Exemplo de templates
const defaultTemplates: MessageTemplate[] = [
  {
    id: "task_assigned",
    type: "task_assigned",
    name: "Nova Tarefa Atribuida",
    textTemplate: "Ola {{nome}}! Voce recebeu uma nova tarefa:\n\n*{{tarefa}}*\n\nPrazo: {{prazo}}\nPrioridade: {{prioridade}}",
    buttonsTemplate: {
      title: "O que deseja fazer?",
      buttons: [
        { id: "ver", title: "Ver Tarefa", action: "open_task" },
        { id: "ok", title: "Entendido", action: "confirm" }
      ]
    },
    defaultPriority: "normal",
    isActive: true
  },
  {
    id: "task_overdue",
    type: "task_overdue",
    name: "Tarefa Atrasada",
    textTemplate: "Atencao {{nome}}! A tarefa abaixo esta atrasada:\n\n*{{tarefa}}*\n\nPrazo era: {{prazo}}",
    defaultPriority: "high",
    isActive: true
  },
  {
    id: "clock_reminder",
    type: "clock_reminder",
    name: "Lembrete de Ponto",
    textTemplate: "Ola {{nome}}! Nao esqueca de bater o ponto.\n\nHorario previsto: {{horario}}",
    defaultPriority: "normal",
    isActive: true
  }
];
```

---

## Fluxo de Integracao

```text
+-------------+      +-------+      +---------------+      +----------+
|   OpsControl| ---> |  n8n  | ---> | Evolution API | ---> | WhatsApp |
|   (React)   |      |Workflow|     |   Instance    |      |   User   |
+-------------+      +-------+      +---------------+      +----------+
       ^                 |                                       |
       |                 v                                       |
       +----- Webhook de Status (delivery, read) <---------------+
```

### Endpoints n8n necessarios:
1. **Webhook de Envio**: Recebe payload do app e envia para Evolution
2. **Webhook de Status**: Recebe atualizacoes de entrega/leitura
3. **Webhook de Resposta**: Recebe mensagens dos colaboradores

---

## Implementacao

### Etapa 1: Criar tipos TypeScript
- `src/types/employee.ts` - Interface Employee
- `src/types/notifications.ts` - Notification, templates, queue
- `src/types/evolution-api.ts` - Payloads Evolution API

### Etapa 2: Atualizar AppContext
- Adicionar estado `employees` com dados de WhatsApp
- Migrar dados mockados de colaboradores

### Etapa 3: Criar NotificationContext
- Estado de notificacoes e fila
- Funcoes: `sendNotification`, `markAsRead`, `updateDeliveryStatus`
- Listener para webhooks de retorno

### Etapa 4: Criar servico de notificacoes
- `prepareEvolutionPayload()` - Monta payload para n8n
- `processTemplate()` - Substitui variaveis no template
- `validateRecipient()` - Verifica preferencias e horario silencioso
- `queueNotification()` - Adiciona na fila de envio

### Etapa 5: Criar hook useNotifications
- `notify()` - Dispara notificacao
- `notifyMany()` - Disparo em lote
- `getUnreadCount()` - Contador de nao lidas

---

## Detalhes Tecnicos

### Formato do numero WhatsApp (Evolution API)
- Sem `+` ou espacos: `5511999999999`
- RemoteJid: `5511999999999@s.whatsapp.net`

### Limites Evolution API
- Botoes: maximo 3, titulo maximo 20 caracteres
- Lista: maximo 10 secoes, 10 itens por secao
- Texto: maximo 4096 caracteres

### Webhooks n8n (exemplo de URLs)
- Envio: `https://seu-n8n.com/webhook/opscontrol-send`
- Status: `https://seu-n8n.com/webhook/opscontrol-status`

