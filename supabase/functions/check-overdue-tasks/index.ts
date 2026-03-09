// @ts-ignore: Deno module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore: Deno global
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // @ts-ignore: Deno global
    const evolutionUrl = Deno.env.get("EVOLUTION_URL");
    // @ts-ignore: Deno global
    const evolutionKey = Deno.env.get("EVOLUTION_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find tasks that are overdue (past due_date, status = pendente or andamento)
    const now = new Date().toISOString();
    const { data: overdueTasks, error: fetchError } = await supabase
      .from("tasks")
      .select(`
        id, title, due_date, status, company_id, assignee_id,
        assignee:employees!tasks_assignee_id_fkey(id, name, whatsapp_number, whatsapp_verified, notify_whatsapp)
      `)
      .lt("due_date", now)
      .in("status", ["pendente", "andamento"])
      .is("overdue_notified_at", null)
      .not("assignee_id", "is", null);

    if (fetchError) {
      console.error("Error fetching overdue tasks:", fetchError);
      throw fetchError;
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No overdue tasks found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${overdueTasks.length} overdue tasks`);

    // === AUTO-TIMEOUT: Mark tasks as 'atrasada' if no "Sim" response within 15 minutes ===
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: timedOutTasks } = await supabase
      .from("tasks")
      .select("id, title")
      .not("overdue_notified_at", "is", null)
      .lt("overdue_notified_at", fifteenMinAgo)
      .in("status", ["pendente", "andamento"]);

    if (timedOutTasks && timedOutTasks.length > 0) {
      console.log(`Auto-marking ${timedOutTasks.length} tasks as atrasada (no response in 15min)`);
      const timedOutIds = timedOutTasks.map((t: any) => t.id);
      await supabase
        .from("tasks")
        .update({ status: "atrasada" })
        .in("id", timedOutIds);
    }

    // Mark as notified but DON'T change status yet — only changes to 'atrasada' if user replies 'Não' or timeout
    const overdueIds = overdueTasks.map((t: any) => t.id);
    const { error: updateError, data: updatedRows } = await supabase
      .from("tasks")
      .update({ overdue_notified_at: new Date().toISOString() })
      .in("id", overdueIds)
      .select("id");

    if (updateError) {
      console.error("CRITICAL: Failed to update overdue_notified_at, aborting notifications to prevent duplicates:", updateError);
      throw updateError;
    }

    // Only notify for tasks that were actually updated (prevents duplicate notifications)
    const updatedIds = new Set((updatedRows || []).map((r: any) => r.id));
    const tasksToNotify = overdueTasks.filter((t: any) => updatedIds.has(t.id));
    console.log(`Updated ${updatedIds.size} tasks, will notify for ${tasksToNotify.length}`);

    if (tasksToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Tasks updated but no notifications needed", count: overdueIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send WhatsApp notifications to assignees and managers
    let notificationsSent = 0;

    if (evolutionUrl && evolutionKey) {
      const instanceName = "teste";

      const sendWhatsApp = async (phone: string, text: string) => {
        try {
          const cleanPhone = phone.replace(/\D/g, "");
          const sendUrl = `${evolutionUrl}/message/sendText/${instanceName}`;
          const resp = await fetch(sendUrl, {
            method: "POST",
            headers: { "apikey": evolutionKey, "Content-Type": "application/json" },
            body: JSON.stringify({ number: cleanPhone, text }),
          });
          if (resp.ok) {
            notificationsSent++;
            return true;
          }
          console.error(`WhatsApp send failed: ${resp.status}`);
          return false;
        } catch (err) {
          console.error("WhatsApp send error:", err);
          return false;
        }
      };

      // Helper: check if current time is within work hours
      const isWithinWorkHours = (scheduleStart: string | null): boolean => {
        const start = scheduleStart || "09:00";
        const [startH, startM] = start.split(":").map(Number);
        const workDurationHours = 9;
        const now = new Date();
        const brTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const currentMinutes = brTime.getUTCHours() * 60 + brTime.getUTCMinutes();
        const startMinutes = startH * 60 + startM;
        const endMinutes = startMinutes + workDurationHours * 60;
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      };

      for (const task of tasksToNotify) {
        const assignee = task.assignee as any;
        if (!assignee?.whatsapp_number || !assignee?.whatsapp_verified || !assignee?.notify_whatsapp) continue;

        // Fetch work_schedule_start for the assignee
        const { data: empData } = await supabase
          .from("employees")
          .select("work_schedule_start")
          .eq("id", assignee.id)
          .single();

        // Skip if outside work hours
        if (!isWithinWorkHours(empData?.work_schedule_start)) {
          console.log(`Skipping overdue notification for ${assignee.name}: outside work hours`);
          continue;
        }

        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString("pt-BR") : "N/A";
        const message = `⚠️ *Tarefa Vencida!*\n\n📋 *Tarefa:* ${task.title}\n👤 *Responsável:* ${assignee.name}\n📅 *Prazo:* ${dueDate}\n\nVocê já completou esta tarefa?\nResponda *Sim* ou *Não*`;

        // Create notification record linked to the task for context matching
        const { data: notifRecord } = await supabase
          .from("notifications")
          .insert({
            title: "Tarefa Vencida",
            message,
            type: "task_overdue",
            recipient_id: assignee.id,
            recipient_phone: assignee.whatsapp_number,
            company_id: task.company_id,
            related_entity_type: "task",
            related_entity_id: task.id,
            status: "sent",
            channels: ["whatsapp"],
            sent_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (notifRecord) {
          console.log(`Created notification ${notifRecord.id} for overdue task ${task.id}`);
        }

        await sendWhatsApp(assignee.whatsapp_number, message);

        // Also notify managers of the same company (only those within work hours)
        const { data: managers } = await supabase
          .from("employees")
          .select("whatsapp_number, whatsapp_verified, notify_whatsapp, name, work_schedule_start")
          .eq("company_id", task.company_id)
          .in("role", ["admin", "gestor"])
          .eq("whatsapp_verified", true)
          .eq("notify_whatsapp", true);

        if (managers) {
          for (const mgr of managers) {
            if (!mgr.whatsapp_number) continue;
            if (!isWithinWorkHours(mgr.work_schedule_start)) {
              console.log(`Skipping manager notification for ${mgr.name}: outside work hours`);
              continue;
            }
            const mgrMsg = `⚠️ *Tarefa Vencida*\n\n📋 *Tarefa:* ${task.title}\n👤 *Responsável:* ${assignee.name}\n📅 *Prazo:* ${dueDate}`;
            await sendWhatsApp(mgr.whatsapp_number, mgrMsg);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueTasks: overdueIds.length,
        notificationsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("check-overdue-tasks error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
