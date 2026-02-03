import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationRequest {
  recipientId?: string;
  recipientPhone?: string; // Permite envio direto por número
  type: string;
  title: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
  relatedEntityType?: string;
  relatedEntityId?: string;
  senderId?: string;
  senderName?: string;
  evolutionInstance?: string;
  // Campos opcionais para mensagens com botões
  buttons?: Array<{
    type: "reply";
    reply: { id: string; title: string };
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
    const evolutionUrl = Deno.env.get("EVOLUTION_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: SendNotificationRequest = await req.json();
    console.log("📨 Send notification request:", JSON.stringify(request));

    // Verificar credenciais Evolution
    if (!evolutionUrl || !evolutionKey) {
      console.error("❌ Evolution API credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Evolution API credentials not configured (EVOLUTION_URL or EVOLUTION_KEY missing)"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    let recipientPhone = request.recipientPhone;
    let recipientId = request.recipientId;
    let recipientName = "Destinatário";

    // Se recipientId foi fornecido, buscar dados do colaborador
    if (request.recipientId) {
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

      if (!canSendWhatsApp) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "WhatsApp notifications disabled or not configured for this recipient"
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
          console.log("🔕 Quiet hours active, notification blocked");
          return new Response(
            JSON.stringify({
              success: false,
              error: "Recipient is in quiet hours"
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
      }

      recipientPhone = recipient.whatsapp_number;
      recipientName = recipient.name;
    }

    if (!recipientPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No recipient phone number provided"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Formatar número (remover caracteres não numéricos)
    const formattedPhone = recipientPhone.replace(/\D/g, "");
    const instanceName = request.evolutionInstance || "teste";

    // Criar notificação no banco
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        type: request.type,
        title: request.title,
        message: request.message,
        recipient_id: recipientId,
        recipient_phone: formattedPhone,
        sender_id: request.senderId,
        sender_name: request.senderName,
        channels: ["whatsapp"],
        priority: request.priority || "normal",
        related_entity_type: request.relatedEntityType,
        related_entity_id: request.relatedEntityId,
        status: "pending",
        whatsapp_instance: instanceName,
      })
      .select()
      .single();

    if (notifError) {
      console.error("❌ Error creating notification:", notifError);
      throw notifError;
    }

    console.log(`✅ Notification created with ID: ${notification.id}`);

    // Determinar tipo de mensagem e endpoint
    let evolutionEndpoint: string;
    let evolutionBody: Record<string, unknown>;

    // CONVERSION TO TEXT: Buttons are failing (invalid message), so we convert them to text options automatically.
    if (request.buttons && request.buttons.length > 0) {
      console.log("🔄 Converting buttons to text to avoid API errors");
      request.message += "\n\nOpções disponíveis:";

      request.buttons.forEach((btn, index) => {
        // Handle different button structures if necessary, but standard is type='reply'
        const title = btn.reply?.title || "Opção";
        request.message += `\n${index + 1} - ${title}`;
      });

      request.message += "\n(Responda com o número opção desejada)";

      // Clear buttons to force text endpoint usage
      request.buttons = [];
    }

    if (request.buttons && request.buttons.length > 0) {
      // Mensagem com botões (Mantido apenas como fallback se a conversão acima for removida)
      evolutionEndpoint = `${evolutionUrl.replace(/\/$/, "")}/message/sendButtons/${instanceName}`;
      evolutionBody = {
        number: formattedPhone,
        title: request.title,
        description: request.message,
        footer: "OpsControl",
        buttons: request.buttons,
      };
    } else {
      // Mensagem de texto simples
      evolutionEndpoint = `${evolutionUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`;
      evolutionBody = {
        number: formattedPhone,
        text: request.message,
        delay: 1200,
      };
    }

    console.log(`📤 Sending to Evolution API: ${evolutionEndpoint}`);
    console.log(`📦 Payload:`, JSON.stringify(evolutionBody));

    // Enviar para Evolution API
    const evolutionResponse = await fetch(evolutionEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionKey,
      },
      body: JSON.stringify(evolutionBody),
    });

    const responseText = await evolutionResponse.text();
    console.log(`📥 Evolution response status: ${evolutionResponse.status}`);
    console.log(`📥 Evolution response body: ${responseText}`);

    let evolutionData: { key?: { id?: string }; error?: string; message?: string };
    try {
      evolutionData = JSON.parse(responseText);
    } catch {
      evolutionData = {};
    }

    if (evolutionResponse.ok) {
      const messageId = evolutionData.key?.id || "sent";

      // Atualizar notificação com sucesso
      await supabase
        .from("notifications")
        .update({
          status: "sent",
          whatsapp_status: "sent",
          whatsapp_message_id: messageId,
          whatsapp_sent_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      console.log(`✅ WhatsApp message sent successfully! MessageId: ${messageId}`);

      return new Response(
        JSON.stringify({
          success: true,
          notificationId: notification.id,
          messageId,
          recipient: recipientName,
          phone: formattedPhone,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      const errorMsg = evolutionData.error || evolutionData.message || responseText;

      // Atualizar notificação com erro
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          whatsapp_status: "failed",
          whatsapp_error: errorMsg,
        })
        .eq("id", notification.id);

      console.error(`❌ Evolution API error: ${errorMsg}`);

      return new Response(
        JSON.stringify({
          success: false,
          notificationId: notification.id,
          error: `Evolution API error: ${errorMsg}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error: unknown) {
    console.error("❌ Error sending notification:", error);
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
