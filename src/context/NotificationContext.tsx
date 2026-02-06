import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
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
  const { currentCompanyId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [monitoredEmployeeIds, setMonitoredEmployeeIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('monitored_employees');
    return saved ? JSON.parse(saved) : [];
  });

  // Listen for storage changes (sync across tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('monitored_employees');
      setMonitoredEmployeeIds(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch employees from Supabase
  const fetchEmployees = useCallback(async () => {
    if (!currentCompanyId) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompanyId);

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
            enableEmail: false,
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

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    if (!currentCompanyId) return;

    try {
      // Fetch 100 most recent notifications for the current company
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (data) {
        const mappedNotifications: Notification[] = data.map((n: any) => ({
          id: n.id,
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          recipientId: n.recipient_id,
          recipientPhone: "", // We can try to map from employees if needed, but not critical for display
          senderId: n.sender_id,
          senderName: n.sender_name,
          channels: n.channels || ["in_app"],
          priority: n.priority as NotificationPriority,
          relatedEntity: n.related_entity_type ? {
            type: n.related_entity_type as any,
            id: n.related_entity_id
          } : undefined,
          status: n.status as NotificationStatus,
          deliveryStatus: {}, // Simplified
          createdAt: n.created_at,
          readAt: n.read_at,
          scheduledFor: n.scheduled_for
        }));
        setNotifications(mappedNotifications);
      }
    } catch (err) {
      console.error('Error in fetchNotifications:', err);
    }
  }, []);

  useEffect(() => {
    if (currentCompanyId) {
      fetchEmployees();
      fetchNotifications();

      // Subscribe to employee changes for current company
      const empChannel = supabase
        .channel(`public:employees:${currentCompanyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `company_id=eq.${currentCompanyId}`
        }, () => {
          fetchEmployees();
        })
        .subscribe();

      // Subscribe to notification changes for current company
      const notifChannel = supabase
        .channel(`public:notifications:${currentCompanyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${currentCompanyId}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(empChannel);
        supabase.removeChannel(notifChannel);
      };
    }
  }, [currentCompanyId, fetchEmployees, fetchNotifications]);


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

      // Persist in Supabase
      if (currentCompanyId) {
        supabase.from('notifications').insert({
          type: params.type as any,
          title: params.title,
          message: params.message,
          recipient_id: params.recipientId,
          sender_id: params.senderId,
          sender_name: params.senderName,
          company_id: currentCompanyId,
          channels: params.channels || ["in_app"],
          priority: params.priority || "normal",
          related_entity_type: params.relatedEntity?.type,
          related_entity_id: params.relatedEntity?.id,
          scheduled_for: params.scheduledFor,
          status: 'pending',
          in_app_status: 'delivered',
          in_app_delivered_at: new Date().toISOString()
        } as any).then(({ error }) => {
          if (error) console.error('Error persisting notification to Supabase:', error);
        });
      }

      setNotifications((prev) => [notification, ...prev]);
      return notification;
    },
    [generateId, getEmployeeById, currentCompanyId]
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
      const recipient = getEmployeeById(recipientId);
      const isManager = recipient?.role === 'admin' || recipient?.role === 'gestor';

      return notifications.filter((notif) => {
        if (notif.recipientId !== recipientId || notif.status === "read") return false;

        // Se for gestor e houver filtro ativo, filtrar por remetente
        if (isManager && monitoredEmployeeIds.length > 0) {
          // Mantém se for notificação do sistema/vazia ou se for de um colaborador monitorado
          return !notif.senderId || monitoredEmployeeIds.includes(notif.senderId);
        }

        return true;
      }).length;
    },
    [notifications, monitoredEmployeeIds, getEmployeeById]
  );

  // Busca notificações por destinatário
  const getNotificationsByRecipient = useCallback(
    (recipientId: string): Notification[] => {
      const recipient = getEmployeeById(recipientId);
      const isManager = recipient?.role === 'admin' || recipient?.role === 'gestor';

      return notifications.filter((notif) => {
        if (notif.recipientId !== recipientId) return false;

        // Se for gestor e houver filtro ativo, filtrar por remetente
        if (isManager && monitoredEmployeeIds.length > 0) {
          return !notif.senderId || monitoredEmployeeIds.includes(notif.senderId);
        }

        return true;
      });
    },
    [notifications, monitoredEmployeeIds, getEmployeeById]
  );

  // Queue worker
  useEffect(() => {
    const processQueue = async () => {
      const pendingItems = queue.filter(item => item.status === 'queued');

      for (const item of pendingItems) {
        // Prevent immediate re-processing
        updateQueueItem(item.id, { status: 'processing' });

        try {
          console.log(`Processing notification queue item: ${item.id} (WhatsApp: ${item.payload.number})`);

          const response = await fetch(item.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.payload),
          });

          if (!response.ok) {
            throw new Error(`Webhook responded with status: ${response.status}`);
          }

          console.log(`Notification sent successfully via webhook: ${item.id}`);
          updateQueueItem(item.id, {
            status: 'sent',
            processedAt: new Date().toISOString()
          });

          // Clean up queue after success
          setTimeout(() => removeFromQueue(item.id), 5000);
        } catch (error) {
          console.error(`Failed to process notification queue item ${item.id}:`, error);
          const nextAttempts = (item.attempts || 0) + 1;

          if (nextAttempts >= (item.maxAttempts || 3)) {
            updateQueueItem(item.id, { status: 'failed', attempts: nextAttempts });
          } else {
            updateQueueItem(item.id, { status: 'retrying', attempts: nextAttempts });
            // Retry after delay
            setTimeout(() => updateQueueItem(item.id, { status: 'queued' }), 10000);
          }
        }
      }
    };

    if (queue.some(item => item.status === 'queued')) {
      processQueue();
    }
  }, [queue, updateQueueItem, removeFromQueue]);

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
