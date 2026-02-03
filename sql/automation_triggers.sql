-- Trigger function to automate points assignment
CREATE OR REPLACE FUNCTION public.auto_generate_points_on_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_points integer;
  v_type text;
  v_desc text;
BEGIN
  -- Check if status changed to 'concluido' (Completed)
  -- Uses IS DISTINCT FROM to handle nulls safely (though defined as string in types, good practice)
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    
    -- Must have an assignee to give points to
    IF NEW.assignee_id IS NOT NULL THEN
       
       -- Case 1: Early or On Time (including same minute)
       -- We use a small tolerance of 5 minutes just in case of clock skew, or strict comparison.
       -- Let's stick to strict comparison for simplicity: now <= due_date
       IF NEW.due_date IS NOT NULL AND NOW() <= (NEW.due_date::timestamp) THEN
          v_points := 10;
          v_type := 'aprovacao_tarefa';
          v_desc := 'Tarefa concluída no prazo: ' || NEW.title;
          
          INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_by)
          VALUES (NEW.company_id, NEW.assignee_id, v_type, v_points, v_desc, NULL); -- System generated, so created_by is NULL

       -- Case 2: Late
       ELSIF NEW.due_date IS NOT NULL AND NOW() > (NEW.due_date::timestamp) THEN
          v_points := -5;
          v_type := 'atraso_tarefa';
          v_desc := 'Tarefa concluída com atraso: ' || NEW.title;
          
          INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_by)
          VALUES (NEW.company_id, NEW.assignee_id, v_type, v_points, v_desc, NULL);
       END IF;

    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS check_task_completion_points ON public.tasks;

CREATE TRIGGER check_task_completion_points
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_points_on_task_completion();
