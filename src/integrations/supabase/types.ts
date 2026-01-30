export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          created_at: string
          department: string
          email: string
          id: string
          is_active: boolean
          name: string
          notify_announcements: boolean | null
          notify_in_app: boolean | null
          notify_reminders: boolean | null
          notify_tasks: boolean | null
          notify_time_tracking: boolean | null
          notify_whatsapp: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          role: Database["public"]["Enums"]["employee_role"]
          updated_at: string
          user_id: string | null
          whatsapp_last_seen: string | null
          whatsapp_number: string | null
          whatsapp_profile_pic: string | null
          whatsapp_verified: boolean | null
        }
        Insert: {
          created_at?: string
          department?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          notify_announcements?: boolean | null
          notify_in_app?: boolean | null
          notify_reminders?: boolean | null
          notify_tasks?: boolean | null
          notify_time_tracking?: boolean | null
          notify_whatsapp?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          updated_at?: string
          user_id?: string | null
          whatsapp_last_seen?: string | null
          whatsapp_number?: string | null
          whatsapp_profile_pic?: string | null
          whatsapp_verified?: boolean | null
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          notify_announcements?: boolean | null
          notify_in_app?: boolean | null
          notify_reminders?: boolean | null
          notify_tasks?: boolean | null
          notify_time_tracking?: boolean | null
          notify_whatsapp?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          updated_at?: string
          user_id?: string | null
          whatsapp_last_seen?: string | null
          whatsapp_number?: string | null
          whatsapp_profile_pic?: string | null
          whatsapp_verified?: boolean | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string
          id: string
          max_attempts: number | null
          next_retry_at: string | null
          notification_id: string
          payload: Json
          processed_at: string | null
          response_error: string | null
          response_message_id: string | null
          response_success: boolean | null
          response_timestamp: string | null
          status: Database["public"]["Enums"]["queue_status"] | null
          webhook_url: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          notification_id: string
          payload: Json
          processed_at?: string | null
          response_error?: string | null
          response_message_id?: string | null
          response_success?: boolean | null
          response_timestamp?: string | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          webhook_url: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          notification_id?: string
          payload?: Json
          processed_at?: string | null
          response_error?: string | null
          response_message_id?: string | null
          response_success?: boolean | null
          response_timestamp?: string | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channels: string[] | null
          created_at: string
          id: string
          in_app_delivered_at: string | null
          in_app_read_at: string | null
          in_app_status: string | null
          message: string
          priority: Database["public"]["Enums"]["notification_priority"] | null
          read_at: string | null
          recipient_id: string
          recipient_phone: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_for: string | null
          sender_id: string | null
          sender_name: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          whatsapp_delivered_at: string | null
          whatsapp_error: string | null
          whatsapp_instance: string | null
          whatsapp_message_id: string | null
          whatsapp_read_at: string | null
          whatsapp_sent_at: string | null
          whatsapp_status: string | null
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          id?: string
          in_app_delivered_at?: string | null
          in_app_read_at?: string | null
          in_app_status?: string | null
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          recipient_id: string
          recipient_phone?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          whatsapp_delivered_at?: string | null
          whatsapp_error?: string | null
          whatsapp_instance?: string | null
          whatsapp_message_id?: string | null
          whatsapp_read_at?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          id?: string
          in_app_delivered_at?: string | null
          in_app_read_at?: string | null
          in_app_status?: string | null
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          recipient_id?: string
          recipient_phone?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          whatsapp_delivered_at?: string | null
          whatsapp_error?: string | null
          whatsapp_instance?: string | null
          whatsapp_message_id?: string | null
          whatsapp_read_at?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_responses: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          instance: string | null
          message_id: string | null
          notification_id: string | null
          phone: string
          processed: boolean | null
          processed_at: string | null
          push_name: string | null
          raw_message: Json | null
          response_type: string
          response_value: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          instance?: string | null
          message_id?: string | null
          notification_id?: string | null
          phone: string
          processed?: boolean | null
          processed_at?: string | null
          push_name?: string | null
          raw_message?: Json | null
          response_type: string
          response_value?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          instance?: string | null
          message_id?: string | null
          notification_id?: string | null
          phone?: string
          processed?: boolean | null
          processed_at?: string | null
          push_name?: string | null
          raw_message?: Json | null
          response_type?: string
          response_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_responses_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["employee_role"]
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_admin_or_gestor: { Args: { user_uuid: string }; Returns: boolean }
    }
    Enums: {
      employee_role: "colaborador" | "gestor" | "admin"
      notification_priority: "low" | "normal" | "high" | "urgent"
      notification_status:
        | "pending"
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      notification_type:
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
        | "gamification_badge"
      queue_status: "queued" | "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      employee_role: ["colaborador", "gestor", "admin"],
      notification_priority: ["low", "normal", "high", "urgent"],
      notification_status: [
        "pending",
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      notification_type: [
        "task_assigned",
        "task_due_reminder",
        "task_overdue",
        "task_completed",
        "task_comment",
        "clock_reminder",
        "clock_anomaly",
        "justification_required",
        "justification_response",
        "announcement",
        "gamification_badge",
      ],
      queue_status: ["queued", "processing", "completed", "failed"],
    },
  },
} as const
