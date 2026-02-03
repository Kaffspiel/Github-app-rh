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
      api_integrations: {
        Row: {
          api_base_url: string | null
          auth_type: string
          company_id: string
          created_at: string
          credentials_ref: string | null
          display_name: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_status: string | null
          provider_name: string
          settings: Json | null
          sync_frequency: string | null
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          auth_type?: string
          company_id: string
          created_at?: string
          credentials_ref?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          provider_name: string
          settings?: Json | null
          sync_frequency?: string | null
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          auth_type?: string
          company_id?: string
          created_at?: string
          credentials_ref?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          provider_name?: string
          settings?: Json | null
          sync_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      column_mappings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          integration_id: string | null
          is_default: boolean | null
          mapping: Json
          name: string
          source_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          integration_id?: string | null
          is_default?: boolean | null
          mapping: Json
          name: string
          source_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          integration_id?: string | null
          is_default?: boolean | null
          mapping?: Json
          name?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "column_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          state: string | null
          trade_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_rules: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string | null
          created_at: string
          department: string
          email: string
          external_id: string | null
          id: string
          is_active: boolean
          name: string
          notify_announcements: boolean | null
          notify_in_app: boolean | null
          notify_reminders: boolean | null
          notify_tasks: boolean | null
          notify_time_tracking: boolean | null
          notify_whatsapp: boolean | null
          points: number | null
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
          company_id?: string | null
          created_at?: string
          department?: string
          email: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          notify_announcements?: boolean | null
          notify_in_app?: boolean | null
          notify_reminders?: boolean | null
          notify_tasks?: boolean | null
          notify_time_tracking?: boolean | null
          notify_whatsapp?: boolean | null
          points?: number | null
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
          company_id?: string | null
          created_at?: string
          department?: string
          email?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notify_announcements?: boolean | null
          notify_in_app?: boolean | null
          notify_reminders?: boolean | null
          notify_tasks?: boolean | null
          notify_time_tracking?: boolean | null
          notify_whatsapp?: boolean | null
          points?: number | null
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
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      occurrences: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          id: string
          points: number
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          id?: string
          points: number
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_template_assignments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          template_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          template_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_template_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          auto_assign: boolean
          auto_assign_time: string | null
          checklist_items: Json
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          auto_assign?: boolean
          auto_assign_time?: string | null
          checklist_items?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          auto_assign?: boolean
          auto_assign_time?: string | null
          checklist_items?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          sort_order: number
          task_id: string
          text: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          task_id: string
          text: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_progress_logs: {
        Row: {
          action_type: string
          checklist_item_id: string | null
          checklist_item_text: string | null
          created_at: string
          employee_id: string
          id: string
          task_id: string
        }
        Insert: {
          action_type: string
          checklist_item_id?: string | null
          checklist_item_text?: string | null
          created_at?: string
          employee_id: string
          id?: string
          task_id: string
        }
        Update: {
          action_type?: string
          checklist_item_id?: string | null
          checklist_item_text?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_progress_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_daily_routine: boolean
          priority: string
          progress: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_daily_routine?: boolean
          priority?: string
          progress?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_daily_routine?: boolean
          priority?: string
          progress?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking_imports: {
        Row: {
          column_mapping: Json | null
          company_id: string
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_records: number | null
          file_url: string | null
          id: string
          imported_by: string | null
          imported_records: number | null
          period_end: string | null
          period_start: string | null
          source_name: string | null
          source_type: string
          status: string
          total_records: number | null
        }
        Insert: {
          column_mapping?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_records?: number | null
          file_url?: string | null
          id?: string
          imported_by?: string | null
          imported_records?: number | null
          period_end?: string | null
          period_start?: string | null
          source_name?: string | null
          source_type: string
          status?: string
          total_records?: number | null
        }
        Update: {
          column_mapping?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_records?: number | null
          file_url?: string | null
          id?: string
          imported_by?: string | null
          imported_records?: number | null
          period_end?: string | null
          period_start?: string | null
          source_name?: string | null
          source_type?: string
          status?: string
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking_records: {
        Row: {
          anomalies: string[] | null
          company_id: string
          created_at: string
          employee_id: string | null
          entry_1: string | null
          entry_2: string | null
          entry_3: string | null
          entry_4: string | null
          exit_1: string | null
          exit_2: string | null
          exit_3: string | null
          exit_4: string | null
          external_employee_id: string | null
          id: string
          import_id: string | null
          notes: string | null
          overtime: unknown
          raw_data: Json | null
          record_date: string
          status: string | null
          total_hours: unknown
          updated_at: string
        }
        Insert: {
          anomalies?: string[] | null
          company_id: string
          created_at?: string
          employee_id?: string | null
          entry_1?: string | null
          entry_2?: string | null
          entry_3?: string | null
          entry_4?: string | null
          exit_1?: string | null
          exit_2?: string | null
          exit_3?: string | null
          exit_4?: string | null
          external_employee_id?: string | null
          id?: string
          import_id?: string | null
          notes?: string | null
          overtime?: unknown
          raw_data?: Json | null
          record_date: string
          status?: string | null
          total_hours?: unknown
          updated_at?: string
        }
        Update: {
          anomalies?: string[] | null
          company_id?: string
          created_at?: string
          employee_id?: string | null
          entry_1?: string | null
          entry_2?: string | null
          entry_3?: string | null
          entry_4?: string | null
          exit_1?: string | null
          exit_2?: string | null
          exit_3?: string | null
          exit_4?: string | null
          external_employee_id?: string | null
          id?: string
          import_id?: string | null
          notes?: string | null
          overtime?: unknown
          raw_data?: Json | null
          record_date?: string
          status?: string | null
          total_hours?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["employee_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_admin_master: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_gestor: { Args: { user_uuid: string }; Returns: boolean }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_master" | "admin" | "gestor" | "colaborador"
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
      app_role: ["admin_master", "admin", "gestor", "colaborador"],
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
