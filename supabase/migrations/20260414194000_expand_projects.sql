
-- Add due_date to projects
ALTER TABLE public.projects 
ADD COLUMN due_date TIMESTAMPTZ;

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'participant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_members
CREATE POLICY "Users can view members of projects in their company"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.employees e ON e.company_id = p.company_id
      WHERE p.id = project_members.project_id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Gestores can manage project members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.employees e ON e.company_id = p.company_id
      WHERE p.id = project_members.project_id
      AND e.user_id = auth.uid()
      AND e.role IN ('gestor', 'admin')
    )
  );

-- Service role access
CREATE POLICY "Service role full access project_members"
  ON public.project_members FOR ALL
  USING (auth.role() = 'service_role');
