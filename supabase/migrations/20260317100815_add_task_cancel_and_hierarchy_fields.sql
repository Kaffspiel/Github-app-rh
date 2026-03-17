-- Migração para novas funcionalidades de tarefas e ponto
-- Data: 2026-03-17

-- 1. Adicionar colunas na tabela public.employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS skip_time_tracking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS exclude_from_ranking BOOLEAN DEFAULT false;

-- 2. Adicionar colunas na tabela public.tasks para cancelamento
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.employees(id);

-- 3. Adicionar colunas na tabela public.task_progress_logs para histórico detalhado
ALTER TABLE public.task_progress_logs
ADD COLUMN IF NOT EXISTS old_value JSONB,
ADD COLUMN IF NOT EXISTS new_value JSONB;

-- 4. Adicionar coluna file_url na tabela public.occurrences para atestados (fotos)
ALTER TABLE public.occurrences
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 5. Adicionar tipo de notificação 'task_cancelled' ao enum
-- Usando um bloco anônimo para evitar erros caso já exista
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_cancelled' AND enumtypid = 'public.notification_type'::regtype) THEN
        ALTER TYPE public.notification_type ADD VALUE 'task_cancelled';
    END IF;
END $$;
