import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface ChecklistItemTemplate {
  text: string;
  sort_order: number;
}

export interface RoutineTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  checklist_items: ChecklistItemTemplate[];
  is_active: boolean;
  auto_assign: boolean;
  auto_assign_time: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignments?: TemplateAssignment[];
}

export interface TemplateAssignment {
  id: string;
  template_id: string;
  employee_id: string;
  employee_name?: string;
  is_active: boolean;
  created_at: string;
}

export function useRoutineTemplates() {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { companyId } = useCompany();
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    if (!companyId) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('routine_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch assignments with employee names
      const templateIds = templatesData?.map(t => t.id) || [];
      let assignmentsData: any[] = [];

      if (templateIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('routine_template_assignments')
          .select(`
            *,
            employees(name)
          `)
          .in('template_id', templateIds);

        if (assignmentsError) throw assignmentsError;
        assignmentsData = assignments || [];
      }

      // Map templates with assignments
      const enrichedTemplates: RoutineTemplate[] = (templatesData || []).map(template => {
        const templateAssignments = assignmentsData
          .filter(a => a.template_id === template.id)
          .map(a => ({
            id: a.id,
            template_id: a.template_id,
            employee_id: a.employee_id,
            employee_name: a.employees?.name,
            is_active: a.is_active,
            created_at: a.created_at,
          }));

        // Parse checklist_items safely
        let parsedChecklist: ChecklistItemTemplate[] = [];
        if (Array.isArray(template.checklist_items)) {
          parsedChecklist = template.checklist_items as unknown as ChecklistItemTemplate[];
        }

        return {
          ...template,
          checklist_items: parsedChecklist,
          assignments: templateAssignments,
        };
      });

      setTemplates(enrichedTemplates);
    } catch (err: any) {
      console.error('Error fetching routine templates:', err);
      toast({
        title: 'Erro ao carregar templates',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  const createTemplate = useCallback(async (data: {
    name: string;
    description?: string;
    checklist_items: ChecklistItemTemplate[];
    auto_assign?: boolean;
    auto_assign_time?: string;
  }) => {
    if (!companyId) return null;

    try {
      const { data: template, error } = await supabase
        .from('routine_templates')
        .insert({
          company_id: companyId,
          name: data.name,
          description: data.description,
          checklist_items: data.checklist_items as unknown as Json,
          auto_assign: data.auto_assign || false,
          auto_assign_time: data.auto_assign_time,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Template criado',
        description: `Template "${data.name}" foi criado com sucesso.`,
      });

      await fetchTemplates();
      return template;
    } catch (err: any) {
      console.error('Error creating template:', err);
      toast({
        title: 'Erro ao criar template',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [companyId, fetchTemplates, toast]);

  const updateTemplate = useCallback(async (id: string, data: Partial<{
    name: string;
    description: string;
    checklist_items: ChecklistItemTemplate[];
    is_active: boolean;
    auto_assign: boolean;
    auto_assign_time: string | null;
  }>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.checklist_items !== undefined) updateData.checklist_items = data.checklist_items as unknown as Json;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.auto_assign !== undefined) updateData.auto_assign = data.auto_assign;
      if (data.auto_assign_time !== undefined) updateData.auto_assign_time = data.auto_assign_time;

      const { error } = await supabase
        .from('routine_templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template atualizado',
        description: 'As alterações foram salvas.',
      });

      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error updating template:', err);
      toast({
        title: 'Erro ao atualizar template',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTemplates, toast]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('routine_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template excluído',
        description: 'O template foi removido.',
      });

      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast({
        title: 'Erro ao excluir template',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTemplates, toast]);

  const assignTemplate = useCallback(async (templateId: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('routine_template_assignments')
        .insert({
          template_id: templateId,
          employee_id: employeeId,
        });

      if (error) throw error;

      toast({
        title: 'Colaborador atribuído',
        description: 'O colaborador receberá as rotinas automaticamente.',
      });

      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error assigning template:', err);
      toast({
        title: 'Erro ao atribuir template',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTemplates, toast]);

  const unassignTemplate = useCallback(async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('routine_template_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Atribuição removida',
        description: 'O colaborador não receberá mais estas rotinas.',
      });

      await fetchTemplates();
      return true;
    } catch (err: any) {
      console.error('Error unassigning template:', err);
      toast({
        title: 'Erro ao remover atribuição',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTemplates, toast]);

  const createTaskFromTemplate = useCallback(async (templateId: string, employeeId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template || !companyId) return null;

    try {
      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          company_id: companyId,
          title: template.name,
          description: template.description,
          priority: 'média',
          status: 'pendente',
          assignee_id: employeeId,
          is_daily_routine: true,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create checklist items
      if (template.checklist_items.length > 0) {
        const checklistInserts = template.checklist_items.map(item => ({
          task_id: task.id,
          text: item.text,
          sort_order: item.sort_order,
          completed: false,
        }));

        const { error: checklistError } = await supabase
          .from('task_checklist_items')
          .insert(checklistInserts);

        if (checklistError) throw checklistError;
      }

      toast({
        title: 'Tarefa criada',
        description: `Tarefa "${template.name}" criada a partir do template.`,
      });

      return task;
    } catch (err: any) {
      console.error('Error creating task from template:', err);
      toast({
        title: 'Erro ao criar tarefa',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [templates, companyId, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    assignTemplate,
    unassignTemplate,
    createTaskFromTemplate,
  };
}
