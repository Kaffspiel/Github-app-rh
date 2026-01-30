-- Drop the problematic admin master policy that still causes recursion
DROP POLICY IF EXISTS "Admin master full access" ON public.user_roles;

-- Create a simpler admin master policy for SELECT (users can see all if they're admin_master)
-- This uses a CTE approach to avoid recursion
CREATE POLICY "Admin master can view all roles"
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin_master'
);

-- Admin master can INSERT roles
CREATE POLICY "Admin master can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin_master'
);

-- Admin master can UPDATE roles
CREATE POLICY "Admin master can update roles"
ON public.user_roles
FOR UPDATE
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin_master'
);

-- Admin master can DELETE roles
CREATE POLICY "Admin master can delete roles"
ON public.user_roles
FOR DELETE
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin_master'
);