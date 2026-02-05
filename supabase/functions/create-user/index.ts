// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "admin" | "gestor" | "colaborador";
  department?: string;
  companyId: string;
  employeeId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for user creation
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

    // Check if requesting user is admin of the company
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", requestingUser.id)
      .maybeSingle();

    if (roleError || !requesterRole) {
      throw new Error("Usuário sem permissões");
    }

    const body: CreateUserRequest = await req.json();
    const { email, password, name, role, department, companyId, employeeId } = body;

    // Validate that requester is admin and belongs to the same company
    if (requesterRole.role !== "admin" && requesterRole.role !== "admin_master") {
      throw new Error("Apenas administradores podem criar usuários");
    }

    if (requesterRole.role === "admin" && requesterRole.company_id !== companyId) {
      throw new Error("Você só pode criar usuários para sua empresa");
    }

    // Validate inputs
    if (!email || !password || !name || !role || !companyId) {
      throw new Error("Dados incompletos");
    }

    if (password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    // Map role to app_role enum
    const appRole = role === "admin" ? "admin" : role === "gestor" ? "gestor" : "colaborador";

    console.log(`Criando usuário ${email} com role ${appRole} para a empresa ${companyId}`);

    // Create auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.error("Erro na criação do Auth:", createError);
      if (createError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ success: false, error: "Este e-mail já está cadastrado no sistema." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `Falha na autenticação: ${createError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha interna: Usuário não foi retornado pelo Supabase." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create user role
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: appRole,
        company_id: companyId,
      });

    if (roleInsertError) {
      console.error("Erro ao criar role:", roleInsertError);
      // Clean up - delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: `Falha ao atribuir permissões: ${roleInsertError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create/Update employee record
    let employeeError;

    if (employeeId) {
      // Update existing employee
      const { error } = await supabaseAdmin
        .from("employees")
        .update({
          user_id: userId,
          role: role === "admin" ? "admin" : role === "gestor" ? "gestor" : "colaborador",
        })
        .eq("id", employeeId);
      employeeError = error;
    } else {
      // Create new employee
      const { error } = await supabaseAdmin
        .from("employees")
        .insert({
          user_id: userId,
          name,
          email,
          company_id: companyId,
          role: role === "admin" ? "admin" : role === "gestor" ? "gestor" : "colaborador",
          department: department || "Geral",
          is_active: true,
        });
      employeeError = error;
    }

    if (employeeError) {
      console.error("Erro ao processar registro de funcionário:", employeeError);
      // We don't fail the whole request here because the user account and role ARE created.
      // But we log it for the admin.
    }

    console.log(`Usuário ${email} criado com sucesso (ID: ${userId})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário criado com sucesso",
        user: { id: userId, email, name, role: appRole },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Erro fatal na Edge Function create-user:", error);

    // Default to 400 for client errors (most common) or 500 for unexpected ones
    const status = error.message === "Não autorizado" || error.message === "Usuário sem permissões" ? 401 : 400;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Ocorreu um erro inesperado ao processar sua solicitação."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
    );
  }
});
