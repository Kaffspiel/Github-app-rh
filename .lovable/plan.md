
## Goal
Generate a single, clean, ready-to-use SQL file (`docs/schema_export.sql`) that recreates the entire database from scratch in a fresh Supabase project — consolidating all 20 migrations into one ordered, deduplicated file.

## What the file will contain (in order)

1. **Extensions**
   - `pg_cron`, `pg_net`

2. **Enums**
   - `employee_role` (colaborador, gestor, admin)
   - `app_role` (admin_master, admin, gestor, colaborador)
   - `notification_type`, `notification_status`, `notification_priority`, `queue_status`

3. **Tables** (in dependency order)
   - `companies`
   - `employees` (all columns including `points`, `daily_work_hours`, `work_schedule_start`, `external_id`)
   - `user_roles`
   - `notifications`
   - `notification_queue`
   - `whatsapp_responses`
   - `tasks` (with `extension_status`, `overdue_notified_at`)
   - `task_comments`
   - `task_checklist_items`
   - `task_progress_logs`
   - `routine_templates`
   - `routine_template_assignments`
   - `time_tracking_records`
   - `time_tracking_imports`
   - `api_integrations`
   - `column_mappings`
   - `occurrences` (with correct `type` CHECK constraint including `tarefa_atrasada`)
   - `company_rules`
   - `absenteeism_reports`
   - `absenteeism_records`

4. **Indexes** (all performance indexes from all migrations)

5. **Enable RLS** on all tables

6. **Security functions** (SECURITY DEFINER)
   - `update_updated_at_column`
   - `get_user_role`, `is_admin`, `is_admin_or_gestor`
   - `has_role`, `is_admin_master`, `get_user_company`, `user_belongs_to_company`
   - `calculate_employee_points`
   - `get_company_ranking`
   - `auto_generate_points_on_task_completion`
   - `auto_penalize_on_task_overdue`
   - `auto_generate_points_on_time_record`

7. **Triggers** (final state only, no dropped/recreated clutter)
   - `update_*_updated_at` triggers for all tables
   - `update_points_trigger` on occurrences
   - `check_task_completion_points` on tasks
   - `auto_penalize_on_task_overdue` on tasks
   - `check_time_record_punctuality` on time_tracking_records

8. **RLS Policies** (final state — only the currently active policies, no intermediate dropped ones)
   - All policies as they currently exist in the live DB (from the `<rls-policies>` data provided)

9. **Storage**
   - Create `documents` bucket (public)

## Key decisions
- Strip all "Dev: Allow anonymous" temporary policies (already dropped in later migrations — will not include them)
- Strip mock `INSERT` data from the first migration
- The `user_roles` table will only have the final `"Users can view own roles"` SELECT policy (service_role handles admin operations via Edge Functions)
- File will be saved as `docs/schema_export.sql` — ready to copy-paste into a new Supabase project's SQL Editor

## Files to create
- `docs/schema_export.sql` — single consolidated migration file (~350-400 lines)
