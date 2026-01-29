import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResponsePayload {
  messageId: string;
  phone: string;
  pushName?: string;
  responseType: "text" | "button" | "list";
  responseValue: string;
  timestamp: string;
  instance: string;
  rawMessage?: unknown;
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

    const payload: ResponsePayload = await req.json();
    console.log("Webhook response received:", JSON.stringify(payload));

    // Buscar colaborador pelo número de WhatsApp
    const { data: employee } = await supabase
      .from("employees")
      .select("id, name")
      .eq("whatsapp_number", payload.phone)
      .single();

    // Buscar notificação recente para vincular a resposta
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

      if (recentNotif) {
        notificationId = recentNotif.id;
      }
    }

    // Inserir resposta no banco
    const { data: response, error: insertError } = await supabase
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

    if (insertError) {
      throw insertError;
    }

    console.log(`Response saved with ID: ${response.id}`);

    // Se for resposta de botão, processar ação
    if (payload.responseType === "button" && notificationId) {
      // Marcar notificação como lida
      await supabase
        .from("notifications")
        .update({
          status: "read",
          read_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", notificationId);

      console.log(`Button response processed: ${payload.responseValue}`);
    }

    // Atualizar last_seen do colaborador
    if (employee) {
      await supabase
        .from("employees")
        .update({ whatsapp_last_seen: new Date().toISOString() })
        .eq("id", employee.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        responseId: response.id,
        employeeFound: !!employee,
        notificationLinked: !!notificationId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error processing response webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
