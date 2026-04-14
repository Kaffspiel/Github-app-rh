
-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add project_id to tasks
ALTER TABLE public.tasks
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects of their company"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = auth.uid() 
      AND e.company_id = projects.company_id
    )
  );

CREATE POLICY "Gestores can manage projects of their company"
  ON public.projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = auth.uid() 
      AND e.company_id = projects.company_id
      AND e.role IN ('gestor', 'admin')
    )
  );

-- Service role full access
CREATE POLICY "Service role full access projects"
  ON public.projects FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
