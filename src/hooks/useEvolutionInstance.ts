import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";

/**
 * Hook centralizado que retorna o nome da instância Evolution API
 * configurada para a empresa atual (salva em Configurações).
 * Fallback: VITE_EVOLUTION_INSTANCE → "teste"
 */
export function useEvolutionInstance() {
  const { company } = useCompany();
  const fallback = import.meta.env.VITE_EVOLUTION_INSTANCE || "teste";
  const [instanceName, setInstanceName] = useState<string>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    const fetchInstance = async () => {
      try {
        const { data, error } = await supabase
          .from("api_integrations")
          .select("settings")
          .eq("company_id", company.id)
          .eq("provider_name", "evolution_api")
          .maybeSingle();

        if (!error && data) {
          const settings = data.settings as Record<string, any>;
          if (settings?.instance_name) {
            setInstanceName(settings.instance_name);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar instância Evolution:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstance();
  }, [company?.id]);

  return { instanceName, loading };
}
