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

    if (!payload.phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: phone" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
    let contextNotification: any = null;
    if (employee) {
      const { data: recentNotif } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_phone", payload.phone)
        .in("status", ["sent", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      contextNotification = recentNotif;
    }
    const notificationId = contextNotification?.id || null;

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
      console.log(`Processing command from gestor ${employee.name}`);

      // Buscar funcionários da empresa para o contexto da IA
      const { data: coworkers } = await supabase
        .from("employees")
        .select("id, name")
        .eq("company_id", employee.company_id)
        .eq("is_active", true);

      // Buscar nome da empresa
      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", employee.company_id)
        .single();
      const companyName = companyData?.name || "Empresa";

      const employeeList = coworkers?.map((e: any) => `- ${e.name} (ID: ${e.id})`).join("\n") || "";

      const today = new Date().toISOString().split("T")[0];
      const dayOfWeek = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][new Date().getDay()];

      const prompt = `Você é um assistente de gestão. Extraia os detalhes da tarefa da mensagem: "${payload.responseValue}"
      
      Data atual: ${today} (${dayOfWeek})
      
      Funcionários disponíveis:
      ${employeeList}
      
      Regras:
      - Responsável: Identifique quem deve fazer. Se não identificar, use null.
      - Título: Resumo curto e claro da tarefa.
      - Prazo: Calcule a data exata baseado na data atual. "amanhã" = dia seguinte, "sexta" = próxima sexta-feira, etc.
      - Horário: Se a mensagem mencionar um horário específico (ex: "às 14h", "até as 10:00"), extraia-o no formato HH:MM. Se não mencionar horário, use null.
      
      Retorne JSON: {"is_task": boolean, "title": string, "assignee_id": string | null, "due_date": "YYYY-MM-DD" | null, "due_time": "HH:MM" | null}`;

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
          // Use extracted time, or default to 18:00 Brasília (21:00 UTC)
          const dueTime = taskDetails.due_time || "18:00";
          const [dtH, dtM] = dueTime.split(":").map(Number);
          const utcH = dtH + 3; // BRT (UTC-3) to UTC
          const utcTimeStr = `${String(utcH).padStart(2, "0")}:${String(dtM).padStart(2, "0")}:00Z`;

          const { data: newTask } = await supabase
            .from("tasks")
            .insert({
              company_id: employee.company_id,
              title: taskDetails.title,
              assignee_id: taskDetails.assignee_id,
              created_by: employee.id,
              due_date: taskDetails.due_date ? `${taskDetails.due_date}T${utcTimeStr}` : null,
              status: "pendente",
              priority: "média"
            })
            .select().single();

          if (newTask) {
            actionTaken = "task_created";
            const assignee = coworkers?.find((e: any) => e.id === taskDetails.assignee_id);
            const prazoFormatado = taskDetails.due_date
              ? `${new Date(taskDetails.due_date + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} às ${dueTime}`
              : "Não definido";

            confirmationMessage = `✅ *Tarefa criada com sucesso!*\n\n📋 *Tarefa:* ${newTask.title}\n👤 *Responsável:* ${assignee?.name || "Não identificado"}\n📅 *Prazo:* ${prazoFormatado}\n🏢 *Empresa:* ${companyName}`;

            // @ts-ignore: Deno global
            const evolutionUrl = Deno.env.get("EVOLUTION_URL");
            // @ts-ignore: Deno global
            const evolutionKey = Deno.env.get("EVOLUTION_KEY");

            if (evolutionUrl && evolutionKey) {
              const sendWhatsApp = async (phone: string, text: string, label: string) => {
                try {
                  const sendUrl = `${evolutionUrl}/message/sendText/${payload.instance}`;
                  const sendResp = await fetch(sendUrl, {
                    method: "POST",
                    headers: { "apikey": evolutionKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ number: phone, text })
                  });
                  if (sendResp.ok) {
                    console.log(`${label}: sent successfully`);
                  } else {
                    console.error(`${label}: failed -`, await sendResp.text());
                  }
                } catch (err) {
                  console.error(`${label}: error -`, err);
                }
              };

              // 1. Confirmar ao gestor
              await sendWhatsApp(cleanPhone, confirmationMessage, "Manager confirmation");

              // 2. Notificar o colaborador atribuído
              if (assignee && taskDetails.assignee_id !== employee.id) {
                const { data: assigneeData } = await supabase
                  .from("employees")
                  .select("whatsapp_number")
                  .eq("id", taskDetails.assignee_id)
                  .single();

                if (assigneeData?.whatsapp_number) {
                  const assigneePhone = assigneeData.whatsapp_number.replace(/\D/g, "");
                  const assigneeMessage = `📋 *Nova tarefa atribuída a você!*\n\n📝 *Tarefa:* ${newTask.title}\n👤 *Atribuída por:* ${employee.name}\n📅 *Prazo:* ${prazoFormatado}\n🏢 *Empresa:* ${companyName}`;
                  await sendWhatsApp(assigneePhone, assigneeMessage, "Assignee notification");
                }
              }
            }
          }
        }
      }
    }

    // 5. Lógica Interativa: Respostas de "Tarefa Vencida"
    if (employee && contextNotification?.type === "task_overdue") {
      const response = payload.responseValue.toLowerCase().trim();
      const taskId = contextNotification.related_entity_id;

      // @ts-ignore: Deno global
      const evolutionUrl = Deno.env.get("EVOLUTION_URL");
      // @ts-ignore: Deno global
      const evolutionKey = Deno.env.get("EVOLUTION_KEY");

      const sendReply = async (text: string) => {
        if (evolutionUrl && evolutionKey) {
          const sendUrl = `${evolutionUrl}/message/sendText/${payload.instance}`;
          await fetch(sendUrl, {
            method: "POST",
            headers: { "apikey": evolutionKey, "Content-Type": "application/json" },
            body: JSON.stringify({ number: cleanPhone, text })
          });
        }
      };

      if (response === "sim" || payload.responseValue === "sim") {
        if (taskId) {
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ status: "concluido", progress: 100 })
            .eq("id", taskId);

          if (!updateError) {
            actionTaken = "task_completed_via_whatsapp";
            await sendReply("✅ Que bom! Já marquei a tarefa como concluída no sistema. Parabéns! 🚀");
          }
        }
      } else if (response === "não" || response === "nao" || payload.responseValue === "nao") {
        actionTaken = "task_overdue_not_completed";
        await sendReply("Entendido. Lembre-se que você tem 10 minutos para concluir antes que ela seja marcada como atrasada. Precisa de mais prazo? Solicite a prorrogação pelo App.");
      } else {
        // Resposta inválida para o contexto de tarefa vencida
        actionTaken = "invalid_response_to_overdue";
        await sendReply("Desculpe, não entendi sua resposta. Para esta tarefa, responda com *Sim* ou *Não*. Para outros assuntos, por favor utilize o App.");
      }
    }

    // 6. Lógica Legada: Respostas de Botão
    if (payload.responseType === "button" && notificationId && actionTaken === "none") {
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

