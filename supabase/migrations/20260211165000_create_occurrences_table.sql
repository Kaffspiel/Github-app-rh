-- ================================================
-- CORREÇÃO: Criar tabela occurrences que foi criada
-- manualmente no projeto anterior (fora das migrations)
-- Esta migration garante a existência da tabela antes
-- das migrations subsequentes que a modificam.
-- ================================================

CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (
        type = ANY (ARRAY[
            'aprovacao_tarefa'::text,
            'atraso_tarefa'::text,
            'falta'::text,
            'atestado'::text,
            'pontualidade_positiva'::text,
            'pontualidade_negativa'::text
        ])
    ),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    points INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- Política: usuários da empresa podem ver ocorrências
CREATE POLICY "Company users can view occurrences"
ON public.occurrences FOR SELECT
USING (public.user_belongs_to_company(auth.uid(), company_id));

-- Política: admins e gestores podem gerenciar ocorrências
CREATE POLICY "Admins and gestores can manage occurrences"
ON public.occurrences FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor', 'admin_master')
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_occurrences_company_id ON public.occurrences(company_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_employee_id ON public.occurrences(employee_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_date ON public.occurrences(date);

-- Trigger updated_at
CREATE TRIGGER update_occurrences_updated_at
BEFORE UPDATE ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
