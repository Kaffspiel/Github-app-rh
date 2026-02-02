-- Fix RLS policy for notifications to allow inserts from authenticated users
-- This is necessary for employees to notify managers (and vice-versa)

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;

CREATE POLICY "Enable insert for authenticated users"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure users can read their own notifications (if not already covered)
-- We check if policies exist before creating to avoid errors in repeated runs, 
-- but 'CREATE POLICY IF NOT EXISTS' is not standard SQL in all postgres versions, so we use DROP IF EXISTS/CREATE.

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  -- User is the recipient directly (if recipient_id linked to auth.users)
  auth.uid() = recipient_id 
  OR 
  -- OR recipient_id is an employee ID that belongs to the auth user
  recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);
