CREATE OR REPLACE FUNCTION get_company_ranking()
RETURNS TABLE (
  employee_id uuid,
  name text,
  total_score bigint,
  ranking bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- 1. Try to get company_id from employees (for normal collaborators)
  SELECT company_id INTO v_company_id
  FROM employees
  WHERE user_id = auth.uid();

  -- 2. If not found, try to get from user_roles (for admins/managers)
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    e.id, 
    e.name, 
    COALESCE(SUM(o.points), 0)::bigint as total_score,
    RANK() OVER (ORDER BY COALESCE(SUM(o.points), 0) DESC) as ranking
  FROM employees e
  LEFT JOIN occurrences o ON e.id = o.employee_id
  WHERE e.company_id = v_company_id
    AND (e.exclude_from_ranking IS FALSE OR e.exclude_from_ranking IS NULL)
    AND e.is_active IS TRUE
  GROUP BY e.id, e.name
  ORDER BY total_score DESC;
END;
$$;
