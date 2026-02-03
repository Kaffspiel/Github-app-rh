-- Existing Task Trigger
CREATE OR REPLACE FUNCTION public.auto_generate_points_on_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_points integer;
  v_type text;
  v_desc text;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    IF NEW.assignee_id IS NOT NULL THEN
       IF NEW.due_date IS NOT NULL AND NOW() <= (NEW.due_date::timestamp) THEN
          v_points := 10;
          v_type := 'aprovacao_tarefa';
          v_desc := 'Tarefa concluída no prazo: ' || NEW.title;
          
          INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_by)
          VALUES (NEW.company_id, NEW.assignee_id, v_type, v_points, v_desc, NULL);

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

-- Trigger for Tasks
DROP TRIGGER IF EXISTS check_task_completion_points ON public.tasks;
CREATE TRIGGER check_task_completion_points
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_points_on_task_completion();


-- NEW: Trigger for Time Tracking (Punctuality)
CREATE OR REPLACE FUNCTION public.auto_generate_points_on_time_record()
RETURNS TRIGGER AS $$
DECLARE
  v_schedule_start time;
  v_actual_entry time;
  v_points integer := 10; -- Points for punctuality
  v_tolerance interval := '10 minutes';
  v_schedule_text text;
BEGIN
  -- Only process if entry_1 is updated and is a valid time format (HH:MM)
  IF NEW.entry_1 IS NOT NULL AND (OLD.entry_1 IS NULL OR OLD.entry_1 IS DISTINCT FROM NEW.entry_1) THEN
    
    -- Get employee schedule
    SELECT work_schedule_start INTO v_schedule_text
    FROM public.employees
    WHERE id = NEW.employee_id;
    
    -- Default to 09:00 if null
    v_schedule_text := COALESCE(v_schedule_text, '09:00');
    
    BEGIN
        v_schedule_start := v_schedule_text::time;
        v_actual_entry := NEW.entry_1::time;

        -- Check if ON TIME (entry <= schedule + tolerance)
        IF v_actual_entry <= (v_schedule_start + v_tolerance) THEN
            
            -- Check for duplicates for this day/employee
            IF NOT EXISTS (
                SELECT 1 FROM public.occurrences 
                WHERE employee_id = NEW.employee_id 
                AND type = 'pontualidade_positiva'
                AND created_at::date = NEW.record_date
            ) THEN
                INSERT INTO public.occurrences (company_id, employee_id, type, points, description)
                VALUES (
                    NEW.company_id, 
                    NEW.employee_id, 
                    'pontualidade_positiva', 
                    v_points, 
                    'Pontualidade: Chegou às ' || NEW.entry_1 || ' (Previsto: ' || v_schedule_text || ')'
                );
            END IF;
        
        -- ELSE: Late -> No points (as requested "chegar atrasado não")
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore time parsing errors
        NULL;
    END;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger for Time Records
DROP TRIGGER IF EXISTS check_time_record_punctuality ON public.time_tracking_records;
CREATE TRIGGER check_time_record_punctuality
AFTER INSERT OR UPDATE ON public.time_tracking_records
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_points_on_time_record();
