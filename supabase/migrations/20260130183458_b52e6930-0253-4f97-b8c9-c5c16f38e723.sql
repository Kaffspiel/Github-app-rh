-- Tabela de templates de rotinas diárias
CREATE TABLE public.routine_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_assign BOOLEAN NOT NULL DEFAULT false,
  auto_assign_time TIME,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de atribuições de templates a funcionários
CREATE TABLE public.routine_template_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.routine_templates(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, employee_id)
);

-- Tabela de logs de progresso de tarefas para resumo periódico
CREATE TABLE public.task_progress_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'checklist_completed', 'task_started', 'task_completed'
  checklist_item_id UUID,
  checklist_item_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para routine_templates
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view templates"
ON public.routine_templates FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage templates"
ON public.routine_templates FOR ALL
USING (company_id IN (
  SELECT ur.company_id FROM user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
));

-- RLS para routine_template_assignments
ALTER TABLE public.routine_template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view assignments"
ON public.routine_template_assignments FOR SELECT
USING (template_id IN (
  SELECT id FROM routine_templates WHERE user_belongs_to_company(auth.uid(), company_id)
));

CREATE POLICY "Admins and gestores can manage assignments"
ON public.routine_template_assignments FOR ALL
USING (template_id IN (
  SELECT rt.id FROM routine_templates rt
  JOIN user_roles ur ON ur.company_id = rt.company_id
  WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
));

-- RLS para task_progress_logs
ALTER TABLE public.task_progress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access progress logs"
ON public.task_progress_logs FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Employees can insert own progress"
ON public.task_progress_logs FOR INSERT
WITH CHECK (employee_id IN (
  SELECT id FROM employees WHERE user_id = auth.uid()
));

CREATE POLICY "Gestores can view progress logs"
ON public.task_progress_logs FOR SELECT
USING (task_id IN (
  SELECT t.id FROM tasks t
  JOIN user_roles ur ON ur.company_id = t.company_id
  WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
));

-- Trigger para updated_at
CREATE TRIGGER update_routine_templates_updated_at
BEFORE UPDATE ON public.routine_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();