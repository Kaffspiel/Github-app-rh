
-- Migração: Corrigir RLS da Tabela de Projetos (V4 - Fim da Recursão Infinita)
-- Data: 15/04/2026

-- 0. Função Auxiliar: Verificar se é manager do projeto (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_project_manager(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    WHERE pm.project_id = p_project_id
    AND e.user_id = p_user_id
    AND pm.role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- TABELA: PROJECTS
-- ================================================

-- 1. Limpeza de políticas
DROP POLICY IF EXISTS "Users can view projects of their company" ON public.projects;
DROP POLICY IF EXISTS "Gestores can manage projects of their company" ON public.projects;
DROP POLICY IF EXISTS "Admin master full access projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can manage company projects" ON public.projects;
DROP POLICY IF EXISTS "Managers and Project Leads can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Employees can view company projects" ON public.projects;
DROP POLICY IF EXISTS "Service role full access projects" ON public.projects;

-- 2. Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. Nova Política: Administrador Master tem acesso total
CREATE POLICY "Admin master full access projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_admin_master(auth.uid()))
  WITH CHECK (public.is_admin_master(auth.uid()));

-- 4. Nova Política: Gestores Globais E Responsáveis pelo Projeto
CREATE POLICY "Managers and Project Leads can manage projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (
    -- Caso 1: Gestor Global da Empresa
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = public.projects.company_id
      AND ur.role IN ('admin', 'gestor')
    )
    OR
    -- Caso 2: Responsável Específico (via função para evitar loop)
    public.is_project_manager(auth.uid(), id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = public.projects.company_id
      AND ur.role IN ('admin', 'gestor')
    )
    OR
    public.is_project_manager(auth.uid(), id)
  );

-- 5. Nova Política: Visualização
CREATE POLICY "Employees can view company projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

-- 6. Service role
CREATE POLICY "Service role full access projects"
  ON public.projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- TABELA: PROJECT_MEMBERS
-- ================================================

-- 1. Limpeza
DROP POLICY IF EXISTS "Users can view members of projects in their company" ON public.project_members;
DROP POLICY IF EXISTS "Gestores can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Admin master full access project_members" ON public.project_members;
DROP POLICY IF EXISTS "Managers can manage company project_members" ON public.project_members;
DROP POLICY IF EXISTS "Managers and Leads can manage project_members" ON public.project_members;
DROP POLICY IF EXISTS "Employees can view company project_members" ON public.project_members;
DROP POLICY IF EXISTS "Service role full access project_members" ON public.project_members;

-- 2. Habilitar RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 3. Nova Política: Admin Master
CREATE POLICY "Admin master full access project_members"
  ON public.project_members FOR ALL
  TO authenticated
  USING (public.is_admin_master(auth.uid()))
  WITH CHECK (public.is_admin_master(auth.uid()));

-- 4. Nova Política: Gestores e Leads
CREATE POLICY "Managers and Leads can manage project_members"
  ON public.project_members FOR ALL
  TO authenticated
  USING (
    -- Caso 1: Gestor Global (através da tabela projects, sem recursão em project_members)
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_roles ur ON ur.company_id = p.company_id
      WHERE p.id = public.project_members.project_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'gestor')
    )
    OR
    -- Caso 2: Responsável Específico (usando a função SECURITY DEFINER para quebrar loop)
    public.is_project_manager(auth.uid(), project_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_roles ur ON ur.company_id = p.company_id
      WHERE p.id = public.project_members.project_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'gestor')
    )
    OR
    public.is_project_manager(auth.uid(), project_id)
  );

-- 5. Nova Política: Visualização
CREATE POLICY "Employees can view company project_members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = public.project_members.project_id
      AND public.user_belongs_to_company(auth.uid(), p.company_id)
    )
  );

-- 6. Service role
CREATE POLICY "Service role full access project_members"
  ON public.project_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
