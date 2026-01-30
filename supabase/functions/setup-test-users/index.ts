import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { companyId } = await req.json();

    if (!companyId) {
      throw new Error("companyId is required");
    }

    const testUsers = [
      {
        email: "admin@teste.com",
        password: "123456",
        role: "admin",
        name: "Admin Teste",
        companyId: companyId,
      },
      {
        email: "gestor@teste.com",
        password: "123456",
        role: "gestor",
        name: "Gestor Teste",
        companyId: companyId,
      },
      {
        email: "colaborador@teste.com",
        password: "123456",
        role: "colaborador",
        name: "Colaborador Teste",
        companyId: companyId,
      },
    ];

    const results = [];

    for (const user of testUsers) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          results.push({ email: user.email, status: "already exists" });
          continue;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error(`Failed to create user: ${user.email}`);
      }

      // Create user role
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: authData.user.id,
        role: user.role,
        company_id: user.role !== "admin_master" ? user.companyId : null,
      });

      if (roleError) {
        console.error("Role error for", user.email, roleError);
      }

      // Create employee record
      const { error: employeeError } = await supabaseAdmin.from("employees").insert({
        user_id: authData.user.id,
        name: user.name,
        email: user.email,
        company_id: user.companyId,
        role: user.role === "admin" ? "admin" : user.role === "gestor" ? "gestor" : "colaborador",
        department: user.role === "admin" ? "Administração" : user.role === "gestor" ? "Gestão" : "Operacional",
        is_active: true,
      });

      if (employeeError) {
        console.error("Employee error for", user.email, employeeError);
      }

      results.push({
        email: user.email,
        role: user.role,
        status: "created",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test users created",
        users: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating test users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
