// @ts-ignore: Deno types not available in local IDE
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore: Deno types not available in local IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno types not available in local IDE
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore: Deno global not recognized in local IDE
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
        // @ts-ignore: Deno global not recognized in local IDE
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        // @ts-ignore: Deno global not recognized in local IDE
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        // @ts-ignore: Deno global not recognized in local IDE
        const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { transcription, phone } = await req.json();

        if (!transcription || !phone) {
            throw new Error('Transcription and phone are required');
        }

        console.log(`Processing WhatsApp audio from ${phone}: "${transcription}"`);

        // 1. Identify Gestor
        const cleanPhone = phone.replace(/\D/g, "");
        const { data: gestor, error: gestorError } = await supabase
            .from('employees')
            .select('id, name, company_id, role')
            .eq('whatsapp_number', cleanPhone)
            .single();

        if (gestorError || !gestor) {
            console.error('Gestor not found:', gestorError);
            throw new Error('Remetente não identificado como colaborador.');
        }

        if (!['admin', 'gestor'].includes(gestor.role)) {
            throw new Error('Apenas gestores ou administradores podem criar tarefas via áudio.');
        }

        // 2. Fetch company employees for mapping
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, name')
            .eq('company_id', gestor.company_id)
            .eq('is_active', true);

        if (employeesError) throw employeesError;

        const employeeList = employees.map((e: any) => `- ${e.name} (ID: ${e.id})`).join('\n');

        // 3. Extract intent with OpenAI
        const systemPrompt = `Você é um assistente de gestão de tarefas.
Sua missão é extrair informações de uma transcrição de áudio para criar uma tarefa.
Você receberá uma lista de funcionários da empresa e deve identificar quem é o responsável mencionado.

Contexto da Empresa (Funcionários):
${employeeList}

Hoje é: ${new Date().toLocaleDateString('pt-BR')}

Regras de Extração:
- Título: Curto e direto.
- Responsável: Identifique o ID do funcionário na lista acima que mais se aproxima do nome falado.
- Prioridade: "alta", "média" ou "baixa" (padrão "média" se não mencionado).
- Data: Se mencionado (ex: "para amanhã", "segunda-feira"), calcule a data no formato YYYY-MM-DD.

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "title": "título da tarefa",
  "assignee_id": "uuid-do-responsavel",
  "priority": "alta|média|baixa",
  "due_date": "YYYY-MM-DD ou null"
}`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Transcrição: "${transcription}"` }
                ],
                response_format: { type: "json_object" },
                temperature: 0,
            }),
        });

        if (!openaiResponse.ok) {
            throw new Error('Falha na extração de intenção via OpenAI');
        }

        const openaiData = await openaiResponse.json();
        const taskDetails = JSON.parse(openaiData.choices[0].message.content);

        // 4. Create Task
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                company_id: gestor.company_id,
                title: taskDetails.title,
                assignee_id: taskDetails.assignee_id,
                priority: taskDetails.priority || 'média',
                due_date: taskDetails.due_date ? `${taskDetails.due_date}T23:59:59Z` : null,
                created_by: gestor.id,
                status: 'pendente'
            })
            .select()
            .single();

        if (taskError) throw taskError;

        // 5. Success response
        const assignee = employees.find((e: any) => e.id === taskDetails.assignee_id);
        const confirmationMessage = `✅ Tarefa criada com sucesso!\n\n📌 *${task.title}*\n👤 Responsável: ${assignee?.name || 'Não identificado'}\n📅 Prazo: ${taskDetails.due_date || 'Não definido'}\n🔥 Prioridade: ${task.priority}`;

        return new Response(
            JSON.stringify({ success: true, task, message: confirmationMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Error:', errorMessage);
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

