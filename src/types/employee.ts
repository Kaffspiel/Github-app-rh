// Interface do Colaborador com dados para WhatsApp (Evolution API)

export interface WhatsAppInfo {
  number: string;           // Formato: 5511999999999 (sem + ou espaços)
  isVerified: boolean;      // Se o número foi validado
  lastSeen?: string;        // Última interação ISO timestamp
  profilePicUrl?: string;   // URL da foto do perfil
}

export interface NotificationPreferences {
  enableWhatsApp: boolean;
  enableInApp: boolean;
  quietHoursStart?: string; // Formato: "22:00"
  quietHoursEnd?: string;   // Formato: "07:00"
  categories: {
    tasks: boolean;
    timeTracking: boolean;
    reminders: boolean;
    announcements: boolean;
  };
}

export type EmployeeRole = "colaborador" | "gestor" | "admin";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  isActive: boolean;
  
  // WhatsApp (Evolution API)
  whatsapp: WhatsAppInfo;
  
  // Preferências de notificação
  notificationPreferences: NotificationPreferences;

  // Hierarquia e Regras
  managerId?: string;
  skipTimeTracking?: boolean;
  excludeFromRanking?: boolean;
}

// Dados mockados dos colaboradores
export const mockEmployees: Employee[] = [
  {
    id: "emp-001",
    name: "Maria Santos",
    email: "maria.santos@empresa.com",
    role: "gestor",
    department: "Operações",
    isActive: true,
    whatsapp: {
      number: "5511999990001",
      isVerified: true,
      lastSeen: new Date().toISOString(),
    },
    notificationPreferences: {
      enableWhatsApp: true,
      enableInApp: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      categories: {
        tasks: true,
        timeTracking: true,
        reminders: true,
        announcements: true,
      },
    },
  },
  {
    id: "emp-002",
    name: "João Silva",
    email: "joao.silva@empresa.com",
    role: "colaborador",
    department: "Logística",
    isActive: true,
    whatsapp: {
      number: "5511999990002",
      isVerified: true,
    },
    notificationPreferences: {
      enableWhatsApp: true,
      enableInApp: true,
      categories: {
        tasks: true,
        timeTracking: true,
        reminders: true,
        announcements: true,
      },
    },
  },
  {
    id: "emp-003",
    name: "Ana Lima",
    email: "ana.lima@empresa.com",
    role: "colaborador",
    department: "Vendas",
    isActive: true,
    whatsapp: {
      number: "5511999990003",
      isVerified: true,
    },
    notificationPreferences: {
      enableWhatsApp: true,
      enableInApp: true,
      quietHoursStart: "21:00",
      quietHoursEnd: "08:00",
      categories: {
        tasks: true,
        timeTracking: false,
        reminders: true,
        announcements: true,
      },
    },
  },
  {
    id: "emp-004",
    name: "Carlos Rocha",
    email: "carlos.rocha@empresa.com",
    role: "colaborador",
    department: "Estoque",
    isActive: true,
    whatsapp: {
      number: "5511999990004",
      isVerified: false,
    },
    notificationPreferences: {
      enableWhatsApp: false,
      enableInApp: true,
      categories: {
        tasks: true,
        timeTracking: true,
        reminders: false,
        announcements: true,
      },
    },
  },
  {
    id: "emp-005",
    name: "Pedro Costa",
    email: "pedro.costa@empresa.com",
    role: "colaborador",
    department: "Logística",
    isActive: true,
    whatsapp: {
      number: "5511999990005",
      isVerified: true,
    },
    notificationPreferences: {
      enableWhatsApp: true,
      enableInApp: true,
      categories: {
        tasks: true,
        timeTracking: true,
        reminders: true,
        announcements: true,
      },
    },
  },
  {
    id: "emp-006",
    name: "Katiele Rocha",
    email: "katiele.rocha@empresa.com",
    role: "gestor",
    department: "Administrativo",
    isActive: true,
    whatsapp: {
      number: "5511999990006",
      isVerified: true,
    },
    notificationPreferences: {
      enableWhatsApp: true,
      enableInApp: true,
      categories: {
        tasks: true,
        timeTracking: true,
        reminders: true,
        announcements: true,
      },
    },
  },
];
