-- ==============================================================================
-- SCRIPT DE CORREÇÃO TOTAL (Permissões + Vínculo de Usuário)
-- ==============================================================================

-- 1. CORRIGIR PERMISSÕES (RLS)
-- Garante que o usuário possa consultar seus próprios dados na tabela employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.employees;

CREATE POLICY "Users can view their own profile"
ON public.employees
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- 2. CORRIGIR VÍNCULOS PERDIDOS (Auto-Link)
-- Se o usuário foi criado mas o 'user_id' não foi salvo na tabela employees,
-- este comando corrige automaticamente baseando-se no email.

UPDATE public.employees
SET user_id = auth.users.id
FROM auth.users
WHERE public.employees.email = auth.users.email
AND public.employees.user_id IS NULL;

-- 3. CONFIRMAÇÃO
-- Retorna os funcionários que agora estão vinculados corretamente
SELECT id, name, email, user_id, department, role 
FROM public.employees 
WHERE user_id IS NOT NULL;
