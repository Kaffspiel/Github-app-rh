import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusPayload {
  messageId: string;
  phone: string;
  status: "pending" | "sent" | "delivered" | "read";
  timestamp: string;
  fromMe: boolean;
  instance: string;
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

    const payload: StatusPayload = await req.json();
    console.log("Webhook status received:", JSON.stringify(payload));

    // Buscar notificação pelo messageId do WhatsApp
    const { data: notification, error: findError } = await supabase
      .from("notifications")
      .select("id")
      .eq("whatsapp_message_id", payload.messageId)
      .single();

    if (findError || !notification) {
      // Tentar buscar pelo telefone (últimas notificações)
      const { data: recentNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_phone", payload.phone)
        .eq("whatsapp_status", "sent")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentNotif) {
        // Atualizar notificação encontrada
        const updateData: Record<string, unknown> = {
          whatsapp_status: payload.status,
          whatsapp_message_id: payload.messageId,
        };

        if (payload.status === "delivered") {
          updateData.whatsapp_delivered_at = payload.timestamp;
          updateData.status = "delivered";
        } else if (payload.status === "read") {
          updateData.whatsapp_read_at = payload.timestamp;
          updateData.status = "read";
          updateData.read_at = payload.timestamp;
        }

        await supabase
          .from("notifications")
          .update(updateData)
          .eq("id", recentNotif.id);

        console.log(`Updated notification ${recentNotif.id} to status: ${payload.status}`);
      } else {
        console.log("No notification found for this status update");
      }
    } else {
      // Atualizar notificação existente
      const updateData: Record<string, unknown> = {
        whatsapp_status: payload.status,
      };

      if (payload.status === "delivered") {
        updateData.whatsapp_delivered_at = payload.timestamp;
        updateData.status = "delivered";
      } else if (payload.status === "read") {
        updateData.whatsapp_read_at = payload.timestamp;
        updateData.status = "read";
        updateData.read_at = payload.timestamp;
      }

      await supabase
        .from("notifications")
        .update(updateData)
        .eq("id", notification.id);

      console.log(`Updated notification ${notification.id} to status: ${payload.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, status: payload.status }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
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
