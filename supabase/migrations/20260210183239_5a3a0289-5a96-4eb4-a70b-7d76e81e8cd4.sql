
-- Create table to store accumulated absenteeism reports
CREATE TABLE public.absenteeism_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  period_start date,
  period_end date,
  company_name text,
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id)
);

-- Create table to store individual employee records within a report
CREATE TABLE public.absenteeism_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.absenteeism_reports(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  predicted_hours text,
  worked_hours text,
  bonus_hours text,
  balance text,
  absenteeism_rate numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.absenteeism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absenteeism_records ENABLE ROW LEVEL SECURITY;

-- RLS for reports
CREATE POLICY "Company users can view reports" ON public.absenteeism_reports
  FOR SELECT USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage reports" ON public.absenteeism_reports
  FOR ALL USING (company_id IN (
    SELECT ur.company_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
  ));

-- RLS for records
CREATE POLICY "Users can view records of their reports" ON public.absenteeism_records
  FOR SELECT USING (report_id IN (
    SELECT id FROM public.absenteeism_reports
    WHERE user_belongs_to_company(auth.uid(), company_id)
  ));

CREATE POLICY "Admins and gestores can manage records" ON public.absenteeism_records
  FOR ALL USING (report_id IN (
    SELECT ar.id FROM public.absenteeism_reports ar
    JOIN user_roles ur ON ur.company_id = ar.company_id
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
  ));
