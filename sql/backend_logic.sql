-- Add points column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- Function to calculate total points for an employee
CREATE OR REPLACE FUNCTION public.calculate_employee_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.employees
  SET points = (
    SELECT COALESCE(SUM(points), 0)
    FROM public.occurrences
    WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
  )
  WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update points on Insert/Update/Delete in occurrences
DROP TRIGGER IF EXISTS update_points_trigger ON public.occurrences;

CREATE TRIGGER update_points_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.calculate_employee_points();
