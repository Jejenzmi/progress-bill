import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-authorization";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*";
  const requestedHeaders = req.headers.get("Access-Control-Request-Headers");
  const requestedMethod = req.headers.get("Access-Control-Request-Method");

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers": requestedHeaders ?? DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": requestedMethod
      ? `OPTIONS, ${requestedMethod}`
      : "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

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
    console.log("CORS preflight:", {
      origin: req.headers.get("Origin"),
      requestMethod: req.headers.get("Access-Control-Request-Method"),
      requestHeaders: req.headers.get("Access-Control-Request-Headers"),
    });
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log("Environment check - URL exists:", !!supabaseUrl, "Service key exists:", !!serviceRoleKey, "Anon key exists:", !!anonKey);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return jsonResponse(req, { error: "Server configuration error" }, 500);
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
      return jsonResponse(req, { error: "Missing authorization header" }, 401);
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
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("Role check error:", roleError);
      return jsonResponse(req, { error: "Failed to verify permissions" }, 500);
    }

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse(req, { error: "Only admins can create users" }, 403);
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, roles, tte_settings } = body;

    console.log("Creating user:", { email, full_name, roles });

    // Validate input
    if (!email || !password || !full_name) {
      return jsonResponse(req, { error: "Email, password, and full name are required" }, 400);
    }

    if (password.length < 6) {
      return jsonResponse(req, { error: "Password must be at least 6 characters" }, 400);
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
      return jsonResponse(req, { error: createError.message }, 400);
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

    return jsonResponse(
      req,
      {
        success: true,
        user_id: newUserId,
        message: `User ${full_name} created successfully`,
      },
      200
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
