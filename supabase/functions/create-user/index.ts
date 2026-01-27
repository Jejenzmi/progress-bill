import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  roles: string[];
  tte_settings?: {
    signer_name: string;
    signer_position: string;
    is_active: boolean;
  };
}

Deno.serve(async (req) => {
  console.log("Create-user function called, method:", req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log("Environment check - URL exists:", !!supabaseUrl, "Service key exists:", !!serviceRoleKey, "Anon key exists:", !!anonKey);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create regular client for auth check
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      anonKey ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Verify the caller is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, roles, tte_settings } = body;

    console.log("Creating user:", { email, full_name, roles });

    // Validate input
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;
    console.log("User created with ID:", newUserId);

    // Delete default marketing role (added by trigger)
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId);

    // Add specified roles
    if (roles && roles.length > 0) {
      const roleInserts = roles.map((role) => ({
        user_id: newUserId,
        role,
      }));

      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert(roleInserts);

      if (roleInsertError) {
        console.error("Role insert error:", roleInsertError);
        // Don't fail the whole operation, user is created
      }
    }

    // Add TTE settings if provided
    if (tte_settings) {
      const { error: tteError } = await supabaseAdmin
        .from("user_tte_settings")
        .insert({
          user_id: newUserId,
          signer_name: tte_settings.signer_name,
          signer_position: tte_settings.signer_position,
          is_active: tte_settings.is_active,
        });

      if (tteError) {
        console.error("TTE settings insert error:", tteError);
        // Don't fail the whole operation
      }
    }

    console.log("User setup complete:", newUserId);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        message: `User ${full_name} created successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
