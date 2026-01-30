import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationRequest {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
  relatedEntityType?: string;
  relatedEntityId?: string;
  senderId?: string;
  senderName?: string;
  n8nWebhookUrl: string;
  evolutionInstance?: string;
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

    const request: SendNotificationRequest = await req.json();
    console.log("Send notification request:", JSON.stringify(request));

    // Buscar colaborador destinatário
    const { data: recipient, error: recipientError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", request.recipientId)
      .single();

    if (recipientError || !recipient) {
      throw new Error(`Recipient not found: ${request.recipientId}`);
    }

    // Verificar preferências de notificação
    const canSendWhatsApp = 
      recipient.notify_whatsapp && 
      recipient.whatsapp_verified && 
      recipient.whatsapp_number;

    const channels: string[] = [];
    if (recipient.notify_in_app) channels.push("in_app");
    if (canSendWhatsApp) channels.push("whatsapp");

    if (channels.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No notification channels available for this recipient" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verificar horário silencioso
    if (recipient.quiet_hours_start && recipient.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = recipient.quiet_hours_start.split(":").map(Number);
      const [endHour, endMin] = recipient.quiet_hours_end.split(":").map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      const inQuietHours = startTime > endTime
        ? currentTime >= startTime || currentTime <= endTime
        : currentTime >= startTime && currentTime <= endTime;

      if (inQuietHours) {
        // Remover WhatsApp dos canais durante horário silencioso
        const whatsappIndex = channels.indexOf("whatsapp");
        if (whatsappIndex > -1) {
          channels.splice(whatsappIndex, 1);
        }
        console.log("Quiet hours active, WhatsApp disabled");
      }
    }

    // Criar notificação no banco
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        type: request.type,
        title: request.title,
        message: request.message,
        recipient_id: request.recipientId,
        recipient_phone: recipient.whatsapp_number,
        sender_id: request.senderId,
        sender_name: request.senderName,
        channels,
        priority: request.priority || "normal",
        related_entity_type: request.relatedEntityType,
        related_entity_id: request.relatedEntityId,
        status: "pending",
        in_app_status: "delivered",
        in_app_delivered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (notifError) {
      throw notifError;
    }

    console.log(`Notification created with ID: ${notification.id}`);

    // Se WhatsApp está habilitado, enviar para n8n
    let whatsappResult: { sent: boolean; messageId?: string; error?: string } | null = null;
    if (channels.includes("whatsapp") && request.n8nWebhookUrl) {
      const evolutionPayload = {
        instanceName: request.evolutionInstance || "default",
        number: recipient.whatsapp_number,
        messageType: "text",
        text: {
          message: request.message,
        },
        metadata: {
          notificationId: notification.id,
          notificationType: request.type,
        },
      };

      // Adicionar à fila
      await supabase
        .from("notification_queue")
        .insert({
          notification_id: notification.id,
          webhook_url: request.n8nWebhookUrl,
          payload: evolutionPayload,
          status: "queued",
        });

      // Tentar enviar para n8n
      try {
        const n8nResponse = await fetch(request.n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(evolutionPayload),
        });

        const responseText = await n8nResponse.text();
        console.log(`n8n response status: ${n8nResponse.status}, body: ${responseText}`);
        
        let n8nData: { success?: boolean; messageId?: string; error?: string };
        try {
          n8nData = JSON.parse(responseText);
        } catch {
          // Se não for JSON, considerar como sucesso se status for OK
          n8nData = { success: n8nResponse.ok, messageId: "sent" };
        }
        
        if (n8nResponse.ok && (n8nData.success !== false)) {
          // Atualizar notificação com status de envio
          await supabase
            .from("notifications")
            .update({
              status: "sent",
              whatsapp_status: "sent",
              whatsapp_message_id: n8nData.messageId || "sent",
              whatsapp_instance: request.evolutionInstance || "default",
              whatsapp_sent_at: new Date().toISOString(),
              sent_at: new Date().toISOString(),
            } as Record<string, unknown>)
            .eq("id", notification.id);

          // Atualizar fila
          await supabase
            .from("notification_queue")
            .update({
              status: "completed",
              response_success: true,
              response_message_id: n8nData.messageId || "sent",
              response_timestamp: new Date().toISOString(),
              processed_at: new Date().toISOString(),
            } as Record<string, unknown>)
            .eq("notification_id", notification.id);

          whatsappResult = { sent: true, messageId: n8nData.messageId || "sent" };
        } else {
          throw new Error(n8nData.error || `n8n webhook failed: ${responseText}`);
        }
      } catch (n8nError: unknown) {
        console.error("Error sending to n8n:", n8nError);
        const n8nErrorMessage = n8nError instanceof Error ? n8nError.message : "Unknown error";
        
        // Atualizar fila com erro
        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            response_success: false,
            response_error: n8nErrorMessage,
            response_timestamp: new Date().toISOString(),
            attempts: 1,
          } as Record<string, unknown>)
          .eq("notification_id", notification.id);

        whatsappResult = { sent: false, error: n8nErrorMessage };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        channels,
        whatsapp: whatsappResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error sending notification:", error);
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
