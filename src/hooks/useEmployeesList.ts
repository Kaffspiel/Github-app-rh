import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';

export interface EmployeeBasic {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'colaborador' | 'gestor' | 'admin' | 'admin_master';
  external_id?: string | null;
  manager_id?: string | null;
  skip_time_tracking?: boolean;
  exclude_from_ranking?: boolean;
}

export function useEmployeesList() {
  const [employees, setEmployees] = useState<EmployeeBasic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { companyId } = useCompany();

  const fetchEmployees = useCallback(async () => {
    if (!companyId) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, department, role, external_id, manager_id, skip_time_tracking, exclude_from_ranking')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setEmployees((data || []).map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        department: e.department,
        role: e.role as EmployeeBasic['role'],
        external_id: e.external_id,
        manager_id: e.manager_id,
        skip_time_tracking: e.skip_time_tracking,
        exclude_from_ranking: e.exclude_from_ranking
      })));
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return { employees, isLoading, refetch: fetchEmployees };
}
