-- ==============================================================================
-- CORREÇÃO DE ACESSO AO PERFIL DO COLABORADOR
-- ==============================================================================
--
-- PROBLEMA IDENTIFICADO:
-- O aplicativo não consegue carregar os dados do colaborador (Sessão "Perfil" ou "Home")
-- pois o usuário logado não tem permissão para SELECT na tabela `employees`.
-- 
-- SOLUÇÃO:
-- Adicionar políticas RLS (Row Level Security) que permitam ao usuário ler apenas
-- o registro da tabela `employees` que pertence a ele (onde user_id = auth.uid()).

-- Habilita RLS na tabela (garantia)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Remove política antiga se existir (evita duplicação)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.employees;

-- Cria política de leitura para o próprio usuário
CREATE POLICY "Users can view their own profile"
ON public.employees
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Opcional: Permitir que Admins/Gestores vejam todos (se necessário para outras telas)
-- Descomente se precisar que gestores vejam todos os funcionários no app
/*
CREATE POLICY "Admins/Managers can view all profiles"
ON public.employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gestor', 'admin_master')
  )
);
*/

-- Cria índice para melhorar performance da busca por user_id
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
