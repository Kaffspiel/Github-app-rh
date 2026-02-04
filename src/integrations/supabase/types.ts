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
                    role: string
                    department: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    user_id?: string | null
                    name: string
                    email?: string | null
                    role?: string
                    department?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: Partial<Database['public']['Tables']['employees']['Insert']>
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
            }
            notifications: {
                Row: {
                    id: string
                    // Add sparse definition
                }
                Insert: any // Allow loose typing for now
                Update: any
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
