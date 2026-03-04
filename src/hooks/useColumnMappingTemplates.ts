import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { toast } from "sonner";
import type { ColumnMapping } from "@/services/timeImport/types";
import type { Json } from "@/integrations/supabase/types";

export interface MappingTemplate {
  id: string;
  name: string;
  source_type: string;
  mapping: ColumnMapping;
  is_default: boolean;
  created_at: string;
}

export function useColumnMappingTemplates(sourceType: string = "excel") {
  const { companyId } = useCompany();
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("column_mappings")
        .select("*")
        .eq("company_id", companyId)
        .eq("source_type", sourceType)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(
        (data || []).map((d) => ({
          id: d.id,
          name: d.name,
          source_type: d.source_type,
          mapping: d.mapping as unknown as ColumnMapping,
          is_default: d.is_default ?? false,
          created_at: d.created_at,
        }))
      );
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [companyId, sourceType]);

  const saveTemplate = async (name: string, mapping: ColumnMapping, setAsDefault = false) => {
    if (!companyId) return null;
    try {
      if (setAsDefault) {
        await supabase
          .from("column_mappings")
          .update({ is_default: false })
          .eq("company_id", companyId)
          .eq("source_type", sourceType);
      }

      const insertPayload = {
        company_id: companyId,
        name,
        source_type: sourceType,
        mapping: mapping as unknown as Json,
        is_default: setAsDefault,
      };

      const { data, error } = await supabase
        .from("column_mappings")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Modelo "${name}" salvo com sucesso!`);
      await fetchTemplates();
      return data;
    } catch (err: any) {
      toast.error(`Erro ao salvar modelo: ${err.message}`);
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("column_mappings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Modelo excluído");
      await fetchTemplates();
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    }
  };

  const setDefaultTemplate = async (id: string) => {
    if (!companyId) return;
    try {
      await supabase
        .from("column_mappings")
        .update({ is_default: false })
        .eq("company_id", companyId)
        .eq("source_type", sourceType);

      await supabase.from("column_mappings").update({ is_default: true }).eq("id", id);

      toast.success("Modelo padrão atualizado");
      await fetchTemplates();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0] ?? null;

  return { templates, isLoading, saveTemplate, deleteTemplate, setDefaultTemplate, defaultTemplate, refetch: fetchTemplates };
}
