import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationQueueItem,
  DeliveryStatus,
} from "@/types/notifications";
import type { Employee } from "@/types/employee";
import { mockEmployees } from "@/types/employee";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  relatedEntity?: {
    type: "task" | "timeRecord" | "announcement";
    id: string;
  };
  scheduledFor?: string;
}

interface NotificationContextType {
  // Estado
  notifications: Notification[];
  queue: NotificationQueueItem[];
  employees: Employee[];

  // Notificações
  createNotification: (params: CreateNotificationParams) => Notification;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (recipientId: string) => void;
  deleteNotification: (notificationId: string) => void;

  // Status de entrega
  updateDeliveryStatus: (
    notificationId: string,
    channel: NotificationChannel,
    status: Partial<DeliveryStatus[typeof channel]>
  ) => void;

  // Fila
  addToQueue: (item: Omit<NotificationQueueItem, "id" | "createdAt">) => void;
  updateQueueItem: (itemId: string, updates: Partial<NotificationQueueItem>) => void;
  removeFromQueue: (itemId: string) => void;

  // Consultas
  getUnreadCount: (recipientId: string) => number;
  getNotificationsByRecipient: (recipientId: string) => Notification[];
  getEmployeeById: (employeeId: string) => Employee | undefined;
  getEmployeeByPhone: (phone: string) => Employee | undefined;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);

  // Fetch employees from Supabase
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        console.error('Error fetching employees for notifications:', error);
        return;
      }

      if (data) {
        const mappedEmployees: Employee[] = data.map(emp => ({
          id: emp.id,
          name: emp.name,
          role: emp.role as "admin" | "gestor" | "colaborador",
          avatar: emp.whatsapp_profile_pic || undefined,
          email: emp.email || "",
          phone: emp.whatsapp_number || "",
          department: emp.department || "Geral",
          isActive: emp.is_active,
          whatsapp: {
            number: emp.whatsapp_number || "",
            isVerified: emp.whatsapp_verified || false,
          },
          notificationPreferences: {
            enableEmail: false, // Not in schema currently
            enableWhatsApp: emp.notify_whatsapp || false,
            enableInApp: emp.notify_in_app || true,
            quietHoursStart: emp.quiet_hours_start || "22:00",
            quietHoursEnd: emp.quiet_hours_end || "07:00",
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            categories: {
              tasks: emp.notify_tasks || true,
              timeTracking: emp.notify_time_tracking || true,
              reminders: emp.notify_reminders || true,
              announcements: emp.notify_announcements || true
            }
          }
        }));
        setEmployees(mappedEmployees);
      }
    } catch (err) {
      console.error('Error in fetchEmployees:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();

    // Subscribe to employee changes
    const channel = supabase
      .channel('public:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEmployees]);

  // Gera ID único
  const generateId = useCallback(() => {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Busca colaborador por ID
  const getEmployeeById = useCallback(
    (employeeId: string): Employee | undefined => {
      return employees.find((emp) => emp.id === employeeId);
    },
    [employees]
  );

  // Busca colaborador por telefone
  const getEmployeeByPhone = useCallback(
    (phone: string): Employee | undefined => {
      const cleanPhone = phone.replace(/\D/g, "");
      return employees.find((emp) => emp.whatsapp.number === cleanPhone);
    },
    [employees]
  );

  // Cria nova notificação
  const createNotification = useCallback(
    (params: CreateNotificationParams): Notification => {
      const employee = getEmployeeById(params.recipientId);

      const notification: Notification = {
        id: generateId(),
        type: params.type,
        title: params.title,
        message: params.message,
        recipientId: params.recipientId,
        recipientPhone: employee?.whatsapp.number || "",
        senderId: params.senderId,
        senderName: params.senderName,
        channels: params.channels || ["in_app"],
        priority: params.priority || "normal",
        relatedEntity: params.relatedEntity,
        status: "pending",
        deliveryStatus: {},
        createdAt: new Date().toISOString(),
        scheduledFor: params.scheduledFor,
      };

      setNotifications((prev) => [notification, ...prev]);
      return notification;
    },
    [generateId, getEmployeeById]
  );

  // Marca notificação como lida
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId
          ? {
            ...notif,
            status: "read" as NotificationStatus,
            readAt: new Date().toISOString(),
            deliveryStatus: {
              ...notif.deliveryStatus,
              in_app: {
                ...notif.deliveryStatus.in_app,
                status: "read" as const,
                readAt: new Date().toISOString(),
              },
            },
          }
          : notif
      )
    );
  }, []);

  // Marca todas como lidas para um destinatário
  const markAllAsRead = useCallback((recipientId: string) => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.recipientId === recipientId && notif.status !== "read"
          ? {
            ...notif,
            status: "read" as NotificationStatus,
            readAt: now,
            deliveryStatus: {
              ...notif.deliveryStatus,
              in_app: {
                ...notif.deliveryStatus.in_app,
                status: "read" as const,
                readAt: now,
              },
            },
          }
          : notif
      )
    );
  }, []);

  // Remove notificação
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
  }, []);

  // Atualiza status de entrega
  const updateDeliveryStatus = useCallback(
    (
      notificationId: string,
      channel: NotificationChannel,
      status: Partial<DeliveryStatus[typeof channel]>
    ) => {
      setNotifications((prev) =>
        prev.map((notif) => {
          if (notif.id !== notificationId) return notif;

          const updatedDeliveryStatus = {
            ...notif.deliveryStatus,
            [channel]: {
              ...notif.deliveryStatus[channel],
              ...status,
            },
          };

          // Determina status geral baseado nos canais
          let overallStatus: NotificationStatus = notif.status;
          if (channel === "whatsapp" && status && "status" in status) {
            const whatsappStatus = status.status;
            if (whatsappStatus === "read") overallStatus = "read";
            else if (whatsappStatus === "delivered") overallStatus = "delivered";
            else if (whatsappStatus === "sent") overallStatus = "sent";
            else if (whatsappStatus === "failed") overallStatus = "failed";
          }

          return {
            ...notif,
            status: overallStatus,
            deliveryStatus: updatedDeliveryStatus,
          };
        })
      );
    },
    []
  );

  // Adiciona item à fila
  const addToQueue = useCallback(
    (item: Omit<NotificationQueueItem, "id" | "createdAt">) => {
      const queueItem: NotificationQueueItem = {
        ...item,
        id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      setQueue((prev) => [...prev, queueItem]);
    },
    []
  );

  // Atualiza item da fila
  const updateQueueItem = useCallback(
    (itemId: string, updates: Partial<NotificationQueueItem>) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      );
    },
    []
  );

  // Remove item da fila
  const removeFromQueue = useCallback((itemId: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Conta não lidas
  const getUnreadCount = useCallback(
    (recipientId: string): number => {
      return notifications.filter(
        (notif) => notif.recipientId === recipientId && notif.status !== "read"
      ).length;
    },
    [notifications]
  );

  // Busca notificações por destinatário
  const getNotificationsByRecipient = useCallback(
    (recipientId: string): Notification[] => {
      return notifications.filter((notif) => notif.recipientId === recipientId);
    },
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        queue,
        employees,
        createNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        updateDeliveryStatus,
        addToQueue,
        updateQueueItem,
        removeFromQueue,
        getUnreadCount,
        getNotificationsByRecipient,
        getEmployeeById,
        getEmployeeByPhone,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
