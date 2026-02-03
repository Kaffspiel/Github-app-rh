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

serve(async (req) => {
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

    console.log(`Creating user ${email} with role ${appRole} for company ${companyId}`);

    // Create auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        throw new Error("Este email já está cadastrado");
      }
      throw createError;
    }

    if (!authData.user) {
      throw new Error("Falha ao criar usuário");
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
      console.error("Error creating role:", roleInsertError);
      // Try to clean up - delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Falha ao atribuir permissões");
    }

    // Create/Update employee record
    let employeeError;

    if (employeeId) {
      // Update existing employee
      const { error } = await supabaseAdmin
        .from("employees")
        .update({
          user_id: userId,
          // Update other fields to match if they were edited during user creation flow, 
          // or just rely on them being correct. Ideally we shouldn't overwrite name/email/role unless necessary,
          // but for consistency let's ensure they match the user account.
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
      console.error("Error creating employee:", employeeError);
      // Don't fail completely - user and role were created
    }

    console.log(`Successfully created user ${email} with id ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário criado com sucesso",
        user: {
          id: userId,
          email,
          name,
          role: appRole,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro ao criar usuário"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
