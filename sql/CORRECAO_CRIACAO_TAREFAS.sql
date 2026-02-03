-- ==============================================================================
-- CORREÇÃO DE PERMISSÃO DE CRIAÇÃO DE TAREFAS (COLABORADOR)
-- ==============================================================================

-- Permite que colaboradores criem tarefas para si mesmos
-- (Ou seja, onde assignee_id corresponde ao seu ID de funcionário)

DROP POLICY IF EXISTS "Collaborators can create tasks" ON public.tasks;

CREATE POLICY "Collaborators can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  -- O usuário só pode criar tarefa se ele mesmo for o responsável
  assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  -- Opcional: garantir que o company_id seja o mesmo do usuário (já coberto por RLS de visualização normalmente, mas bom reforçar)
  AND company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
);
