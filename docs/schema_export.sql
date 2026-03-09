-- =============================================================================
-- OpsControl - Schema Completo para Migração
-- Gerado em: 2026-03-09
-- Uso: Cole este arquivo no SQL Editor de um novo projeto Supabase
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";


-- =============================================================================
-- 2. ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.employee_role AS ENUM ('colaborador', 'gestor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin_master', 'admin', 'gestor', 'colaborador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('pending', 'queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'task_assigned', 'task_due_reminder', 'task_overdue', 'task_completed',
    'task_comment', 'clock_reminder', 'clock_anomaly',
    'justification_required', 'justification_response',
    'announcement', 'gamification_badge'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.queue_status AS ENUM ('queued', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 3. TABLES (em ordem de dependência)
-- =============================================================================

-- companies
CREATE TABLE IF NOT EXISTS public.companies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  trade_name  text,
  cnpj        text,
  address     text,
  city        text,
  state       text,
  zip_code    text,
  phone       text,
  email       text,
  logo_url    text,
  is_active   boolean     NOT NULL DEFAULT true,
  settings    jsonb                DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- employees
CREATE TABLE IF NOT EXISTS public.employees (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid,
  company_id            uuid          REFERENCES public.companies(id),
  name                  text          NOT NULL,
  email                 text          NOT NULL,
  department            text          NOT NULL DEFAULT 'Geral',
  role                  public.employee_role NOT NULL DEFAULT 'colaborador',
  is_active             boolean       NOT NULL DEFAULT true,
  points                integer                DEFAULT 0,
  daily_work_hours      numeric                DEFAULT 8,
  work_schedule_start   text                   DEFAULT '09:00',
  whatsapp_number       text,
  whatsapp_verified     boolean                DEFAULT false,
  whatsapp_profile_pic  text,
  whatsapp_last_seen    timestamptz,
  notify_whatsapp       boolean                DEFAULT true,
  notify_in_app         boolean                DEFAULT true,
  notify_tasks          boolean                DEFAULT true,
  notify_time_tracking  boolean                DEFAULT true,
  notify_reminders      boolean                DEFAULT true,
  notify_announcements  boolean                DEFAULT true,
  quiet_hours_start     time,
  quiet_hours_end       time,
  external_id           text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid      NOT NULL,
  role        public.app_role NOT NULL,
  company_id  uuid      REFERENCES public.companies(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  public.notification_type NOT NULL,
  title                 text          NOT NULL,
  message               text          NOT NULL,
  recipient_id          uuid          NOT NULL REFERENCES public.employees(id),
  sender_id             uuid          REFERENCES public.employees(id),
  sender_name           text,
  company_id            uuid          REFERENCES public.companies(id),
  priority              public.notification_priority DEFAULT 'normal',
  status                public.notification_status   DEFAULT 'pending',
  channels              text[]                 DEFAULT ARRAY['in_app'],
  recipient_phone       text,
  whatsapp_status       text,
  whatsapp_message_id   text,
  whatsapp_instance     text,
  whatsapp_sent_at      timestamptz,
  whatsapp_delivered_at timestamptz,
  whatsapp_read_at      timestamptz,
  whatsapp_error        text,
  in_app_status         text                   DEFAULT 'pending',
  in_app_delivered_at   timestamptz,
  in_app_read_at        timestamptz,
  related_entity_type   text,
  related_entity_id     text,
  scheduled_for         timestamptz,
  sent_at               timestamptz,
  read_at               timestamptz,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

-- notification_queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     uuid        NOT NULL REFERENCES public.notifications(id),
  webhook_url         text        NOT NULL,
  payload             jsonb       NOT NULL,
  status              public.queue_status DEFAULT 'queued',
  attempts            integer             DEFAULT 0,
  max_attempts        integer             DEFAULT 3,
  next_retry_at       timestamptz,
  response_success    boolean,
  response_timestamp  timestamptz,
  response_message_id text,
  response_error      text,
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- whatsapp_responses
CREATE TABLE IF NOT EXISTS public.whatsapp_responses (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone          text        NOT NULL,
  push_name      text,
  message_id     text,
  instance       text,
  response_type  text        NOT NULL,
  response_value text,
  raw_message    jsonb,
  employee_id    uuid        REFERENCES public.employees(id),
  notification_id uuid       REFERENCES public.notifications(id),
  processed      boolean             DEFAULT false,
  processed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES public.companies(id),
  title               text        NOT NULL,
  description         text,
  assignee_id         uuid        REFERENCES public.employees(id),
  created_by          uuid        REFERENCES public.employees(id),
  priority            text        NOT NULL DEFAULT 'média',
  status              text        NOT NULL DEFAULT 'pendente',
  due_date            timestamptz,
  progress            integer     NOT NULL DEFAULT 0,
  is_daily_routine    boolean     NOT NULL DEFAULT false,
  extension_status    text                 DEFAULT 'none',
  overdue_notified_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- task_checklist_items
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text       text        NOT NULL,
  completed  boolean     NOT NULL DEFAULT false,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id       uuid        NOT NULL REFERENCES public.employees(id),
  content           text        NOT NULL,
  checklist_item_id uuid        REFERENCES public.task_checklist_items(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- task_progress_logs
CREATE TABLE IF NOT EXISTS public.task_progress_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id         uuid        NOT NULL REFERENCES public.employees(id),
  action_type         text        NOT NULL,
  checklist_item_id   uuid        REFERENCES public.task_checklist_items(id),
  checklist_item_text text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- routine_templates
CREATE TABLE IF NOT EXISTS public.routine_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES public.companies(id),
  name             text        NOT NULL,
  description      text,
  checklist_items  jsonb       NOT NULL DEFAULT '[]',
  is_active        boolean     NOT NULL DEFAULT true,
  auto_assign      boolean     NOT NULL DEFAULT false,
  auto_assign_time time,
  created_by       uuid        REFERENCES public.employees(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- routine_template_assignments
CREATE TABLE IF NOT EXISTS public.routine_template_assignments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid        NOT NULL REFERENCES public.routine_templates(id) ON DELETE CASCADE,
  employee_id uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- time_tracking_imports
CREATE TABLE IF NOT EXISTS public.time_tracking_imports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES public.companies(id),
  source_type      text        NOT NULL,
  source_name      text,
  file_url         text,
  status           text        NOT NULL DEFAULT 'pending',
  total_records    integer             DEFAULT 0,
  imported_records integer             DEFAULT 0,
  failed_records   integer             DEFAULT 0,
  error_log        jsonb               DEFAULT '[]',
  column_mapping   jsonb,
  period_start     date,
  period_end       date,
  imported_by      uuid,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- time_tracking_records
CREATE TABLE IF NOT EXISTS public.time_tracking_records (
  id                   uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid      NOT NULL REFERENCES public.companies(id),
  employee_id          uuid      REFERENCES public.employees(id),
  external_employee_id text,
  record_date          date      NOT NULL,
  entry_1              time,
  exit_1               time,
  entry_2              time,
  exit_2               time,
  entry_3              time,
  exit_3               time,
  entry_4              time,
  exit_4               time,
  total_hours          interval,
  overtime             interval,
  status               text               DEFAULT 'normal',
  anomalies            text[],
  notes                text,
  import_id            uuid      REFERENCES public.time_tracking_imports(id),
  raw_data             jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- api_integrations
CREATE TABLE IF NOT EXISTS public.api_integrations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES public.companies(id),
  provider_name     text        NOT NULL,
  display_name      text,
  api_base_url      text,
  auth_type         text        NOT NULL DEFAULT 'api_key',
  credentials_ref   text,
  is_active         boolean     NOT NULL DEFAULT false,
  settings          jsonb               DEFAULT '{}',
  sync_frequency    text                DEFAULT 'manual',
  last_sync_at      timestamptz,
  last_sync_status  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- column_mappings
CREATE TABLE IF NOT EXISTS public.column_mappings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid        NOT NULL REFERENCES public.companies(id),
  integration_id uuid        REFERENCES public.api_integrations(id),
  name           text        NOT NULL,
  source_type    text        NOT NULL,
  mapping        jsonb       NOT NULL,
  is_default     boolean             DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- occurrences
CREATE TABLE IF NOT EXISTS public.occurrences (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id),
  employee_id uuid        NOT NULL REFERENCES public.employees(id),
  type        text        NOT NULL,
  points      integer     NOT NULL,
  description text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- company_rules
CREATE TABLE IF NOT EXISTS public.company_rules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id),
  title       text        NOT NULL,
  description text,
  file_url    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- absenteeism_reports
CREATE TABLE IF NOT EXISTS public.absenteeism_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies(id),
  company_name text,
  period_start date,
  period_end   date,
  imported_by  uuid,
  imported_at  timestamptz NOT NULL DEFAULT now()
);

-- absenteeism_records
CREATE TABLE IF NOT EXISTS public.absenteeism_records (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        uuid        NOT NULL REFERENCES public.absenteeism_reports(id) ON DELETE CASCADE,
  employee_name    text        NOT NULL,
  predicted_hours  text,
  worked_hours     text,
  bonus_hours      text,
  balance          text,
  absenteeism_rate numeric,
  created_at       timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 4. INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_company_id     ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id        ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id       ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id    ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id         ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id        ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status             ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company    ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status     ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_occurrences_employee_id  ON public.occurrences(employee_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_company_id   ON public.occurrences(company_id);
CREATE INDEX IF NOT EXISTS idx_time_records_company     ON public.time_tracking_records(company_id);
CREATE INDEX IF NOT EXISTS idx_time_records_employee    ON public.time_tracking_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date        ON public.time_tracking_records(record_date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_responses_phone ON public.whatsapp_responses(phone);


-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.companies                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_progress_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_imports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_integrations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_mappings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_rules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absenteeism_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absenteeism_records         ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 6. SECURITY FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- Role do employee
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS public.employee_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.employees WHERE user_id = user_uuid LIMIT 1;
$$;

-- Verifica se é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE user_id = user_uuid AND role = 'admin');
$$;

-- Verifica se é admin ou gestor
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE user_id = user_uuid AND role IN ('admin', 'gestor'));
$$;

-- Verifica role app_role na tabela user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Verifica se é admin_master
CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin_master');
$$;

-- Retorna o company_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.user_roles WHERE user_id = _user_id AND company_id IS NOT NULL LIMIT 1;
$$;

-- Verifica se o usuário pertence à empresa (admin_master passa sempre)
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND company_id = _company_id
  ) OR public.is_admin_master(_user_id);
$$;

-- Recalcula pontos totais do employee a partir das ocorrências
CREATE OR REPLACE FUNCTION public.calculate_employee_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.employees
  SET points = (
    SELECT COALESCE(SUM(points), 0)
    FROM public.occurrences
    WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
  )
  WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  RETURN NULL;
END; $$;

-- Ranking de gamificação da empresa
CREATE OR REPLACE FUNCTION public.get_company_ranking()
RETURNS TABLE(employee_id uuid, name text, total_score bigint, ranking bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM employees WHERE user_id = auth.uid();
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.name,
    COALESCE(SUM(o.points), 0)::bigint AS total_score,
    RANK() OVER (ORDER BY COALESCE(SUM(o.points), 0) DESC) AS ranking
  FROM employees e
  LEFT JOIN occurrences o ON e.id = o.employee_id
  WHERE e.company_id = v_company_id
  GROUP BY e.id, e.name
  ORDER BY total_score DESC;
END; $$;

-- +10 por concluir no prazo / -5 por concluir atrasado
CREATE OR REPLACE FUNCTION public.auto_generate_points_on_task_completion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_points integer;
  v_type   text;
  v_desc   text;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    IF NEW.assignee_id IS NOT NULL THEN
      IF NEW.due_date IS NOT NULL AND NOW() <= NEW.due_date::timestamp THEN
        v_points := 10; v_type := 'aprovacao_tarefa';
        v_desc   := 'Tarefa concluída no prazo: ' || NEW.title;
        INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_by)
        VALUES (NEW.company_id, NEW.assignee_id, v_type, v_points, v_desc, NULL);
      ELSIF NEW.due_date IS NOT NULL AND NOW() > NEW.due_date::timestamp THEN
        v_points := -5; v_type := 'atraso_tarefa';
        v_desc   := 'Tarefa concluída com atraso: ' || NEW.title;
        INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_by)
        VALUES (NEW.company_id, NEW.assignee_id, v_type, v_points, v_desc, NULL);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- -10 quando status muda para 'atrasada'
CREATE OR REPLACE FUNCTION public.auto_penalize_on_task_overdue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_points integer := -10;
  v_type   text    := 'tarefa_atrasada';
  v_desc   text;
BEGIN
  IF NEW.status = 'atrasada' AND (OLD.status IS DISTINCT FROM 'atrasada') THEN
    IF NEW.assignee_id IS NOT NULL THEN
      v_desc := 'Tarefa entrou em atraso: ' || NEW.title;
      IF NOT EXISTS (
        SELECT 1 FROM public.occurrences
        WHERE employee_id = NEW.assignee_id AND type = v_type
          AND description LIKE '%' || NEW.title || '%'
          AND created_at > NOW() - INTERVAL '1 day'
      ) THEN
        INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_by)
        VALUES (NEW.company_id, NEW.assignee_id, v_type, v_points, v_desc, NULL);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- +10 por pontualidade no registro de ponto
CREATE OR REPLACE FUNCTION public.auto_generate_points_on_time_record()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_schedule_start time;
  v_actual_entry   time;
  v_points         integer  := 10;
  v_tolerance      interval := '10 minutes';
  v_schedule_text  text;
BEGIN
  IF NEW.entry_1 IS NOT NULL AND (OLD.entry_1 IS NULL OR OLD.entry_1 IS DISTINCT FROM NEW.entry_1) THEN
    SELECT work_schedule_start INTO v_schedule_text FROM public.employees WHERE id = NEW.employee_id;
    v_schedule_text := COALESCE(v_schedule_text, '09:00');
    BEGIN
      v_schedule_start := v_schedule_text::time;
      v_actual_entry   := NEW.entry_1::time;
      IF v_actual_entry <= (v_schedule_start + v_tolerance) THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.occurrences
          WHERE employee_id = NEW.employee_id AND type = 'pontualidade_positiva'
            AND created_at::date = NEW.record_date
        ) THEN
          INSERT INTO public.occurrences (company_id, employee_id, type, points, description)
          VALUES (
            NEW.company_id, NEW.employee_id, 'pontualidade_positiva', v_points,
            'Pontualidade: Chegou às ' || NEW.entry_1 || ' (Previsto: ' || v_schedule_text || ')'
          );
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END; $$;


-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================
CREATE OR REPLACE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_routine_templates_updated_at
  BEFORE UPDATE ON public.routine_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_time_tracking_records_updated_at
  BEFORE UPDATE ON public.time_tracking_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_api_integrations_updated_at
  BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_column_mappings_updated_at
  BEFORE UPDATE ON public.column_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Gamificação: recalcula pontos após INSERT/UPDATE/DELETE em occurrences
DROP TRIGGER IF EXISTS update_points_trigger ON public.occurrences;
CREATE TRIGGER update_points_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.calculate_employee_points();

-- Gamificação: pontos por conclusão de tarefa
DROP TRIGGER IF EXISTS check_task_completion_points ON public.tasks;
CREATE TRIGGER check_task_completion_points
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_points_on_task_completion();

-- Gamificação: penalidade por tarefa atrasada
DROP TRIGGER IF EXISTS check_task_overdue_penalty ON public.tasks;
CREATE TRIGGER check_task_overdue_penalty
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.auto_penalize_on_task_overdue();

-- Gamificação: pontos por pontualidade no ponto
DROP TRIGGER IF EXISTS check_time_record_punctuality ON public.time_tracking_records;
CREATE TRIGGER check_time_record_punctuality
  AFTER INSERT OR UPDATE ON public.time_tracking_records
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_points_on_time_record();


-- =============================================================================
-- 8. RLS POLICIES
-- =============================================================================

-- ── companies ──────────────────────────────────────────────────────────────
CREATE POLICY "Admin master can manage all companies"
  ON public.companies FOR ALL
  USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Users can view their company"
  ON public.companies FOR SELECT
  USING (id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- ── employees ──────────────────────────────────────────────────────────────
CREATE POLICY "Admins can manage employees of their company"
  ON public.employees FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Gestores can view employees of their company"
  ON public.employees FOR SELECT
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('gestor', 'admin')));

CREATE POLICY "Employees can view own profile"
  ON public.employees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can update own profile"
  ON public.employees FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access employees"
  ON public.employees FOR ALL
  USING (auth.role() = 'service_role');

-- ── user_roles ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- ── notifications ──────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Gestores can view notifications of their company"
  ON public.notifications FOR SELECT
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('gestor', 'admin')));

CREATE POLICY "Users can insert notifications within their company"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can update own notification status"
  ON public.notifications FOR UPDATE
  USING (recipient_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

-- ── notification_queue ─────────────────────────────────────────────────────
CREATE POLICY "Service role full access queue"
  ON public.notification_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ── whatsapp_responses ─────────────────────────────────────────────────────
CREATE POLICY "Enable read access for authenticated users"
  ON public.whatsapp_responses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access responses"
  ON public.whatsapp_responses FOR ALL
  USING (auth.role() = 'service_role');

-- ── tasks ──────────────────────────────────────────────────────────────────
CREATE POLICY "Company users can view tasks"
  ON public.tasks FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage tasks"
  ON public.tasks FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')));

CREATE POLICY "Collaborators can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    assignee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Collaborators can update assigned tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (assignee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  WITH CHECK (assignee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can pick up unassigned tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (assignee_id IS NULL AND company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (assignee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- ── task_checklist_items ───────────────────────────────────────────────────
CREATE POLICY "Company users can view checklist"
  ON public.task_checklist_items FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE public.user_belongs_to_company(auth.uid(), company_id)));

CREATE POLICY "Admins gestores and assignees can manage checklist"
  ON public.task_checklist_items FOR ALL
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor'))
       OR t.assignee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  ));

-- ── task_comments ──────────────────────────────────────────────────────────
CREATE POLICY "Company users can view comments"
  ON public.task_comments FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE public.user_belongs_to_company(auth.uid(), company_id)));

CREATE POLICY "Company users can add comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE public.user_belongs_to_company(auth.uid(), company_id))
    AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- ── task_progress_logs ─────────────────────────────────────────────────────
CREATE POLICY "Gestores can view progress logs"
  ON public.task_progress_logs FOR SELECT
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    JOIN public.user_roles ur ON ur.company_id = t.company_id
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
  ));

CREATE POLICY "Employees can insert own progress"
  ON public.task_progress_logs FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access progress logs"
  ON public.task_progress_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ── routine_templates ──────────────────────────────────────────────────────
CREATE POLICY "Company users can view templates"
  ON public.routine_templates FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage templates"
  ON public.routine_templates FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')));

-- ── routine_template_assignments ───────────────────────────────────────────
CREATE POLICY "Company users can view assignments"
  ON public.routine_template_assignments FOR SELECT
  USING (template_id IN (SELECT id FROM public.routine_templates WHERE public.user_belongs_to_company(auth.uid(), company_id)));

CREATE POLICY "Admins and gestores can manage assignments"
  ON public.routine_template_assignments FOR ALL
  USING (template_id IN (
    SELECT rt.id FROM public.routine_templates rt
    JOIN public.user_roles ur ON ur.company_id = rt.company_id
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
  ));

-- ── time_tracking_records ──────────────────────────────────────────────────
CREATE POLICY "Company users can view company records"
  ON public.time_tracking_records FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage company records"
  ON public.time_tracking_records FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')));

-- ── time_tracking_imports ──────────────────────────────────────────────────
CREATE POLICY "Company admins can manage imports"
  ON public.time_tracking_imports FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')));

-- ── api_integrations ───────────────────────────────────────────────────────
CREATE POLICY "Company admins can manage integrations"
  ON public.api_integrations FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- ── column_mappings ────────────────────────────────────────────────────────
CREATE POLICY "Company users can view mappings"
  ON public.column_mappings FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage mappings"
  ON public.column_mappings FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- ── occurrences ────────────────────────────────────────────────────────────
CREATE POLICY "Enable read access for users in the same company"
  ON public.occurrences FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Enable insert for admins and managers"
  ON public.occurrences FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND company_id = occurrences.company_id AND role IN ('admin', 'gestor')
  ));

-- ── company_rules ──────────────────────────────────────────────────────────
CREATE POLICY "Enable read access for users in the same company"
  ON public.company_rules FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Enable insert for admins"
  ON public.company_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND company_id = company_rules.company_id AND role IN ('admin', 'gestor')
  ));

-- ── absenteeism_reports ────────────────────────────────────────────────────
CREATE POLICY "Company users can view reports"
  ON public.absenteeism_reports FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage reports"
  ON public.absenteeism_reports FOR ALL
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')));

-- ── absenteeism_records ────────────────────────────────────────────────────
CREATE POLICY "Users can view records of their reports"
  ON public.absenteeism_records FOR SELECT
  USING (report_id IN (
    SELECT id FROM public.absenteeism_reports WHERE public.user_belongs_to_company(auth.uid(), company_id)
  ));

CREATE POLICY "Admins and gestores can manage records"
  ON public.absenteeism_records FOR ALL
  USING (report_id IN (
    SELECT ar.id FROM public.absenteeism_reports ar
    JOIN public.user_roles ur ON ur.company_id = ar.company_id
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
  ));


-- =============================================================================
-- 9. STORAGE
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated Upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
  ));


-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Para criar o primeiro admin_master, execute após criar o usuário no Auth:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<auth-user-uuid>', 'admin_master');
-- =============================================================================
