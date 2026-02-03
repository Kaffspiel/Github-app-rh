-- ==============================================================================
-- CORREÇÃO DE PERMISSÕES DE NOTIFICAÇÃO (ERRO 403 / 42501)
-- ==============================================================================
-- 
-- INSTRUÇÕES DE USO:
-- 1. Acesse o Painel do Supabase do seu projeto.
-- 2. Vá até o "SQL Editor" (ícone de terminal na barra lateral esquerda).
-- 3. Crie uma "New Query".
-- 4. Copie e cole TODO o código abaixo.
-- 5. Clique em "RUN".
--
-- O QUE ISSO FAZ:
-- Permite que qualquer usuário logado possa CRIAR notificações.
-- Isso é necessário para que um colaborador possa notificar o gestor (e vice-versa).

-- Remove a política antiga se existir (para evitar conflitos)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;

-- Cria a nova política permissiva para INSERT
CREATE POLICY "Enable insert for authenticated users"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Garante que o usuário possa ver as notificações enviadas para ele
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = recipient_id 
  OR 
  recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- FIM DO SCRIPT
