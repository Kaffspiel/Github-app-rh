import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { employeeId, phone, message, type } = await req.json();

    // @ts-ignore: Deno global
    const evolutionUrl = Deno.env.get("EVOLUTION_URL");
    // @ts-ignore: Deno global
    const evolutionKey = Deno.env.get("EVOLUTION_KEY");

    if (!evolutionUrl || !evolutionKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: check if current time is within work hours
    const isWithinWorkHours = (scheduleStart: string | null): boolean => {
      const start = scheduleStart || "09:00";
      const [startH, startM] = start.split(":").map(Number);
      const workDurationHours = 9;

      const now = new Date();
      // Convert to Brazil time (UTC-3)
      const brTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const currentMinutes = brTime.getUTCHours() * 60 + brTime.getUTCMinutes();

      const startMinutes = startH * 60 + startM;
      const endMinutes = startMinutes + workDurationHours * 60;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    };

    // Get phone number from employee if not provided directly
    let targetPhone = phone;
    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore: Deno global
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!targetPhone && employeeId) {
      const { data: emp } = await supabase
        .from("employees")
        .select("whatsapp_number, whatsapp_verified, notify_whatsapp, work_schedule_start")
        .eq("id", employeeId)
        .single();

      if (!emp?.whatsapp_number) {
        console.log(`Employee ${employeeId} has no WhatsApp number, skipping notification`);
        return new Response(
          JSON.stringify({ success: false, skipped: true, error: "Employee has no WhatsApp number" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!emp.whatsapp_verified || !emp.notify_whatsapp) {
        console.log(`Employee ${employeeId}: WhatsApp not verified or notifications disabled, skipping`);
        return new Response(
          JSON.stringify({ success: false, skipped: true, error: "WhatsApp not verified or notifications disabled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Block if outside work hours
      if (!isWithinWorkHours(emp.work_schedule_start)) {
        console.log(`Notification blocked for ${employeeId}: outside work hours (schedule: ${emp.work_schedule_start || "09:00"})`);
        return new Response(
          JSON.stringify({ success: false, error: "Outside work hours", blocked: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetPhone = emp.whatsapp_number;
    } else if (targetPhone && employeeId) {
      // If phone provided but we have employeeId, still check work hours
      const { data: emp } = await supabase
        .from("employees")
        .select("work_schedule_start")
        .eq("id", employeeId)
        .single();

      if (emp && !isWithinWorkHours(emp.work_schedule_start)) {
        console.log(`Notification blocked for ${employeeId}: outside work hours`);
        return new Response(
          JSON.stringify({ success: false, error: "Outside work hours", blocked: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!targetPhone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing phone or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = targetPhone.replace(/\D/g, "");

    // Determine instance name - use first available instance
    const instanceName = "teste";

    const sendUrl = `${evolutionUrl}/message/sendText/${instanceName}`;
    const sendResp = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "apikey": evolutionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    if (!sendResp.ok) {
      const errorText = await sendResp.text();
      console.error("Evolution API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Evolution API error: ${sendResp.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendResp.json();
    console.log(`WhatsApp sent to ${cleanPhone} (type: ${type || "generic"})`);

    return new Response(
      JSON.stringify({ success: true, messageId: result?.key?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
