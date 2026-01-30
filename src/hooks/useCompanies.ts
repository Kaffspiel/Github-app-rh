import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCompanyStats() {
  return useQuery({
    queryKey: ["company-stats"],
    queryFn: async () => {
      // Get company count
      const { count: companyCount, error: companyError } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (companyError) throw companyError;

      // Get employee count
      const { count: employeeCount, error: employeeError } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (employeeError) throw employeeError;

      return {
        activeCompanies: companyCount || 0,
        totalEmployees: employeeCount || 0,
        alerts: 0, // Placeholder for now
      };
    },
  });
}
