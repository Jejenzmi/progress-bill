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

interface ResetPasswordRequest {
  user_id: string;
  new_password: string;
}

Deno.serve(async (req) => {
  console.log("Reset-user-password function called, method:", req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
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

    // Verify the caller is authenticated
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
      return jsonResponse(req, { error: "Only admins can reset passwords" }, 403);
    }

    // Parse request body
    const body: ResetPasswordRequest = await req.json();
    const { user_id, new_password } = body;

    console.log("Resetting password for user:", user_id);

    // Validate input
    if (!user_id || !new_password) {
      return jsonResponse(req, { error: "User ID and new password are required" }, 400);
    }

    if (new_password.length < 6) {
      return jsonResponse(req, { error: "Password must be at least 6 characters" }, 400);
    }

    // Update user password using admin API
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error("Update password error:", updateError);
      return jsonResponse(req, { error: updateError.message }, 400);
    }

    console.log("Password reset successful for user:", user_id);

    return jsonResponse(
      req,
      {
        success: true,
        message: "Password reset successfully",
      },
      200
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
