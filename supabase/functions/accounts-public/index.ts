import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...cors, "Content-Type": "application/json"},
  });
}

function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 6) {
    return "The secret needs at least 6 characters. A pin and initials is enough, like 7234ab.";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: cors});
  if (req.method !== "POST") return json({error: "Use POST"}, 405);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {auth: {persistSession: false}},
  );
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const display = String(body.display_name || "").trim();
    const role = body.role === "teacher" ? "teacher" : "parent";
    const problem = passwordError(body.password);
    if (problem) return json({error: problem}, 400);
    if (!email.includes("@") || email.endsWith("@players.littlewoof.app") || !display) {
      return json({error: "Add a name and an email a person can type."}, 400);
    }
    const {data, error} = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      app_metadata: {role},
      user_metadata: {display_name: display.slice(0, 40)},
    });
    if (error) {
      const taken = /already|registered|exists/i.test(error.message);
      return json({error: error.message}, taken ? 409 : 400);
    }
    return json({ok: true, id: data.user?.id, role});
  } catch (error) {
    return json({error: error instanceof Error ? error.message : "Could not sign up"}, 400);
  }
});
