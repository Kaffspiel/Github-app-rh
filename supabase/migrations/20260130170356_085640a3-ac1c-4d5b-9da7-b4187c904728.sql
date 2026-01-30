-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'média' CHECK (priority IN ('alta', 'média', 'baixa')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'andamento', 'concluido', 'atrasada')),
    due_date TIMESTAMP WITH TIME ZONE,
    assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_daily_routine BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task comments table
CREATE TABLE public.task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task checklist items table
CREATE TABLE public.task_checklist_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Tasks RLS policies
CREATE POLICY "Company users can view tasks"
ON public.tasks FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage tasks"
ON public.tasks FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
    )
);

CREATE POLICY "Assignees can update their tasks"
ON public.tasks FOR UPDATE
USING (
    assignee_id IN (
        SELECT id FROM employees WHERE user_id = auth.uid()
    )
);

-- Task comments RLS policies
CREATE POLICY "Company users can view comments"
ON public.task_comments FOR SELECT
USING (
    task_id IN (
        SELECT id FROM tasks WHERE user_belongs_to_company(auth.uid(), company_id)
    )
);

CREATE POLICY "Company users can add comments"
ON public.task_comments FOR INSERT
WITH CHECK (
    task_id IN (
        SELECT id FROM tasks WHERE user_belongs_to_company(auth.uid(), company_id)
    )
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Task checklist RLS policies
CREATE POLICY "Company users can view checklist"
ON public.task_checklist_items FOR SELECT
USING (
    task_id IN (
        SELECT id FROM tasks WHERE user_belongs_to_company(auth.uid(), company_id)
    )
);

CREATE POLICY "Admins gestores and assignees can manage checklist"
ON public.task_checklist_items FOR ALL
USING (
    task_id IN (
        SELECT t.id FROM tasks t
        WHERE (
            t.company_id IN (
                SELECT ur.company_id FROM user_roles ur
                WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
            )
        ) OR (
            t.assignee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
        )
    )
);

-- Add triggers for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_checklist_task_id ON public.task_checklist_items(task_id);