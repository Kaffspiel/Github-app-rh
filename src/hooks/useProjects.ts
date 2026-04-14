import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/hooks/use-toast';

export interface ProjectMember {
  id: string;
  project_id: string;
  employee_id: string;
  role: 'manager' | 'participant';
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  company_id: string;
  due_date: string | null;
  is_daily_routine?: boolean;
  created_at: string;
  updated_at: string;
  project_members?: ProjectMember[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  due_date?: string;
  is_daily_routine?: boolean;
  members?: { employee_id: string; role: 'manager' | 'participant' }[];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { companyId } = useCompany();
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!companyId) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members (*)
        `)
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;
      
      const projectsWithTypedMembers = (data || []).map(project => ({
        ...project,
        project_members: (project.project_members || []).map((m: any) => ({
          ...m,
          role: m.role as 'manager' | 'participant'
        }))
      })) as Project[];

      setProjects(projectsWithTypedMembers);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      toast({
        title: 'Erro ao carregar projetos',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  const createProject = async (input: CreateProjectInput) => {
    if (!companyId) return null;

    try {
      // 1. Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          company_id: companyId,
          name: input.name,
          description: input.description,
          color: input.color || '#3b82f6',
          due_date: input.due_date,
          is_daily_routine: input.is_daily_routine || false,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Add members if any
      if (input.members && input.members.length > 0) {
        const membersData = input.members.map(m => ({
          project_id: project.id,
          employee_id: m.employee_id,
          role: m.role,
        }));

        const { error: membersError } = await supabase
          .from('project_members')
          .insert(membersData);

        if (membersError) throw membersError;
      }

      toast({
        title: 'Projeto criado',
        description: `"${input.name}" foi criado com sucesso.`,
      });

      await fetchProjects();
      return project;
    } catch (err: any) {
      console.error('Error creating project:', err);
      toast({
        title: 'Erro ao criar projeto',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProject = async (projectId: string, input: CreateProjectInput) => {
    try {
      // 1. Update basic info
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: input.name,
          description: input.description,
          color: input.color,
          due_date: input.due_date,
          is_daily_routine: input.is_daily_routine,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      // 2. Update members if provided
      if (input.members) {
        // Remove old members
        const { error: deleteError } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId);

        if (deleteError) throw deleteError;

        // Insert new members
        if (input.members.length > 0) {
          const membersData = input.members.map(m => ({
            project_id: projectId,
            employee_id: m.employee_id,
            role: m.role,
          }));

          const { error: insertError } = await supabase
            .from('project_members')
            .insert(membersData);

          if (insertError) throw insertError;
        }
      }

      toast({
        title: 'Projeto atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });

      await fetchProjects();
      return true;
    } catch (err: any) {
      console.error('Error updating project:', err);
      toast({
        title: 'Erro ao atualizar projeto',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Projeto excluído',
        description: 'O projeto foi removido com sucesso.',
      });

      await fetchProjects();
      return true;
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast({
        title: 'Erro ao excluir projeto',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
