import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMAIN = "players.littlewoof.app";
const AVATARS = new Set(["pup", "fox", "bear", "owl", "fish", "star", "moon", "boat"]);
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

function loginName(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: cors});
  if (req.method !== "POST") return json({error: "Use POST"}, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: {persistSession: false},
  });
  const header = req.headers.get("Authorization") || "";
  const userClient = createClient(url, anon, {
    global: {headers: {Authorization: header}},
    auth: {persistSession: false},
  });
  const {data: userData, error: userError} = await userClient.auth.getUser();
  if (userError || !userData.user) return json({error: "Sign in first."}, 401);
  const caller = userData.user;
  const role = caller.app_metadata?.role;
  try {
    const body = await req.json();
    if (body.action === "create-child") return await createChild(admin, caller.id, role, body);
    if (body.action === "link-child") return await linkChild(admin, url, anon, caller.id, role, body);
    if (body.action === "reset-password") return await resetPassword(admin, caller.id, role, body);
    return json({error: "Unknown action"}, 400);
  } catch (error) {
    return json({error: error instanceof Error ? error.message : "Could not do that"}, 400);
  }
});

async function createChild(admin: ReturnType<typeof createClient>, teacherId: string, role: string, body: Record<string, unknown>) {
  if (role !== "teacher") return json({error: "Only a teacher can add a child."}, 403);
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const name = loginName(body.login_name);
  const display = String(body.display_name || "").trim();
  const avatar = AVATARS.has(String(body.avatar)) ? String(body.avatar) : "pup";
  if (!/^[a-z0-9]{2,20}$/.test(name) || !display) {
    return json({error: "Add a name and a short sign-in name, like maya."}, 400);
  }
  const {data: room, error: roomError} = await admin.from("classrooms").select("id").eq("teacher_id", teacherId).maybeSingle();
  if (roomError || !room) return json({error: "Create the class before adding a child."}, 400);
  const {data, error} = await admin.auth.admin.createUser({
    email: `${name}@${DOMAIN}`,
    password: String(body.password),
    email_confirm: true,
    app_metadata: {role: "child", classroom_id: room.id},
    user_metadata: {display_name: display.slice(0, 40), avatar, login_name: name},
  });
  if (error) return json({error: error.message}, /already|registered|exists/i.test(error.message) ? 409 : 400);
  return json({ok: true, id: data.user?.id, login_name: name});
}

async function linkChild(admin: ReturnType<typeof createClient>, url: string, anon: string, parentId: string, role: string, body: Record<string, unknown>) {
  if (role !== "parent") return json({error: "Only a parent can link a child this way."}, 403);
  const name = loginName(body.login_name);
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const check = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json"},
    body: JSON.stringify({email: `${name}@${DOMAIN}`, password: body.password}),
  });
  if (!check.ok) return json({error: "That secret did not match."}, 401);
  const {data: child, error} = await admin.from("profiles").select("id, role").eq("login_name", name).maybeSingle();
  if (error || !child || child.role !== "child") return json({error: "No child uses that sign-in name."}, 404);
  const {error: linkError} = await admin.from("guardians").upsert({parent_id: parentId, child_id: child.id});
  if (linkError) return json({error: linkError.message}, 400);
  return json({ok: true, id: child.id});
}

async function resetPassword(admin: ReturnType<typeof createClient>, callerId: string, role: string, body: Record<string, unknown>) {
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const name = loginName(body.login_name);
  const {data: child} = await admin.from("profiles").select("id, role, classroom_id").eq("login_name", name).maybeSingle();
  if (!child || child.role !== "child") return json({error: "No child uses that sign-in name."}, 404);
  let allowed = false;
  if (role === "teacher") {
    const {data: room} = await admin.from("classrooms").select("id").eq("teacher_id", callerId).eq("id", child.classroom_id).maybeSingle();
    allowed = !!room;
  } else if (role === "parent") {
    const {data: link} = await admin.from("guardians").select("child_id").eq("parent_id", callerId).eq("child_id", child.id).maybeSingle();
    allowed = !!link;
  }
  if (!allowed) return json({error: "You cannot change this secret."}, 403);
  const {error} = await admin.auth.admin.updateUserById(child.id, {password: String(body.password)});
  if (error) return json({error: error.message}, 400);
  return json({ok: true});
}
