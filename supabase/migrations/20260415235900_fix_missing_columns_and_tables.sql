-- ================================================
-- CORREÇÃO: Adicionar colunas que existiam no banco
-- antigo mas foram criadas manualmente (fora das migrations)
-- Baseado no types.ts gerado pelo Supabase do projeto original
-- ================================================

-- 1. Coluna de horário início de trabalho (usada em TimeTracking e StrategicRHAgent)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS work_schedule_start TEXT DEFAULT '09:00';

-- 2. Carga horária diária em horas (usada em cálculos de ponto)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS daily_work_hours NUMERIC DEFAULT 8;

-- 3. Pontuação do colaborador (gamificação / ranking)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 4. Coluna file_url em occurrences (foto de atestado)
--    A migration que criou a tabela não incluiu esta coluna
--    pois a migration original fix_notification_rls já mencionava
ALTER TABLE public.occurrences
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 5. Tabelas de absenteísmo que existem no types.ts
--    mas não foram criadas por nenhuma migration
CREATE TABLE IF NOT EXISTS public.absenteeism_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_name TEXT,
    imported_by UUID REFERENCES auth.users(id),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    period_start DATE,
    period_end DATE
);

CREATE TABLE IF NOT EXISTS public.absenteeism_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.absenteeism_reports(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    predicted_hours TEXT,
    worked_hours TEXT,
    bonus_hours TEXT,
    balance TEXT,
    absenteeism_rate NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela company_rules (normas da empresa) — usada em RulesAndGuidelines.tsx
CREATE TABLE IF NOT EXISTS public.company_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- RLS para novas tabelas
-- ================================================

ALTER TABLE public.absenteeism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absenteeism_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_rules ENABLE ROW LEVEL SECURITY;

-- Absenteeism reports: apenas usuários da empresa
CREATE POLICY "Company users can view absenteeism reports"
ON public.absenteeism_reports FOR SELECT
USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can manage absenteeism reports"
ON public.absenteeism_reports FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor', 'admin_master')
    )
);

-- Absenteeism records: apenas usuários da empresa via report
CREATE POLICY "Company users can view absenteeism records"
ON public.absenteeism_records FOR SELECT
USING (
    report_id IN (
        SELECT id FROM public.absenteeism_reports ar
        WHERE public.user_belongs_to_company(auth.uid(), ar.company_id)
    )
);

CREATE POLICY "Admins can manage absenteeism records"
ON public.absenteeism_records FOR ALL
USING (
    report_id IN (
        SELECT ar.id FROM public.absenteeism_reports ar
        JOIN public.user_roles ur ON ur.company_id = ar.company_id
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor', 'admin_master')
    )
);

-- Company rules: todos da empresa podem ver, admins gerenciam
CREATE POLICY "Company users can view rules"
ON public.company_rules FOR SELECT
USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can manage rules"
ON public.company_rules FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor', 'admin_master')
    )
);

-- ================================================
-- Índices
-- ================================================
CREATE INDEX IF NOT EXISTS idx_absenteeism_reports_company_id ON public.absenteeism_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_absenteeism_records_report_id ON public.absenteeism_records(report_id);
CREATE INDEX IF NOT EXISTS idx_company_rules_company_id ON public.company_rules(company_id);
