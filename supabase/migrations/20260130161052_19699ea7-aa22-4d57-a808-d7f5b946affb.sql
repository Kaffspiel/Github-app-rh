-- Drop all admin master policies that may cause recursion
DROP POLICY IF EXISTS "Admin master can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can manage company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Simple non-recursive policy: users can always see their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());