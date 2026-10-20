// SUPABASE_SERVICE_ROLE_KEY stays inside the Edge runtime; never send it to a browser.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
class RequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
type Fields = Record<string, unknown>;
function object(value: unknown): Fields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Expected an object.');
  return value as Fields;
}
function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new RequestError(`${label} is required.`);
  return value;
}
function handle(value: unknown): string {
  const result = string(value, 'Handle').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(result)) throw new RequestError('Use 3–32 letters, numbers, underscores or dashes for the handle.');
  return result;
}
function password(value: unknown): string {
  const result = string(value, 'Password');
  if ([...result].length < 6) throw new RequestError('Passwords need at least 6 characters.');
  return result;
}
function uuid(value: unknown, label = 'Child ID'): string {
  const result = string(value, label);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) throw new RequestError(`Invalid ${label.toLowerCase()}.`);
  return result;
}
function childAvatar(value: unknown): string {
  if (value === undefined) return '🐶';
  const avatar = string(value, 'Avatar');
  if (['🐶', '🐱', '🐰', '🦊', '🐼', '⭐'].includes(avatar)) return avatar;
  if (avatar.length <= 150000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)) return avatar;
  throw new RequestError('Choose a profile icon or upload a smaller picture.');
}
function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new RequestError('Accounts are not configured yet.', 503);
  return value;
}
const email = (name: string) => `${name}@accounts.littlewoof.invalid`;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

export async function serve(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return response({ error: 'Use POST.' }, 405);
  try {
    const url = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const publicKey = env('SUPABASE_ANON_KEY');
    async function api(path: string, options: RequestInit = {}, bearer = serviceKey, key = serviceKey): Promise<unknown> {
      const result = await fetch(`${url}${path}`, {
        ...options,
        headers: { apikey: key, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', ...options.headers },
      });
      const raw: unknown = await result.json().catch(() => null);
      if (!result.ok) {
        // Do not echo upstream internals, user details or credentials.
        throw new RequestError(result.status === 429 ? 'Please wait a moment and try again.' : 'Account request failed. Check the details and try again.', result.status === 429 ? 429 : 400);
      }
      return raw;
    }
    const input = object(await request.json());
    const action = string(input.action, 'Action');
    const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!bearer) throw new RequestError('Sign in as a grown-up first.', 401);
    const authenticated = object(await api('/auth/v1/user', {}, bearer, publicKey));
    try {
      await api('/rest/v1/rpc/session_status', {method:'POST', body:JSON.stringify({p_touch:false})}, bearer, publicKey);
    } catch {
      throw new RequestError('Signed out for safety. Please sign in again.', 401);
    }
    const adult = string(authenticated.id, 'User ID');
    const rows = await api(`/rest/v1/profiles?id=eq.${adult}&role=eq.grownup&select=id,is_master`);
    if (!Array.isArray(rows) || rows.length !== 1) throw new RequestError('A grown-up account is required.', 403);
    const master = object(rows[0]).is_master === true;
    if (['register', 'create-grownup', 'list-grownups', 'delete-grownup', 'reset-grownup-password'].includes(action) && !master) {
      throw new RequestError('Only the master can manage grown-up accounts.', 403);
    }
    if (action === 'list-grownups') {
      return response({ grownups: await api('/rest/v1/profiles?role=eq.grownup&select=id,handle,display_name,is_master&order=display_name') });
    }
    if (action === 'delete-grownup' || action === 'reset-grownup-password') {
      const id = uuid(input.grownup_id, 'Grown-up ID');
      const targets = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.grownup&is_master=eq.false&select=id`);
      if (id === adult || !Array.isArray(targets) || targets.length !== 1) {
        throw new RequestError('Choose another regular grown-up account.', 403);
      }
      if (action === 'delete-grownup') {
        if (input.confirm !== action) throw new RequestError('Confirm this action first.');
        await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      } else {
        await api(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password: password(input.password) }) });
      }
      return response({ ok: true });
    }
    if (action === 'register' || action === 'create-grownup' || action === 'create-child') {
      const name = handle(input.handle);
      const secret = password(input.password);
      const display = string(input.display_name, 'Name').trim();
      if (!display || [...display].length > 60) throw new RequestError('Use a name of 1–60 characters.');
      const role = action === 'create-child' ? 'child' : 'grownup';
      const avatar = role === 'child' ? childAvatar(input.avatar) : null;
      if (input.class_id) throw new RequestError('Groups are no longer supported.');
      let user: Fields;
      let created = false;
      try {
        user = object(await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({
          email: email(name), password: secret, email_confirm: true,
          app_metadata: { account_role: role, creator_id: adult },
        }) }));
        created = true;
      } catch (error) {
        if (!(error instanceof RequestError) || error.status === 429) throw error;
        // Recover an interrupted provisioning attempt only by proving this password and creator.
        let recovered: Fields;
        try {
          const session = object(await api('/auth/v1/token?grant_type=password', {
            method: 'POST', body: JSON.stringify({ email: email(name), password: secret }),
          }, publicKey, publicKey));
          recovered = object(session.user);
        } catch { throw new RequestError('That handle is taken. Choose another handle or sign in.', 409); }
        const metadata = object(recovered.app_metadata);
        if (metadata.account_role !== role || (metadata.creator_id ?? null) !== adult) {
          throw new RequestError('That handle is taken. Choose another handle or sign in.', 409);
        }
        user = recovered;
      }
      const id = string(user.id, 'User ID');
      try {
        await api('/rest/v1/rpc/provision_account', { method: 'POST', body: JSON.stringify({
          p_id: id, p_handle: name, p_display_name: display, p_role: role, p_adult: adult, p_class: null,
        }) });
      } catch (error) {
        // A lost HTTP response may hide a committed transaction: inspect before compensating.
        if (created) {
          try {
            const rows = await api(`/rest/v1/profiles?id=eq.${id}&select=id`);
            if (Array.isArray(rows) && rows.length === 0) await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
          } catch { /* A retry with the same credentials safely completes provisioning. */ }
        }
        throw error;
      }
      if (avatar !== null) await api(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ avatar }) });
      const profiles = await api(`/rest/v1/profiles?id=eq.${id}&select=*`);
      return response({ profile: Array.isArray(profiles) ? profiles[0] : null });
    }
    if (action === 'list-linkable-children' || action === 'link-child') {
      const links = await api('/rest/v1/guardians?select=adult_id,child_id');
      if (!Array.isArray(links)) throw new RequestError('Children could not load.', 503);
      const others = new Set(links.filter(link => object(link).adult_id !== adult).map(link => string(object(link).child_id, 'Child ID')));
      const mine = new Set(links.filter(link => object(link).adult_id === adult).map(link => string(object(link).child_id, 'Child ID')));
      if (action === 'list-linkable-children') {
        const ids = [...others].filter(id => !mine.has(id));
        const profiles = ids.length ? await api(`/rest/v1/profiles?id=in.(${ids.join(',')})&role=eq.child&select=id,handle,display_name&order=display_name`) : [];
        return response({ children: profiles });
      }
      const id = uuid(input.child_id);
      if (!others.has(id) && !mine.has(id)) throw new RequestError('Choose a child already linked to a grown-up.', 403);
      const profiles = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.child&select=*`);
      if (!Array.isArray(profiles) || profiles.length !== 1) throw new RequestError('Choose a child account.');
      await api('/rest/v1/guardians?on_conflict=adult_id,child_id', {
        method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ adult_id: adult, child_id: id }),
      });
      return response({ profile: profiles[0] });
    }
    if (action === 'patch-game-settings' || action === 'patch-child-settings') {
      const patch = object(input.patch);
      if (action === 'patch-game-settings') {
        return response(await api('/rest/v1/rpc/patch_game_settings', { method: 'POST', body: JSON.stringify({p_adult: adult, p_patch: patch}) }));
      }
      if (!Array.isArray(input.child_ids) || input.child_ids.length < 1 || input.child_ids.length > 100) throw new RequestError('Choose 1 to 100 children.');
      const children = [...new Set(input.child_ids.map(value => uuid(value)))];
      if (input.reset !== undefined && typeof input.reset !== 'boolean') throw new RequestError('Invalid reset choice.');
      for (const id of children) {
        const links = await api(`/rest/v1/guardians?adult_id=eq.${adult}&child_id=eq.${id}&select=child_id`);
        if (!Array.isArray(links) || links.length !== 1) throw new RequestError('This child is not linked to your account.', 403);
      }
      return response(await api('/rest/v1/rpc/patch_child_settings', { method: 'POST', body: JSON.stringify({p_adult: adult, p_children: children, p_patch: patch, p_reset: input.reset === true}) }));
    }
    if (action === 'edit-child-profile') {
      const id = uuid(input.child_id);
      const name = handle(input.handle);
      const display = string(input.display_name, 'Name').trim();
      if (!display || [...display].length > 60) throw new RequestError('Use a name of 1–60 characters.');
      const links = await api(`/rest/v1/guardians?adult_id=eq.${adult}&child_id=eq.${id}&select=child_id`);
      if (!Array.isArray(links) || links.length !== 1) throw new RequestError('This child is not linked to your account.', 403);
      const taken = await api(`/rest/v1/profiles?handle=eq.${name}&id=neq.${id}&select=id`);
      if (Array.isArray(taken) && taken.length) throw new RequestError('That handle is taken. Choose another handle.', 409);
      await api('/rest/v1/rpc/edit_child_profile', { method: 'POST', body: JSON.stringify({p_adult: adult, p_child: id, p_handle: name, p_display_name: display}) });
      const profiles = await api(`/rest/v1/profiles?id=eq.${id}&select=*`);
      return response({ profile: Array.isArray(profiles) ? profiles[0] : null });
    }
    if (action === 'edit-profile') {
      const name = handle(input.handle);
      const display = string(input.display_name, 'Name').trim();
      if (!display || [...display].length > 60) throw new RequestError('Use a name of 1–60 characters.');
      const avatar = childAvatar(input.avatar);
      const taken = await api(`/rest/v1/profiles?handle=eq.${name}&id=neq.${adult}&select=id`);
      if (Array.isArray(taken) && taken.length) throw new RequestError('That handle is taken. Choose another handle.', 409);
      await api('/rest/v1/rpc/edit_grownup_profile', { method: 'POST', body: JSON.stringify({p_adult: adult, p_handle: name, p_display_name: display, p_avatar: avatar}) });
      const profiles = await api(`/rest/v1/profiles?id=eq.${adult}&select=*`);
      return response({ profile: Array.isArray(profiles) ? profiles[0] : null });
    }
    if (action === 'delete-child' || action === 'reset-child-progress') {
      const id = uuid(input.child_id);
      const links = await api(`/rest/v1/guardians?adult_id=eq.${adult}&child_id=eq.${id}&select=child_id`);
      const children = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.child&select=id`);
      if (!Array.isArray(links) || links.length !== 1 || !Array.isArray(children) || children.length !== 1) throw new RequestError('This child is not linked to your account.', 403);
      if (input.confirm !== action) throw new RequestError('Confirm this action first.');
      if (action === 'delete-child') await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      else await api('/rest/v1/rpc/reset_child_progress', {method: 'POST', body: JSON.stringify({p_adult: adult, p_child: id})});
      return response({ok: true});
    }
    if (action === 'reset-child-password') {
      const id = uuid(input.child_id);
      const secret = password(input.password);
      const rows = await api(`/rest/v1/guardians?adult_id=eq.${adult}&child_id=eq.${id}&select=child_id`);
      if (!Array.isArray(rows) || rows.length !== 1) throw new RequestError('This child is not linked to your account.', 403);
      await api(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password: secret }) });
      return response({ ok: true });
    }
    throw new RequestError('Unknown account action.');
  } catch (error) {
    return response({ error: error instanceof RequestError ? error.message : 'Accounts could not connect. Try again.' }, error instanceof RequestError ? error.status : 503);
  }
}
Deno.serve(serve);
