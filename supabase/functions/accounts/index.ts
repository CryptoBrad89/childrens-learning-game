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
    async function allRows(path: string, order = 'id'): Promise<unknown[]> {
      const rows: unknown[] = [];
      for (let offset = 0;; offset += 200) {
        const page = await api(`${path}&order=${order}&limit=200&offset=${offset}`);
        if (!Array.isArray(page)) throw new RequestError('Accounts could not load.', 503);
        rows.push(...page);
        if (page.length < 200) return rows;
      }
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
    if (['register', 'create-grownup', 'list-grownups', 'delete-grownup', 'reset-grownup-password', 'edit-grownup-profile', 'delete-grownups', 'reset-grownups-progress', 'patch-game-settings', 'list-linkable-children', 'link-child', 'transfer-children', 'transfer-child', 'reset-grownup-progress'].includes(action) && !master) {
      throw new RequestError('Only the master can manage grown-up accounts.', 403);
    }
    async function verifyPassword() {
      if (typeof input.current_password !== 'string' || !input.current_password) throw new RequestError('Enter your current password.', 403);
      const valid = await api('/rest/v1/rpc/verify_risky_password', {
        method: 'POST', body: JSON.stringify({p_password: input.current_password}),
      }, bearer, publicKey);
      if (valid !== true) throw new RequestError('Your current password did not match.', 403);
    }
    const bulkAction = action === 'transfer-child' ? 'transfer-children' : action;
    if (['delete-children','delete-grownups','reset-children-progress','reset-grownups-progress','transfer-children','patch-child-settings'].includes(bulkAction)) {
      const values = action === 'transfer-child' ? [input.child_id] :
        ['delete-grownups','reset-grownups-progress'].includes(action) ? input.grownup_ids : input.child_ids;
      if (!Array.isArray(values) || !values.length) throw new RequestError('Choose at least one account.');
      const ids = values.map(value => uuid(value, 'Account ID').toLowerCase());
      if (new Set(ids).size !== ids.length) throw new RequestError('Choose each account only once.');
      const parameters: Fields = {};
      if (bulkAction === 'transfer-children') {
        parameters.source_id = uuid(input.source_id, 'Source grown-up ID');
        parameters.destination_id = uuid(input.destination_id, 'Destination grown-up ID');
        if (parameters.source_id === parameters.destination_id) throw new RequestError('Choose a different destination.');
      }
      if (bulkAction === 'patch-child-settings') {
        parameters.patch = object(input.patch);
        if (input.reset !== undefined && typeof input.reset !== 'boolean') throw new RequestError('Invalid reset choice.');
        parameters.reset = input.reset === true;
      }
      const job = await api('/rest/v1/rpc/start_bulk_action', {method:'POST', body:JSON.stringify({
        p_action:bulkAction,p_targets:ids,p_parameters:parameters,
        p_password:bulkAction === 'patch-child-settings' ? null : input.current_password ?? null,
        p_request_id:input.request_id === undefined ? null : uuid(input.request_id,'Request ID'),
      })},bearer,publicKey);
      return response({job_id:job});
    }
    if (action === 'run-bulk') {
      const job = uuid(input.job_id, 'Action ID');
      const batch = object(await api('/rest/v1/rpc/claim_bulk_action', {method:'POST',body:JSON.stringify({p_job:job})},bearer,publicKey));
      if (batch.done === true || batch.busy === true) return response(batch);
      const lease = uuid(batch.lease, 'Lease ID');
      if (batch.action !== 'delete-children' && batch.action !== 'delete-grownups') {
        return response(await api('/rest/v1/rpc/process_bulk_action', {method:'POST',body:JSON.stringify({p_job:job,p_actor:adult,p_lease:lease})}));
      }
      if (!Array.isArray(batch.targets)) throw new RequestError('Invalid action batch.',503);
      const results = [];
      for (const value of batch.targets) {
        const id = uuid(value, 'Account ID');
        let reason: string | null = null;
        const targets = await api(`/rest/v1/profiles?id=eq.${id}&select=id,role,is_master`);
        if (!Array.isArray(targets) || targets.length !== 1) reason = 'not-found-or-already-deleted';
        else {
          const target = object(targets[0]);
          if (target.is_master === true) reason = 'is-master';
          else if (id === adult) reason = 'is-self';
          else if (target.role !== (batch.action === 'delete-children' ? 'child' : 'grownup')) reason = 'wrong-role';
          else if (batch.action === 'delete-grownups' && !master) reason = 'not-authorized';
          else if (batch.action === 'delete-children' && !master) {
            const links = await api(`/rest/v1/guardians?adult_id=eq.${adult}&child_id=eq.${id}&select=child_id`);
            if (!Array.isArray(links) || links.length !== 1) reason = 'not-linked';
          }
        }
        if (reason) { results.push({id,ok:false,reason}); continue; }
        try {
          await api(`/auth/v1/admin/users/${id}`,{method:'DELETE'});
          results.push({id,ok:true});
        } catch { results.push({id,ok:false,reason:'error'}); }
      }
      return response(await api('/rest/v1/rpc/finish_bulk_action', {method:'POST',body:JSON.stringify({p_job:job,p_actor:adult,p_lease:lease,p_results:results})}));
    }
    if (['register','create-grownup','delete-child','delete-grownup','reset-child-progress','reset-grownup-progress',
      'reset-own-progress','reset-child-password','reset-grownup-password','change-own-password','unlink-child'].includes(action)) await verifyPassword();
    if (action === 'change-own-password') {
      if (master) throw new RequestError('The master account must be kept unchanged.',403);
      await api('/rest/v1/rpc/set_account_password',{method:'POST',body:JSON.stringify({p_actor:adult,p_target:adult,p_password:password(input.password)})});
      return response({ok:true});
    }
    async function requireChild(id: string) {
      const children = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.child&select=id`);
      if (!Array.isArray(children) || children.length !== 1) throw new RequestError('Choose an accessible child account.', 403);
      if (!master) {
        const links = await api(`/rest/v1/guardians?adult_id=eq.${adult}&child_id=eq.${id}&select=child_id`);
        if (!Array.isArray(links) || links.length !== 1) throw new RequestError('This child is not linked to your account.', 403);
      }
    }
    if (action === 'reset-own-progress') {
      if (master) throw new RequestError('The master account must be kept unchanged.',403);
      await api('/rest/v1/rpc/reset_own_progress', {method: 'POST', body: JSON.stringify({p_actor: adult})});
      return response({ok: true});
    }
    if (action === 'reset-grownup-progress') {
      const id = uuid(input.grownup_id, 'Grown-up ID');
      const targets = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.grownup&is_master=eq.false&select=id`);
      if (id === adult || !Array.isArray(targets) || targets.length !== 1) throw new RequestError('Choose another regular grown-up account.', 403);
      await api('/rest/v1/rpc/reset_grownup_progress', {method: 'POST', body: JSON.stringify({p_actor: adult, p_target: id})});
      return response({ok: true});
    }
    if (action === 'list-child-grownups' || action === 'unlink-child') {
      const child = uuid(input.child_id);
      await requireChild(child);
      if (action === 'unlink-child') {
        const target = input.grownup_id === undefined ? adult : uuid(input.grownup_id, 'Grown-up ID');
        if (target !== adult && !master) throw new RequestError('Only the master can unlink another grown-up.', 403);
        const result = await api('/rest/v1/rpc/unlink_child', {method: 'POST', body: JSON.stringify({p_actor: adult, p_child: child, p_grownup: target})});
        return response(result);
      }
      const guardians = await allRows(`/rest/v1/guardians?child_id=eq.${child}&select=adult_id`,'adult_id');
      if (!Array.isArray(guardians)) throw new RequestError('Linked grown-ups could not load.', 503);
      const ids = guardians.map(row => uuid(object(row).adult_id, 'Grown-up ID'));
      const grownups: unknown[] = [];
      for (let offset=0;offset<ids.length;offset+=50) {
        grownups.push(...await allRows(`/rest/v1/profiles?id=in.(${ids.slice(offset,offset+50).join(',')})&select=id,handle,display_name`));
      }
      return response({grownups});
    }
    if (action === 'list-grownups') {
      return response({ grownups: await allRows('/rest/v1/profiles?role=eq.grownup&select=id,handle,display_name,avatar,is_master') });
    }
    if (action === 'delete-grownup' || action === 'reset-grownup-password') {
      const id = uuid(input.grownup_id, 'Grown-up ID');
      const targets = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.grownup&is_master=eq.false&select=id`);
      if (id === adult || !Array.isArray(targets) || targets.length !== 1) {
        throw new RequestError('Choose another regular grown-up account.', 403);
      }
      if (action === 'delete-grownup') {
          await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      } else {
        await api('/rest/v1/rpc/set_account_password', {method:'POST', body:JSON.stringify({p_actor:adult,p_target:id,p_password:password(input.password)})});
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
      if (action === 'list-linkable-children') {
        return response({children: await allRows('/rest/v1/profiles?role=eq.child&select=id,handle,display_name')});
      }
      const id = uuid(input.child_id);
      const target = input.grownup_id === undefined ? adult : uuid(input.grownup_id, 'Grown-up ID');
      const adults = await api(`/rest/v1/profiles?id=eq.${target}&role=eq.grownup&select=id`);
      if (!Array.isArray(adults) || adults.length !== 1) throw new RequestError('Choose a grown-up account.');
      const profiles = await api(`/rest/v1/profiles?id=eq.${id}&role=eq.child&select=*`);
      if (!Array.isArray(profiles) || profiles.length !== 1) throw new RequestError('Choose a child account.');
      await api('/rest/v1/guardians?on_conflict=adult_id,child_id', {
        method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ adult_id: target, child_id: id }),
      });
      return response({ profile: profiles[0] });
    }
    if (action === 'patch-game-settings') {
      return response(await api('/rest/v1/rpc/patch_game_settings', {method:'POST',body:JSON.stringify({p_adult:adult,p_patch:object(input.patch)})}));
    }
    if (action === 'edit-child-profile') {
      const id = uuid(input.child_id);
      const name = handle(input.handle);
      const display = string(input.display_name, 'Name').trim();
      if (!display || [...display].length > 60) throw new RequestError('Use a name of 1–60 characters.');
      await requireChild(id);
      const previous = await api(`/rest/v1/profiles?id=eq.${id}&select=handle`);
      if (!Array.isArray(previous) || previous.length !== 1) throw new RequestError('Account unavailable.',403);
      if (object(previous[0]).handle !== name) await verifyPassword();
      const taken = await api(`/rest/v1/profiles?handle=eq.${name}&id=neq.${id}&select=id`);
      if (Array.isArray(taken) && taken.length) throw new RequestError('That handle is taken. Choose another handle.', 409);
      const avatar = input.avatar === undefined ? undefined : childAvatar(input.avatar);
      await api('/rest/v1/rpc/edit_confirmed_profile', {method:'POST',body:JSON.stringify({p_actor:adult,p_target:id,p_expected_handle:object(previous[0]).handle,p_handle:name,p_display_name:display,p_avatar:avatar ?? null})});
      const profiles = await api(`/rest/v1/profiles?id=eq.${id}&select=*`);
      return response({ profile: Array.isArray(profiles) ? profiles[0] : null });
    }
    if (action === 'edit-profile' || action === 'edit-grownup-profile') {
      const target = action === 'edit-profile' ? adult : uuid(input.grownup_id, 'Grown-up ID');
      if (action === 'edit-grownup-profile') {
        const targets = await api(`/rest/v1/profiles?id=eq.${target}&role=eq.grownup&select=id`);
        if (!Array.isArray(targets) || targets.length !== 1) throw new RequestError('Choose a grown-up account.', 403);
      }
      const previous = await api(`/rest/v1/profiles?id=eq.${target}&select=handle,is_master`);
      if (!Array.isArray(previous) || previous.length !== 1 || object(previous[0]).is_master === true) throw new RequestError('Choose a regular grown-up account.',403);
      const name = handle(input.handle);
      if (object(previous[0]).handle !== name) await verifyPassword();
      const display = string(input.display_name, 'Name').trim();
      if (!display || [...display].length > 60) throw new RequestError('Use a name of 1–60 characters.');
      const avatar = childAvatar(input.avatar);
      const taken = await api(`/rest/v1/profiles?handle=eq.${name}&id=neq.${target}&select=id`);
      if (Array.isArray(taken) && taken.length) throw new RequestError('That handle is taken. Choose another handle.', 409);
      await api('/rest/v1/rpc/edit_confirmed_profile', {method:'POST',body:JSON.stringify({p_actor:adult,p_target:target,p_expected_handle:object(previous[0]).handle,p_handle:name,p_display_name:display,p_avatar:avatar})});
      const profiles = await api(`/rest/v1/profiles?id=eq.${target}&select=*`);
      return response({ profile: Array.isArray(profiles) ? profiles[0] : null });
    }
    if (action === 'delete-child' || action === 'reset-child-progress') {
      const id = uuid(input.child_id);
      await requireChild(id);
      if (action === 'delete-child') await api(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      else await api('/rest/v1/rpc/reset_child_progress', {method: 'POST', body: JSON.stringify({p_adult: adult, p_child: id})});
      return response({ok: true});
    }
    if (action === 'reset-child-password') {
      const id = uuid(input.child_id);
      const secret = password(input.password);
      await requireChild(id);
      await api('/rest/v1/rpc/set_account_password', {method:'POST', body:JSON.stringify({p_actor:adult,p_target:id,p_password:secret})});
      return response({ ok: true });
    }
    throw new RequestError('Unknown account action.');
  } catch (error) {
    return response({ error: error instanceof RequestError ? error.message : 'Accounts could not connect. Try again.' }, error instanceof RequestError ? error.status : 503);
  }
}
Deno.serve(serve);
