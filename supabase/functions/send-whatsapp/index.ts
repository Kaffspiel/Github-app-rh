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

    // Get phone number from employee if not provided directly
    let targetPhone = phone;
    if (!targetPhone && employeeId) {
      // @ts-ignore: Deno global
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      // @ts-ignore: Deno global
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: emp } = await supabase
        .from("employees")
        .select("whatsapp_number, whatsapp_verified, notify_whatsapp")
        .eq("id", employeeId)
        .single();

      if (!emp?.whatsapp_number) {
        return new Response(
          JSON.stringify({ success: false, error: "Employee has no WhatsApp number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!emp.whatsapp_verified || !emp.notify_whatsapp) {
        return new Response(
          JSON.stringify({ success: false, error: "WhatsApp not verified or notifications disabled" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetPhone = emp.whatsapp_number;
    }

    if (!targetPhone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing phone or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = targetPhone.replace(/\D/g, "");

    // Determine instance name - use first available instance
    const instanceName = "opscontrol";

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
