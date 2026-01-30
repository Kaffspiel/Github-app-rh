import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for password reset
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client to verify the requester's permissions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
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
      throw new Error("Apenas administradores podem redefinir senhas");
    }

    const body: ResetPasswordRequest = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      throw new Error("Dados incompletos");
    }

    if (newPassword.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    // Verify that target user belongs to the same company (unless admin_master)
    if (requesterRole.role === "admin") {
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("company_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (targetRole?.company_id !== requesterRole.company_id) {
        throw new Error("Você só pode redefinir senhas de usuários da sua empresa");
      }
    }

    console.log(`Resetting password for user ${userId}`);

    // Reset the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    console.log(`Password reset successful for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Senha redefinida com sucesso",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Erro ao redefinir senha" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
