import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface CompanyContextType {
  company: Tables<"companies"> | null;
  companyId: string | null;
  isLoading: boolean;
  error: string | null;
  refetchCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { currentCompanyId, user, isLoading: authLoading } = useAuth();
  const [company, setCompany] = useState<Tables<"companies"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = async () => {
    if (!currentCompanyId) {
      setCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", currentCompanyId)
        .single();

      if (fetchError) throw fetchError;
      setCompany(data);
    } catch (err: any) {
      console.error("Error fetching company:", err);
      setError(err.message || "Erro ao carregar empresa");
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchCompany();
    } else if (!authLoading && !user) {
      setCompany(null);
      setIsLoading(false);
    }
  }, [currentCompanyId, authLoading, user]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyId: currentCompanyId,
        isLoading: isLoading || authLoading,
        error,
        refetchCompany: fetchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
