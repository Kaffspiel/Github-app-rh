-- 1. Remover políticas de desenvolvimento inseguras
DROP POLICY IF EXISTS "Dev: Allow anonymous access to companies" ON public.companies;
DROP POLICY IF EXISTS "Dev: Allow anonymous access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Dev: Allow anonymous access to time_tracking_records" ON public.time_tracking_records;
DROP POLICY IF EXISTS "Dev: Allow anonymous access to time_tracking_imports" ON public.time_tracking_imports;
DROP POLICY IF EXISTS "Dev: Allow anonymous access to api_integrations" ON public.api_integrations;
DROP POLICY IF EXISTS "Dev: Allow anonymous access to column_mappings" ON public.column_mappings;

-- 2. Reforçar RLS da tabela employees para filtrar por company_id
DROP POLICY IF EXISTS "Gestores can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own profile" ON public.employees;

CREATE POLICY "Employees can view own profile"
  ON public.employees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gestores can view employees of their company"
  ON public.employees FOR SELECT
  USING (
    company_id IN (
      SELECT ur.company_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
CREATE POLICY "Admins can manage employees of their company"
  ON public.employees FOR ALL
  USING (
    company_id IN (
      SELECT ur.company_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 3. Reforçar RLS da tabela notifications para filtrar por company_id
DROP POLICY IF EXISTS "Gestores can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

CREATE POLICY "Gestores can view notifications of their company"
  ON public.notifications FOR SELECT
  USING (
    company_id IN (
      SELECT ur.company_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
CREATE POLICY "Users can insert notifications within their company"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );
