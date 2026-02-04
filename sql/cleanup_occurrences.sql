-- SCRIPT DE CORREÇÃO DE OCORRÊNCIAS

-- 1. REMOVER OCORRÊNCIAS INDESEJADAS
-- Este comando remove as ocorrências de pontualidade que foram geradas automaticamente
-- no horário padrão de 21:00 (que é 00:00 UTC).
DELETE FROM public.occurrences 
WHERE type = 'pontualidade_positiva' 
AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time = '21:00:00';

-- 2. DESATIVAR AUTOMAÇÃO DE PONTOS (OPCIONAL)
-- Execute estes comandos se você não quiser que o sistema gere pontos automaticamente
-- ao importar registros de ponto ou concluir tarefas.

-- Desativa pontos automáticos de batida de ponto
DROP TRIGGER IF EXISTS check_time_record_punctuality ON public.time_tracking_records;

-- Desativa pontos automáticos de conclusão de tarefas
DROP TRIGGER IF EXISTS check_task_completion_points ON public.tasks;

-- 3. RECALCULAR PONTOS DOS FUNCIONÁRIOS
-- Após deletar as ocorrências, este comando atualiza o saldo de pontos de todos
UPDATE public.employees e
SET points = (
  SELECT COALESCE(SUM(points), 0)
  FROM public.occurrences
  WHERE employee_id = e.id
);
