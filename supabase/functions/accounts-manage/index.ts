import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMAIN = "players.littlewoof.app";
const AVATARS = new Set([
  "pup", "fox", "bear", "owl", "fish", "star", "moon", "boat",
  "garden", "nap", "mail", "leap", "wave", "nudge",
]);
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
    return "The secret needs at least 6 characters.";
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

function emptyProgress() {
  return {
    post: {letters: {}, counts: {}},
    space: {letters: {}, counts: {}},
    silk: {letters: {}, counts: {}},
  };
}

type Admin = ReturnType<typeof createClient>;

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
  if (role === "child" || role === "") return json({error: "not-allowed"}, 403);
  const clock = await userClient.rpc("touch_session", {p_start: false});
  if (clock.data && clock.data.ok === false && clock.data.reason === "safety") {
    return json({error: "signed out for safety", code: "safety"}, 401);
  }
  try {
    const body = await req.json();
    if (body.action === "create-child") return await createChild(admin, caller.id, role, body);
    if (body.action === "link-children") return await linkChildren(admin, caller.id, body);
    if (body.action === "link-child") return json({error: "Pick children from the list."}, 400);
    if (body.action === "reset-password") return await resetPassword(admin, caller.id, body);
    if (body.action === "create-grownup") return await createGrownup(admin, caller.id, body);
    if (body.action === "update-child") return await updateChild(admin, caller.id, body);
    if (body.action === "update-self") return await updateSelf(admin, caller.id, body);
    if (body.action === "delete-child") return await deleteChild(admin, caller.id, body);
    if (body.action === "delete-grownup") return await deleteGrownup(admin, caller.id, body);
    if (body.action === "unlink-child") return await unlinkChild(admin, caller.id, body);
    if (body.action === "reset-progress") return await resetProgress(admin, caller.id, body);
    return json({error: "Unknown action"}, 400);
  } catch (error) {
    return json({error: error instanceof Error ? error.message : "Could not do that"}, 400);
  }
});

async function profileOf(admin: Admin, id: string) {
  const {data, error} = await admin.from("profiles").select("id, role, display_name, login_name, is_master, is_admin, avatar, avatar_image, classroom_id").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data;
}

async function callerIsMaster(admin: Admin, callerId: string) {
  const me = await profileOf(admin, callerId);
  return !!me?.is_master;
}

async function canTouch(admin: Admin, callerId: string, childId: string) {
  if (await callerIsMaster(admin, callerId)) return true;
  const link = await admin.from("guardians").select("child_id").eq("parent_id", callerId).eq("child_id", childId).maybeSingle();
  if (link.data) return true;
  const child = await profileOf(admin, childId);
  if (!child || child.role !== "child") return false;
  const room = await admin.from("classrooms").select("id").eq("teacher_id", callerId).eq("id", child.classroom_id || "00000000-0000-0000-0000-000000000000").maybeSingle();
  return !!room.data;
}

function refused() {
  return json({error: "not-linked", code: "not-linked"}, 403);
}

async function ensureRoom(admin: Admin, ownerId: string): Promise<string> {
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

async function createChild(admin: Admin, ownerId: string, role: string, body: Record<string, unknown>) {
  if (role !== "teacher" && role !== "parent") return json({error: "A grown-up needs to add a child."}, 403);
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const name = loginName(body.login_name);
  const display = String(body.display_name || "").trim();
  const avatar = AVATARS.has(String(body.avatar)) ? String(body.avatar) : "garden";
  const image = picture(body.avatar_image);
  if (!/^[a-z0-9]{2,20}$/.test(name) || !display) {
    return json({error: "Add a name and a short sign-in name, like maya."}, 400);
  }
  if (body.avatar_image && !image) return json({error: "That picture could not be saved. Try a smaller jpeg or png."}, 400);
  const roomId = role === "teacher" ? await ensureRoom(admin, ownerId) : null;
  const {data, error} = await admin.auth.admin.createUser({
    email: `${name}@${DOMAIN}`,
    password: String(body.password),
    email_confirm: true,
    app_metadata: {role: "child", ...(roomId ? {classroom_id: roomId} : {})},
    user_metadata: {
      display_name: display.slice(0, 40),
      avatar,
      login_name: name,
      ...(image ? {avatar_image: image} : {}),
    },
  });
  if (error) return json({error: error.message}, /already|registered|exists/i.test(error.message) ? 409 : 400);
  const childId = data.user?.id;
  if (childId) {
    const patch: Record<string, unknown> = {avatar};
    if (image) patch.avatar_image = image;
    await admin.from("profiles").update(patch).eq("id", childId);
    const link = await admin.from("guardians").upsert({parent_id: ownerId, child_id: childId});
    if (link.error) return json({error: link.error.message}, 400);
  }
  return json({ok: true, id: childId, login_name: name});
}

async function linkChildren(admin: Admin, callerId: string, body: Record<string, unknown>) {
  if (!(await callerIsMaster(admin, callerId))) return json({error: "Only the master can link an existing child.", code: "not-master"}, 403);
  const ids = Array.isArray(body.child_ids) ? body.child_ids.map(String) : [];
  if (!ids.length) return json({error: "Pick at least one child."}, 400);
  const linked: string[] = [];
  for (const id of ids) {
    const child = await profileOf(admin, id);
    if (!child || child.role !== "child") return json({error: "not-linked", code: "not-linked"}, 403);
    const link = await admin.from("guardians").upsert({parent_id: callerId, child_id: id});
    if (link.error) return json({error: link.error.message}, 400);
    if (body.also_parent_id && body.also_parent_id !== callerId) {
      const other = await profileOf(admin, String(body.also_parent_id));
      if (!other || other.role === "child") return json({error: "That grown-up was not found."}, 404);
      const extra = await admin.from("guardians").upsert({parent_id: other.id, child_id: id});
      if (extra.error) return json({error: extra.error.message}, 400);
    }
    linked.push(id);
  }
  return json({ok: true, ids: linked});
}

async function resetPassword(admin: Admin, callerId: string, body: Record<string, unknown>) {
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const child = body.child_id
    ? await profileOf(admin, String(body.child_id))
    : (await admin.from("profiles").select("id, role, classroom_id").eq("login_name", loginName(body.login_name)).maybeSingle()).data;
  if (!child || child.role !== "child") return json({error: "No child uses that sign-in name."}, 404);
  if (!(await canTouch(admin, callerId, child.id))) return refused();
  const {error} = await admin.auth.admin.updateUserById(child.id, {password: String(body.password)});
  if (error) return json({error: error.message}, 400);
  return json({ok: true, id: child.id});
}

async function createGrownup(admin: Admin, callerId: string, body: Record<string, unknown>) {
  if (!(await callerIsMaster(admin, callerId))) {
    return json({error: "Only the master can add a grown-up.", code: "not-master"}, 403);
  }
  const problem = passwordError(body.password);
  if (problem) return json({error: problem}, 400);
  const name = loginName(body.login_name || body.email);
  const display = String(body.display_name || "").trim();
  const image = picture(body.avatar_image);
  const avatar = AVATARS.has(String(body.avatar)) ? String(body.avatar) : "garden";
  const email = String(body.email || "").includes("@") && !String(body.email).endsWith(`@${DOMAIN}`)
    ? String(body.email).trim().toLowerCase()
    : `${name}@${DOMAIN}`;
  if (!/^[a-z0-9]{2,20}$/.test(name) || !display) {
    return json({error: "Add a name and a short sign-in name."}, 400);
  }
  const {data, error} = await admin.auth.admin.createUser({
    email,
    password: String(body.password),
    email_confirm: true,
    app_metadata: {role: "parent", admin: false},
    user_metadata: {
      display_name: display.slice(0, 40),
      login_name: name,
      avatar,
      ...(image ? {avatar_image: image} : {}),
    },
  });
  if (error) return json({error: error.message}, /already|registered|exists/i.test(error.message) ? 409 : 400);
  if (data.user?.id) {
    await admin.from("profiles").update({
      login_name: name,
      avatar,
      is_admin: false,
      is_master: false,
      ...(image ? {avatar_image: image} : {}),
    }).eq("id", data.user.id);
  }
  return json({ok: true, id: data.user?.id, login_name: name});
}

async function saveIdentity(admin: Admin, id: string, fields: {display?: string; login?: string; avatar?: string; image?: string | null; clearImage?: boolean; password?: string}) {
  const meta: Record<string, unknown> = {};
  const row: Record<string, unknown> = {};
  if (fields.display) {
    meta.display_name = fields.display.slice(0, 40);
    row.display_name = meta.display_name;
  }
  if (fields.login) {
    meta.login_name = fields.login;
    row.login_name = fields.login;
  }
  if (fields.avatar) {
    meta.avatar = fields.avatar;
    row.avatar = fields.avatar;
  }
  if (fields.image) {
    meta.avatar_image = fields.image;
    row.avatar_image = fields.image;
  } else if (fields.clearImage) {
    meta.avatar_image = null;
    row.avatar_image = null;
  }
  const authPatch: Record<string, unknown> = {};
  if (Object.keys(meta).length) authPatch.user_metadata = meta;
  if (fields.login) authPatch.email = `${fields.login}@${DOMAIN}`;
  if (fields.password) authPatch.password = fields.password;
  if (Object.keys(authPatch).length) {
    const {error} = await admin.auth.admin.updateUserById(id, authPatch);
    if (error) return error.message;
  }
  if (Object.keys(row).length) {
    const saved = await admin.from("profiles").update(row).eq("id", id);
    if (saved.error) return saved.error.message;
  }
  return "";
}

async function updateChild(admin: Admin, callerId: string, body: Record<string, unknown>) {
  const child = await profileOf(admin, String(body.child_id || ""));
  if (!child || child.role !== "child") return json({error: "No child uses that sign-in name."}, 404);
  if (!(await canTouch(admin, callerId, child.id))) return refused();
  const login = body.login_name ? loginName(body.login_name) : "";
  if (login && !/^[a-z0-9]{2,20}$/.test(login)) return json({error: "Use a short sign-in name, like maya."}, 400);
  if (body.password) {
    const problem = passwordError(body.password);
    if (problem) return json({error: problem}, 400);
  }
  const image = picture(body.avatar_image);
  if (body.avatar_image && !image) return json({error: "That picture could not be saved. Try a smaller jpeg or png."}, 400);
  const avatar = body.avatar && AVATARS.has(String(body.avatar)) ? String(body.avatar) : "";
  const problem = await saveIdentity(admin, child.id, {
    display: String(body.display_name || "").trim(),
    login,
    avatar,
    image,
    password: body.password ? String(body.password) : "",
  });
  if (problem) return json({error: problem}, /already|registered|exists/i.test(problem) ? 409 : 400);
  return json({ok: true, id: child.id});
}

async function updateSelf(admin: Admin, callerId: string, body: Record<string, unknown>) {
  const me = await profileOf(admin, callerId);
  if (!me || me.role === "child") return json({error: "not-allowed"}, 403);
  const login = body.login_name ? loginName(body.login_name) : "";
  if (login && !/^[a-z0-9]{2,20}$/.test(login)) return json({error: "Use a short sign-in name."}, 400);
  if (body.password) {
    const problem = passwordError(body.password);
    if (problem) return json({error: problem}, 400);
  }
  const image = picture(body.avatar_image);
  if (body.avatar_image && !image) return json({error: "That picture could not be saved. Try a smaller jpeg or png."}, 400);
  const avatar = body.avatar && AVATARS.has(String(body.avatar)) ? String(body.avatar) : "";
  const problem = await saveIdentity(admin, callerId, {
    display: String(body.display_name || "").trim(),
    login,
    avatar,
    image,
    clearImage: body.clear_image === true && !image,
    password: body.password ? String(body.password) : "",
  });
  if (problem) return json({error: problem}, /already|registered|exists/i.test(problem) ? 409 : 400);
  return json({ok: true, id: callerId});
}

async function deleteChild(admin: Admin, callerId: string, body: Record<string, unknown>) {
  const child = await profileOf(admin, String(body.child_id || ""));
  if (!child || child.role !== "child") return json({error: "No child uses that sign-in name."}, 404);
  if (!(await canTouch(admin, callerId, child.id))) return refused();
  const {error} = await admin.auth.admin.deleteUser(child.id);
  if (error) return json({error: error.message}, 400);
  return json({ok: true, id: child.id, display_name: child.display_name, login_name: child.login_name});
}

async function masterId(admin: Admin) {
  const {data} = await admin.from("profiles").select("id").eq("is_master", true).maybeSingle();
  return data?.id || "";
}

async function deleteGrownup(admin: Admin, callerId: string, body: Record<string, unknown>) {
  if (!(await callerIsMaster(admin, callerId))) return json({error: "Only the master can delete a grown-up.", code: "not-master"}, 403);
  const targetId = String(body.grownup_id || "");
  if (targetId === callerId) return json({error: "The master stays."}, 403);
  const target = await profileOf(admin, targetId);
  if (!target || target.role === "child") return json({error: "That grown-up was not found."}, 404);
  if (target.is_master) return json({error: "The master stays."}, 403);
  const keeper = await masterId(admin);
  const {data: links} = await admin.from("guardians").select("child_id").eq("parent_id", targetId);
  await admin.from("guardians").delete().eq("parent_id", targetId);
  for (const link of links || []) {
    const left = await admin.from("guardians").select("parent_id").eq("child_id", link.child_id);
    if (!left.data?.length && keeper && keeper !== targetId) {
      await admin.from("guardians").upsert({parent_id: keeper, child_id: link.child_id});
    }
  }
  const {error} = await admin.auth.admin.deleteUser(targetId);
  if (error) return json({error: error.message}, 400);
  return json({ok: true, id: targetId, display_name: target.display_name, login_name: target.login_name});
}

async function unlinkChild(admin: Admin, callerId: string, body: Record<string, unknown>) {
  const childId = String(body.child_id || "");
  const parentId = String(body.parent_id || callerId);
  const child = await profileOf(admin, childId);
  if (!child || child.role !== "child") return json({error: "No child uses that sign-in name."}, 404);
  const master = await callerIsMaster(admin, callerId);
  if (!master && parentId !== callerId) return refused();
  if (!master && !(await canTouch(admin, callerId, childId))) return refused();
  const {data: links} = await admin.from("guardians").select("parent_id").eq("child_id", childId);
  const parents = (links || []).map(row => row.parent_id);
  if (parents.length <= 1 && parents.includes(parentId)) {
    const keeper = await masterId(admin);
    if (!keeper || keeper === parentId) return json({error: "The last link stays."}, 403);
    await admin.from("guardians").upsert({parent_id: keeper, child_id: childId});
  }
  const removed = await admin.from("guardians").delete().eq("parent_id", parentId).eq("child_id", childId);
  if (removed.error) return json({error: removed.error.message}, 400);
  return json({ok: true, id: childId});
}

async function resetProgress(admin: Admin, callerId: string, body: Record<string, unknown>) {
  const targetId = String(body.user_id || callerId);
  const target = await profileOf(admin, targetId);
  if (!target) return json({error: "That person was not found."}, 404);
  if (target.role === "child") {
    if (!(await canTouch(admin, callerId, targetId))) return refused();
  } else if (targetId !== callerId) {
    if (!(await callerIsMaster(admin, callerId)) || target.is_master) return json({error: "not-allowed"}, 403);
  }
  const now = new Date().toISOString();
  const saved = await admin.from("learner_state").update({
    progress: emptyProgress(),
    achievements: {},
    progress_epoch: {v: now, t: now},
    updated_at: now,
  }).eq("user_id", targetId);
  if (saved.error) return json({error: saved.error.message}, 400);
  return json({ok: true, id: targetId, progressEpoch: {v: now, t: now}});
}
