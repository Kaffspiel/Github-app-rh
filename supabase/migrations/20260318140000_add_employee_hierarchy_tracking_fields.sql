-- Add manager_id, skip_time_tracking, and exclude_from_ranking columns to employees table
-- These fields support employee hierarchy and gamification/tracking configuration

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS skip_time_tracking BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exclude_from_ranking BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for manager_id lookups
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);

-- Comment the new columns
COMMENT ON COLUMN public.employees.manager_id IS 'Reference to the direct manager/supervisor of this employee';
COMMENT ON COLUMN public.employees.skip_time_tracking IS 'When true, this employee does not need to register time entries';
COMMENT ON COLUMN public.employees.exclude_from_ranking IS 'When true, this employee is excluded from gamification/points ranking';
