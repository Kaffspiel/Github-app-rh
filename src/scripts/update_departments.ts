
import { supabase } from "@/integrations/supabase/client";

export async function updateNovaPecasDepartments() {
    console.log("Iniciando atualização de departamentos para NOVAPEÇAS...");

    try {
        // 1. Encontrar o company_id da NOVAPEÇAS através de um funcionário conhecido ou busca direta
        // Como não conseguimos o ID via cURL, vamos tentar atualizar todos funcionários cujo nome da empresa (via join) seja NOVAPEÇAS
        // Ou mais simples: buscar funcionários que tenham departamentos antigos ou suspeitos e atualizar.
        // MAS o pedido foi específico: "MUDAR TODOS OS USUARIOS DA NOVAPEÇAS PARA DEPARTAMENTO GERAL"

        // Vamos buscar todas as empresas para garantir
        const { data: companies } = await supabase.from('companies').select('id, name');
        const novaPecas = companies?.find(c => c.name.toUpperCase().includes('NOVAPEÇAS'));

        if (!novaPecas) {
            console.error("Empresa NOVAPEÇAS não encontrada!");
            return;
        }

        console.log(`Empresa encontrada: ${novaPecas.name} (ID: ${novaPecas.id})`);

        const { data, error } = await supabase
            .from('employees')
            .update({ department: 'Geral' })
            .eq('company_id', novaPecas.id);

        if (error) throw error;

        console.log("Atualização concluída com sucesso!");
    } catch (error) {
        console.error("Erro na atualização:", error);
    }
}
