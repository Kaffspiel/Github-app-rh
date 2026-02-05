export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            employees: {
                Row: {
                    id: string
                    company_id: string
                    user_id: string | null
                    name: string
                    email: string | null
                    role: "colaborador" | "gestor" | "admin"
                    department: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                    notify_tasks: boolean | null
                    notify_in_app: boolean | null
                    notify_whatsapp: boolean | null
                    notify_time_tracking: boolean | null
                    notify_reminders: boolean | null
                    notify_announcements: boolean | null
                    whatsapp_number: string | null
                    whatsapp_verified: boolean | null
                    quiet_hours_start: string | null
                    quiet_hours_end: string | null
                    work_schedule_start: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    user_id?: string | null
                    name: string
                    email?: string | null
                    role?: "colaborador" | "gestor" | "admin"
                    department?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                    notify_tasks?: boolean | null
                    notify_in_app?: boolean | null
                    notify_whatsapp?: boolean | null
                    notify_time_tracking?: boolean | null
                    notify_reminders?: boolean | null
                    notify_announcements?: boolean | null
                    whatsapp_number?: string | null
                    whatsapp_verified?: boolean | null
                    quiet_hours_start?: string | null
                    quiet_hours_end?: string | null
                    work_schedule_start?: string | null
                }
                Update: Partial<Database['public']['Tables']['employees']['Insert']>
                Relationships: []
            }
            tasks: {
                Row: {
                    id: string
                    title: string
                    description: string | null
                    priority: string
                    status: string
                    due_date: string | null
                    company_id: string
                    assignee_id: string
                    created_by: string
                    progress: number
                    is_daily_routine: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description?: string | null
                    priority?: string
                    status?: string
                    due_date?: string | null
                    company_id: string
                    assignee_id: string
                    created_by?: string
                    progress?: number
                    is_daily_routine?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: Partial<Database['public']['Tables']['tasks']['Insert']>
                Relationships: []
            }
            task_checklist_items: {
                Row: {
                    id: string
                    task_id: string
                    text: string
                    completed: boolean
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    task_id: string
                    text: string
                    completed?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['task_checklist_items']['Insert']>
                Relationships: []
            }
            task_progress_logs: {
                Row: {
                    id: string
                    task_id: string
                    employee_id: string
                    action_type: string
                    checklist_item_id: string | null
                    checklist_item_text: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    task_id: string
                    employee_id: string
                    action_type: string
                    checklist_item_id?: string | null
                    checklist_item_text?: string | null
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['task_progress_logs']['Insert']>
                Relationships: []
            }
            time_tracking_imports: {
                Row: {
                    id: string
                    company_id: string
                    source_type: string
                    source_name: string
                    total_records: number
                    imported_records: number
                    failed_records: number
                    status: string
                    column_mapping: Json
                    created_at: string
                    completed_at: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    source_type: string
                    source_name: string
                    total_records: number
                    imported_records?: number
                    failed_records?: number
                    status?: string
                    column_mapping?: Json
                    created_at?: string
                    completed_at?: string | null
                }
                Update: Partial<Database['public']['Tables']['time_tracking_imports']['Insert']>
                Relationships: []
            }
            time_tracking_records: {
                Row: {
                    id: string
                    company_id: string
                    employee_id: string | null
                    external_employee_id: string | null
                    import_id: string | null
                    record_date: string
                    entry_1: string | null
                    exit_1: string | null
                    entry_2: string | null
                    exit_2: string | null
                    raw_data: Json | null
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    employee_id?: string | null
                    external_employee_id?: string | null
                    import_id?: string | null
                    record_date: string
                    entry_1?: string | null
                    exit_1?: string | null
                    entry_2?: string | null
                    exit_2?: string | null
                    raw_data?: Json | null
                    status?: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['time_tracking_records']['Insert']>
                Relationships: []
            }
            notifications: {
                Row: {
                    id: string
                    // Add sparse definition
                }
                Insert: any // Allow loose typing for now
                Update: any
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
