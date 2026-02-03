-- Script to Backfill Punctuality Points for existing records
DO $$
DECLARE
  r RECORD;
  v_schedule_text text;
  v_schedule_time time;
  v_entry_time time;
  v_tolerance interval := '10 minutes';
  v_points integer := 10;
  v_inserted_count integer := 0;
BEGIN
  -- Iterate through all time records that have a valid entry_1
  FOR r IN 
    SELECT * FROM public.time_tracking_records 
    WHERE entry_1 IS NOT NULL AND entry_1::text <> '' -- Ensure not empty if it were text, but for time types IS NOT NULL is main check
  LOOP
    
    -- Get Employee Schedule
    SELECT work_schedule_start INTO v_schedule_text
    FROM public.employees
    WHERE id = r.employee_id;

    -- Default to 09:00 if undefined
    v_schedule_text := COALESCE(v_schedule_text, '09:00');

    BEGIN
      v_schedule_time := v_schedule_text::time;
      v_entry_time := r.entry_1::time;

      -- Check Punctuality Rule (Entry <= Schedule + Tolerance)
      IF v_entry_time <= (v_schedule_time + v_tolerance) THEN
        
        -- Check if points already exist for this record (prevent duplicates)
        -- We assume one 'pontualidade_positiva' per employee per day
        IF NOT EXISTS (
            SELECT 1 FROM public.occurrences 
            WHERE employee_id = r.employee_id 
            AND type = 'pontualidade_positiva'
            AND created_at::date = r.record_date
        ) THEN
            
            INSERT INTO public.occurrences (company_id, employee_id, type, points, description, created_at)
            VALUES (
                r.company_id, 
                r.employee_id, 
                'pontualidade_positiva', 
                v_points, 
                'Pontualidade (Retroativo): Chegou às ' || r.entry_1 || ' (Previsto: ' || v_schedule_text || ')',
                r.created_at -- Preserve original timestamp order if possible, or use now()
            );
            
            v_inserted_count := v_inserted_count + 1;
        END IF;

      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore parsing errors for backfill
      RAISE NOTICE 'Skipping record % due to time parsing error: %', r.id, SQLERRM;
    END;

  END LOOP;

  RAISE NOTICE 'Backfill complete. Inserted % new punctuality records.', v_inserted_count;
END;
$$;
