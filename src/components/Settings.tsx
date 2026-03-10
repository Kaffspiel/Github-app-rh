import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { Settings as SettingsIcon, Save, RefreshCw } from "lucide-react";
import { EvolutionQrCode } from "./EvolutionQrCode";

export function Settings() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Evolution API States
  const [evoInstance, setEvoInstance] = useState("");
  const [evoToken, setEvoToken] = useState("");
  const [evoIntegrationId, setEvoIntegrationId] = useState<string | null>(null);

  // Gamification Weights States (starting with defaults)
  const [gamificationWeights, setGamificationWeights] = useState({
    task_completed_on_time: 10,
    task_completed_late: -5,
    task_overdue_penalty: -10,
    time_record_punctual: 10
  });

  useEffect(() => {
    if (company?.id) {
      fetchSettings();
    }
  }, [company?.id]);

  const fetchSettings = async () => {
    if (!company?.id) return;
    setFetching(true);
    try {
      // 1. Fetch Evolution API Integration
      const { data: apiData, error: apiError } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('company_id', company.id)
        .eq('provider_name', 'evolution_api')
        .maybeSingle();

      if (apiError && apiError.code !== 'PGRST116') throw apiError;
      
      if (apiData) {
        setEvoIntegrationId(apiData.id);
        const settings = apiData.settings as Record<string, any>;
        setEvoInstance(settings?.instance_name || "");
        setEvoToken(settings?.api_token || "");
      }

      // 2. Fetch Gamification weights from company settings
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', company.id)
        .single();
      
      if (companyError) throw companyError;

      const compSettings = companyData.settings as Record<string, any>;
      if (compSettings?.gamification_weights) {
        setGamificationWeights({
          ...gamificationWeights,
          ...compSettings.gamification_weights
        });
      }

    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setFetching(false);
    }
  };

  const handleSaveEvolutionAPI = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const integrationData = {
        company_id: company.id,
        provider_name: 'evolution_api',
        display_name: 'Evolution API (WhatsApp)',
        auth_type: 'api_key',
        is_active: true,
        settings: {
          instance_name: evoInstance,
          api_token: evoToken
        }
      };

      if (evoIntegrationId) {
        // Update existing
        const { error } = await supabase
          .from('api_integrations')
          .update(integrationData)
          .eq('id', evoIntegrationId);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('api_integrations')
          .insert([integrationData]);
        if (error) throw error;
        // Re-fetch to get the ID
        fetchSettings();
      }
      
      toast.success("Configurações da Evolution API salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving Evolution API:", error);
      toast.error("Erro ao salvar Evolution API");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGamification = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      // First get current settings to merge
      const { data: currentCompany, error: fetchError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', company.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentSettings = (currentCompany.settings as Record<string, any>) || {};
      const newSettings = {
        ...currentSettings,
        gamification_weights: gamificationWeights
      };

      const { error } = await supabase
        .from('companies')
        .update({ settings: newSettings })
        .eq('id', company.id);

      if (error) throw error;
      toast.success("Pesos de gamificação atualizados!");
    } catch (error: any) {
      console.error("Error saving Gamification Settings:", error);
      toast.error("Erro ao atualizar gamificação");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações Avançadas</h1>
          <p className="text-gray-500">Gerencie integrações e regras do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="evolution" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="evolution">Evolution API</TabsTrigger>
          <TabsTrigger value="gamification">Gamificação</TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integração Whatsapp (Evolution API)</CardTitle>
              <CardDescription>
                Configure os dados da instância da Evolution API (a Base URL padrão já está definida na infraestrutura).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="evo-instance">Nome da Instância</Label>
                <Input 
                  id="evo-instance" 
                  placeholder="Ex: empresa_whatsapp_1" 
                  value={evoInstance}
                  onChange={(e) => setEvoInstance(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Preencha apenas o nome da Instância configurada para esta empresa em específico. Se ficar vazio, usará a instância global "teste".
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evo-token">Token da Instância (Opcional)</Label>
                <Input 
                  id="evo-token" 
                  type="password"
                  placeholder="••••••••••••" 
                  value={evoToken}
                  onChange={(e) => setEvoToken(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleSaveEvolutionAPI} 
                disabled={loading}
                className="w-full md:w-auto mt-4"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Instância
              </Button>

              <div className="pt-6 border-t mt-6">
                <h3 className="text-lg font-medium mb-4">Conectar WhatsApp</h3>
                <EvolutionQrCode instanceName={evoInstance} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamification" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pesos de Gamificação</CardTitle>
              <CardDescription>
                Ajuste os pontos concedidos ou retirados automaticamente pelas ações no sistema. 
                (Para que essas regras passem a afetar o backend, os gatilhos no banco de dados devem ser ajustados para ler estas variáveis).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="task_completed_on_time">Tarefa concluída no prazo</Label>
                  <Input 
                    id="task_completed_on_time" 
                    type="number"
                    value={gamificationWeights.task_completed_on_time}
                    onChange={(e) => setGamificationWeights(prev => ({...prev, task_completed_on_time: parseInt(e.target.value) || 0}))}
                  />
                  <p className="text-xs text-gray-500">Valor padrão: 10</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_completed_late">Tarefa concluída com atraso</Label>
                  <Input 
                    id="task_completed_late" 
                    type="number"
                    value={gamificationWeights.task_completed_late}
                    onChange={(e) => setGamificationWeights(prev => ({...prev, task_completed_late: parseInt(e.target.value) || 0}))}
                  />
                  <p className="text-xs text-gray-500">Valor padrão: -5 (Deve ser negativo)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_overdue_penalty">Penalidade por tarefa atrasar</Label>
                  <Input 
                    id="task_overdue_penalty" 
                    type="number"
                    value={gamificationWeights.task_overdue_penalty}
                    onChange={(e) => setGamificationWeights(prev => ({...prev, task_overdue_penalty: parseInt(e.target.value) || 0}))}
                  />
                  <p className="text-xs text-gray-500">Valor padrão: -10 (Deve ser negativo)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_record_punctual">Pontualidade no Ponto (Entrada)</Label>
                  <Input 
                    id="time_record_punctual" 
                    type="number"
                    value={gamificationWeights.time_record_punctual}
                    onChange={(e) => setGamificationWeights(prev => ({...prev, time_record_punctual: parseInt(e.target.value) || 0}))}
                  />
                  <p className="text-xs text-gray-500">Valor padrão: 10</p>
                </div>
              </div>

              <Button 
                onClick={handleSaveGamification} 
                disabled={loading}
                className="w-full md:w-auto mt-6"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Pesos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
