-- ==============================================================================
-- CORREÇÃO DE PERMISSÃO DE TAREFAS (COLABORADOR)
-- ==============================================================================

-- 1. Remove políticas antigas de UPDATE para evitar conflitos
DROP POLICY IF EXISTS "Assignees can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Collaborators can update assigned tasks" ON public.tasks;

-- 2. Cria nova política explícita para o RESPONSÁVEL da tarefa
-- Permite que o colaborador edite QUALQUER campo da tarefa se ela estiver atribuída a ele.
CREATE POLICY "Collaborators can update assigned tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  -- O usuário pode editar se for o dono da tarefa (assignee_id)
  assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
)
WITH CHECK (
  -- O usuário continua sendo o dono após a edição (não pode transferir para outro se não for gestor)
  assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- ==============================================================================
-- BÔNUS: Permissão para "Pegar" Tarefas (Auto-atribuição)
-- Se a tarefa estiver sem dono (assignee_id IS NULL), permitimos que o usuário atribua a si mesmo.
-- Se não quiser isso, basta não rodar esse bloco abaixo.

DROP POLICY IF EXISTS "Authenticated users can pick up unassigned tasks" ON public.tasks;

CREATE POLICY "Authenticated users can pick up unassigned tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  assignee_id IS NULL
  AND
  company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
)
WITH CHECK (
  assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);
