import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMAIN = "players.littlewoof.app";
const AVATARS = new Set(["pup", "fox", "bear", "owl", "fish", "star", "moon", "boat"]);
const PICTURE = /^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i;
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

function picture(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const cleaned = value.replace(/\s+/g, "");
  if (!PICTURE.test(cleaned) || cleaned.length > 180000) return null;
  return cleaned;
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
  const role = String(caller.app_metadata?.role || "");
  try {
    const body = await req.json();
    if (body.action === "create-child") return await createChild(admin, caller.id, role, body);
    if (body.action === "link-child") return await linkChild(admin, url, anon, caller.id, role, body);
    if (body.action === "reset-password") return await resetPassword(admin, caller.id, role, body);
    if (body.action === "create-grownup") return await createGrownup(admin, caller, body);
    return json({error: "Unknown action"}, 400);
  } catch (error) {
    return json({error: error instanceof Error ? error.message : "Could not do that"}, 400);
  }
});

async function callerIsAdmin(admin: ReturnType<typeof createClient>, caller: {id: string; app_metadata?: Record<string, unknown>}) {
  if (caller.app_metadata?.admin === true) return true;
  const {data, error} = await admin.from("profiles").select("is_admin").eq("id", caller.id).maybeSingle();
  if (error || !data) return false;
  return data.is_admin === true;
}

async function ensureRoom(admin: ReturnType<typeof createClient>, ownerId: string): Promise<string> {
  const existing = await admin.from("classrooms").select("id").eq("teacher_id", ownerId).maybeSingle();
  if (existing.error) throw new Error("Could not save this child yet.");
  if (existing.data?.id) return existing.data.id;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 6; attempt++) {
    let made = "";
    for (let i = 0; i < 6; i++) made += alphabet[Math.floor(Math.random() * alphabet.length)];
    const inserted = await admin.from("classrooms").insert({
      name: "Children",
      code: made,
      teacher_id: ownerId,
    }).select("id").maybeSingle();
    if (!inserted.error && inserted.data?.id) return inserted.data.id;
  }
  throw new Error("Could not save this child yet.");
}

async function createChild(admin: ReturnType<typeof createClient>, ownerId: string, role: string, body: Record<string, unknown>) {
  if (role !== "teacher" && role !== "parent") return json({error: "A grown-up needs to add a child."}, 403);
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const name = loginName(body.login_name);
  const display = String(body.display_name || "").trim();
  const avatar = AVATARS.has(String(body.avatar)) ? String(body.avatar) : "pup";
  const image = picture(body.avatar_image);
  if (!/^[a-z0-9]{2,20}$/.test(name) || !display) {
    return json({error: "Add a name and a short sign-in name, like maya."}, 400);
  }
  if (body.avatar_image && !image) return json({error: "That picture could not be saved. Try a smaller jpeg or png."}, 400);
  const roomId = await ensureRoom(admin, ownerId);
  const {data, error} = await admin.auth.admin.createUser({
    email: `${name}@${DOMAIN}`,
    password: String(body.password),
    email_confirm: true,
    app_metadata: {role: "child", classroom_id: roomId},
    user_metadata: {
      display_name: display.slice(0, 40),
      avatar,
      login_name: name,
      ...(image ? {avatar_image: image} : {}),
    },
  });
  if (error) return json({error: error.message}, /already|registered|exists/i.test(error.message) ? 409 : 400);
  const childId = data.user?.id;
  if (childId && image) {
    const saved = await admin.from("profiles").update({avatar_image: image}).eq("id", childId);
    if (saved.error) return json({error: "The child was added, but the picture was not saved."}, 400);
  }
  if (childId && role === "parent") {
    const link = await admin.from("guardians").upsert({parent_id: ownerId, child_id: childId});
    if (link.error) return json({error: link.error.message}, 400);
  }
  return json({ok: true, id: childId, login_name: name});
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

async function createGrownup(admin: ReturnType<typeof createClient>, caller: {id: string; app_metadata?: Record<string, unknown>}, body: Record<string, unknown>) {
  if (!(await callerIsAdmin(admin, caller))) {
    return json({error: "Only an admin who is already signed in can add a grown-up."}, 403);
  }
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const email = String(body.email || "").trim().toLowerCase();
  const display = String(body.display_name || "").trim();
  const makeAdmin = body.can_admin === true;
  if (!email.includes("@") || email.endsWith(`@${DOMAIN}`) || !display) {
    return json({error: "Add a name and an email a person can type."}, 400);
  }
  const {data, error} = await admin.auth.admin.createUser({
    email,
    password: String(body.password),
    email_confirm: true,
    app_metadata: {role: "teacher", admin: makeAdmin},
    user_metadata: {display_name: display.slice(0, 40)},
  });
  if (error) return json({error: error.message}, /already|registered|exists/i.test(error.message) ? 409 : 400);
  if (data.user?.id && makeAdmin) {
    await admin.from("profiles").update({is_admin: true}).eq("id", data.user.id);
  }
  return json({ok: true, id: data.user?.id});
}
