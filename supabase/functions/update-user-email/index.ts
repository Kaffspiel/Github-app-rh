// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateEmailRequest {
  userId: string;
  newEmail: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify requester is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Não autorizado");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !requestingUser) {
      console.error("Auth error:", authError?.message);
      throw new Error("Não autorizado");
    }

    // Check if requesting user is admin
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", requestingUser.id)
      .maybeSingle();

    if (roleError || !requesterRole) {
      throw new Error("Usuário sem permissões");
    }

    if (requesterRole.role !== "admin" && requesterRole.role !== "admin_master") {
      throw new Error("Apenas administradores podem alterar emails");
    }

    const body: UpdateEmailRequest = await req.json();
    const { userId, newEmail } = body;

    if (!userId || !newEmail) {
      throw new Error("userId e newEmail são obrigatórios");
    }

    console.log(`Atualizando email do usuário ${userId} para ${newEmail}`);

    // Update auth user email
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail, email_confirm: true }
    );

    if (updateError) {
      console.error("Erro ao atualizar email:", updateError);
      throw new Error(`Falha ao atualizar email: ${updateError.message}`);
    }

    console.log(`Email do usuário ${userId} atualizado com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email atualizado com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Erro na Edge Function update-user-email:", error);

    const status = error.message === "Não autorizado" || error.message === "Usuário sem permissões" ? 401 : 400;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro inesperado"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
    );
  }
});
