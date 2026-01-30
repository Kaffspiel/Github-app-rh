-- Criar função SECURITY DEFINER para verificar role sem recursão
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS employee_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.employees WHERE user_id = user_uuid LIMIT 1;
$$;

-- Criar função helper para verificar se é admin ou gestor
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'gestor')
  );
$$;

-- Criar função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = user_uuid 
    AND role = 'admin'
  );
$$;

-- Remover políticas antigas com recursão
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Gestores can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own profile" ON public.employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON public.employees;

-- Recriar políticas usando as funções SECURITY DEFINER
CREATE POLICY "Admins can manage employees" 
ON public.employees 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Gestores can view all employees" 
ON public.employees 
FOR SELECT 
USING (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Employees can view own profile" 
ON public.employees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Employees can update own profile" 
ON public.employees 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Política para permitir inserção via service role (já existe, manter)
-- A política "Service role full access employees" já existe e funciona