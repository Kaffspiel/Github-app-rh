-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Admin master can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can manage company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create non-recursive policies
-- Users can always view their own roles (simple direct check, no function call)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Admin master can manage all roles (direct check without function)
CREATE POLICY "Admin master full access"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin_master'
  )
);

-- Company admins can manage roles within their company
CREATE POLICY "Company admins can manage company roles"
ON public.user_roles
FOR ALL
USING (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);