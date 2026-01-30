import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskProgressSummary {
  employeeId: string;
  employeeName: string;
  companyId: string;
  completed: number;
  started: number;
  checklistItems: number;
  tasks: Array<{
    title: string;
    action: string;
    timestamp: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get hours to look back (default 4 hours)
    const url = new URL(req.url);
    const hoursBack = parseInt(url.searchParams.get("hours") || "4");
    const companyFilter = url.searchParams.get("company_id");

    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hoursBack);

    console.log(`Fetching task progress since ${sinceDate.toISOString()}`);

    // Fetch progress logs from the last X hours
    let query = supabase
      .from("task_progress_logs")
      .select(`
        *,
        employees!task_progress_logs_employee_id_fkey(id, name, company_id),
        tasks!task_progress_logs_task_id_fkey(id, title, company_id)
      `)
      .gte("created_at", sinceDate.toISOString())
      .order("created_at", { ascending: false });

    if (companyFilter) {
      query = query.eq("tasks.company_id", companyFilter);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      throw logsError;
    }

    if (!logs || logs.length === 0) {
      console.log("No progress logs found in the time period");
      return new Response(
        JSON.stringify({ success: true, message: "No progress to report", notifications: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Group logs by employee
    const employeeSummaries: Map<string, TaskProgressSummary> = new Map();

    for (const log of logs) {
      if (!log.employees || !log.tasks) continue;

      const employeeId = log.employee_id;
      
      if (!employeeSummaries.has(employeeId)) {
        employeeSummaries.set(employeeId, {
          employeeId,
          employeeName: log.employees.name,
          companyId: log.employees.company_id,
          completed: 0,
          started: 0,
          checklistItems: 0,
          tasks: [],
        });
      }

      const summary = employeeSummaries.get(employeeId)!;
      
      switch (log.action_type) {
        case "task_completed":
          summary.completed++;
          summary.tasks.push({
            title: log.tasks.title,
            action: "concluiu",
            timestamp: log.created_at,
          });
          break;
        case "task_started":
          summary.started++;
          summary.tasks.push({
            title: log.tasks.title,
            action: "iniciou",
            timestamp: log.created_at,
          });
          break;
        case "checklist_completed":
          summary.checklistItems++;
          if (log.checklist_item_text) {
            summary.tasks.push({
              title: `${log.tasks.title}: ${log.checklist_item_text}`,
              action: "marcou como feito",
              timestamp: log.created_at,
            });
          }
          break;
      }
    }

    // Get unique companies
    const companyIds = [...new Set([...employeeSummaries.values()].map(s => s.companyId))];

    // Get managers for each company
    const { data: managers, error: managersError } = await supabase
      .from("employees")
      .select("id, name, company_id, notify_tasks, notify_in_app")
      .in("company_id", companyIds)
      .in("role", ["admin", "gestor"]);

    if (managersError) {
      throw managersError;
    }

    // Create summary notifications for managers
    const notifications: Array<{
      type: string;
      title: string;
      message: string;
      recipient_id: string;
      channels: string[];
      priority: string;
      status: string;
      in_app_status: string;
      in_app_delivered_at: string;
    }> = [];

    for (const manager of managers || []) {
      if (!manager.notify_tasks || !manager.notify_in_app) continue;

      // Get summaries for this manager's company
      const companySummaries = [...employeeSummaries.values()].filter(
        s => s.companyId === manager.company_id
      );

      if (companySummaries.length === 0) continue;

      // Build summary message
      let message = `📊 Resumo das últimas ${hoursBack} horas:\n\n`;
      
      for (const summary of companySummaries) {
        const actions: string[] = [];
        if (summary.completed > 0) actions.push(`${summary.completed} tarefa(s) concluída(s)`);
        if (summary.started > 0) actions.push(`${summary.started} tarefa(s) iniciada(s)`);
        if (summary.checklistItems > 0) actions.push(`${summary.checklistItems} item(ns) de checklist`);

        if (actions.length > 0) {
          message += `👤 ${summary.employeeName}:\n`;
          message += actions.map(a => `   • ${a}`).join("\n");
          message += "\n\n";
        }
      }

      const totalCompleted = companySummaries.reduce((acc, s) => acc + s.completed, 0);
      const totalStarted = companySummaries.reduce((acc, s) => acc + s.started, 0);
      const totalChecklist = companySummaries.reduce((acc, s) => acc + s.checklistItems, 0);

      message += `📈 Total: ${totalCompleted} concluídas, ${totalStarted} iniciadas, ${totalChecklist} checks`;

      notifications.push({
        type: "announcement",
        title: `📋 Resumo de Progresso da Equipe`,
        message,
        recipient_id: manager.id,
        channels: ["in_app"],
        priority: "normal",
        status: "pending",
        in_app_status: "delivered",
        in_app_delivered_at: new Date().toISOString(),
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        throw insertError;
      }
    }

    console.log(`Created ${notifications.length} summary notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications: notifications.length,
        employeesWithProgress: employeeSummaries.size,
        managersNotified: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error creating progress summary:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
