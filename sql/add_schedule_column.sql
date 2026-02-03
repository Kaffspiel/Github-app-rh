-- Add work_schedule_start column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS work_schedule_start text DEFAULT '09:00';

-- Comment on column
COMMENT ON COLUMN public.employees.work_schedule_start IS 'Horário de entrada previsto para o colaborador (ex: 09:00)';
