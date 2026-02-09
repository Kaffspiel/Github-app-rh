// @ts-ignore: Deno types not available in local IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno types not available in local IDE
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResponsePayload {
  messageId: string;
  phone: string;
  pushName?: string;
  responseType: "text" | "button" | "list" | "audio_transcription";
  responseValue: string;
  timestamp: string;
  instance: string;
  rawMessage?: unknown;
}

// @ts-ignore: Deno global not recognized in local IDE
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno global not recognized in local IDE
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore: Deno global not recognized in local IDE
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // @ts-ignore: Deno global not recognized in local IDE
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ResponsePayload = await req.json();
    console.log("Central Webhook received:", JSON.stringify(payload));

    // 1. Identificar Colaborador
    const cleanPhone = payload.phone.replace(/\D/g, "");
    // Use limit(1) instead of single() to avoid error when multiple employees share the same number
    const { data: employeeRows } = await supabase
      .from("employees")
      .select("id, name, role, company_id")
      .eq("whatsapp_number", cleanPhone)
      .eq("is_active", true)
      .not("company_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);
    const employee = employeeRows?.[0] || null;
    console.log("Employee lookup result:", employee ? `${employee.name} (${employee.role})` : "not found");

    // 2. Vincular Notificação (se existir contexto)
    let notificationId: string | null = null;
    if (employee) {
      const { data: recentNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_phone", payload.phone)
        .in("status", ["sent", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (recentNotif) notificationId = recentNotif.id;
    }

    // 3. Salvar Resposta no Banco
    const { data: responseRecord, error: insertError } = await supabase
      .from("whatsapp_responses")
      .insert({
        message_id: payload.messageId,
        phone: payload.phone,
        push_name: payload.pushName,
        instance: payload.instance,
        response_type: payload.responseType,
        response_value: payload.responseValue,
        raw_message: payload.rawMessage,
        notification_id: notificationId,
        employee_id: employee?.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    let actionTaken = "none";
    let confirmationMessage = null;

    // 4. Lógica de IA: Criação de Tarefas por Gestores
    // Ativa se for texto/áudio e o colaborador for gestor/admin
    const isCommand = (payload.responseType === "text" || payload.responseType === "audio_transcription");
    const isManager = employee && ["admin", "gestor"].includes(employee.role);

    if (isCommand && isManager && openaiKey) {
      // Verificar se a mensagem parece um comando de tarefa (heurística simples ou sempre passar pela IA?)
      // Vamos passar pela IA sempre que o gestor enviar uma mensagem que não seja resposta de botão
      console.log(`Processing command from gestor ${employee.name}`);

      // Buscar funcionários da empresa para o contexto da IA
      const { data: coworkers } = await supabase
        .from("employees")
        .select("id, name")
        .eq("company_id", employee.company_id)
        .eq("is_active", true);

      const employeeList = coworkers?.map((e: any) => `- ${e.name} (ID: ${e.id})`).join("\n") || "";

      const prompt = `Você é um assistente de gestão. Extraia os detalhes da tarefa da mensagem: "${payload.responseValue}"
      Funcionários disponíveis:
      ${employeeList}
      
      Regras:
      - Responsável: Identifique quem deve fazer.
      - Título: Resumo curto.
      - Prazo: Identifique datas (amanhã, segunda, dd/mm).
      
      Retorne JSON: {"is_task": boolean, "title": string, "assignee_id": string, "due_date": "YYYY-MM-DD"}`;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const taskDetails = JSON.parse(aiData.choices[0].message.content);

        if (taskDetails.is_task && taskDetails.assignee_id) {
          const { data: newTask } = await supabase
            .from("tasks")
            .insert({
              company_id: employee.company_id,
              title: taskDetails.title,
              assignee_id: taskDetails.assignee_id,
              created_by: employee.id,
              due_date: taskDetails.due_date ? `${taskDetails.due_date}T23:59:59Z` : null,
              status: "pendente",
              priority: "média"
            })
            .select().single();

          if (newTask) {
            actionTaken = "task_created";
            const assignee = coworkers?.find((e: any) => e.id === taskDetails.assignee_id);
            confirmationMessage = `✅ Tarefa criada: *${newTask.title}*\n👤 Para: ${assignee?.name}\n📅 Prazo: ${taskDetails.due_date || "Não definido"}`;
          }
        }
      }
    }

    // 5. Lógica Legada: Respostas de Botão
    if (payload.responseType === "button" && notificationId) {
      await supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", notificationId);
      actionTaken = "button_processed";
    }

    // Atualizar last_seen
    if (employee) {
      await supabase
        .from("employees")
        .update({ whatsapp_last_seen: new Date().toISOString() })
        .eq("id", employee.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: actionTaken,
        confirmationMessage,
        employeeFound: !!employee
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

