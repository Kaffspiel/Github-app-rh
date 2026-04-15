
-- Adicionar colunas para o ciclo de aprovação de prorrogação
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS suggested_due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS extension_reason TEXT;

-- Comentários para documentar as colunas
COMMENT ON COLUMN public.tasks.suggested_due_date IS 'Data sugerida pelo colaborador ao solicitar prorrogação';
COMMENT ON COLUMN public.tasks.extension_reason IS 'Justificativa fornecida pelo colaborador para a solicitação de prorrogação';
