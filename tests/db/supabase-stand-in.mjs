/* A small local stand-in for the Supabase project, for tests only.
 *
 * It runs every file in supabase/migrations, in order, inside PGlite (real
 * Postgres compiled to WebAssembly), on top of a minimal copy of what a
 * Supabase project already has: the anon/authenticated roles, the auth.users
 * and auth.identities tables, auth.uid(), pgcrypto in the extensions schema,
 * and Supabase's default grants on the public schema. In front of that it
 * serves the three HTTP endpoints the game uses, with Supabase's request and
 * error shapes:
 *   POST /auth/v1/token?grant_type=password|refresh_token   (GoTrue)
 *   POST /auth/v1/logout                                     (GoTrue)
 *   POST /rest/v1/rpc/<function>                             (PostgREST)
 *
 * It is not a security boundary and is never shipped with the game. */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const here = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS = path.resolve(here, '../../supabase/migrations');

// What a fresh Supabase project already has before our migrations run.
// auth.users and auth.identities copy the real column list, so a migration
// that writes a column Supabase doesn't have fails here too.
const BASELINE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema extensions; create extension pgcrypto with schema extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
create table auth.users (
  instance_id uuid, id uuid primary key, aud varchar(255), role varchar(255), email varchar(255),
  encrypted_password varchar(255), email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token varchar(255), confirmation_sent_at timestamptz, recovery_token varchar(255),
  recovery_sent_at timestamptz, email_change_token_new varchar(255), email_change varchar(255),
  email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz,
  phone text unique default null, phone_confirmed_at timestamptz, phone_change text default '',
  phone_change_token varchar(255) default '', phone_change_sent_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  email_change_token_current varchar(255) default '', email_change_confirm_status smallint default 0,
  banned_until timestamptz, reauthentication_token varchar(255) default '', reauthentication_sent_at timestamptz,
  is_sso_user boolean not null default false, deleted_at timestamptz, is_anonymous boolean not null default false);
create unique index users_email_partial_key on auth.users (email) where is_sso_user = false;
create table auth.identities (
  provider_id text not null, user_id uuid not null references auth.users (id) on delete cascade,
  identity_data jsonb not null, provider text not null, last_sign_in_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  email text generated always as (lower(identity_data->>'email')) stored,
  id uuid primary key default gen_random_uuid(), unique (provider_id, provider));
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
`;

export async function createDatabase({migrations = MIGRATIONS} = {}) {
  const db = await PGlite.create({extensions: {pgcrypto}});
  await db.exec(BASELINE);
  const files = fs.readdirSync(migrations).filter(f => /^\d{14}_.+\.sql$/.test(f)).sort();
  for (const file of files) {
    try {await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'));}
    catch (error) {error.message = `${file}: ${error.message}`; throw error;}
  }
  return {db, files};
}

const b64url = buf => Buffer.from(buf).toString('base64url');
function signJwt(payload, secret) {
  const head = b64url(JSON.stringify({alg: 'HS256', typ: 'JWT'})), body = b64url(JSON.stringify(payload));
  return `${head}.${body}.${b64url(crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest())}`;
}
function verifyJwt(token, secret) {
  const [head, body, sig] = String(token).split('.');
  if (!sig) return null;
  const want = b64url(crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest());
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  return claims.exp * 1000 > Date.now() ? claims : null;
}

/** Serial queue: PGlite runs one query at a time, and each request is one transaction. */
function serial() {
  let tail = Promise.resolve();
  return fn => {const run = tail.then(fn, fn); tail = run.catch(() => {}); return run;};
}

export async function startStandIn({port = 0, accessTtl = 3600, key = 'sb_publishable_stand_in_key', log = false} = {}) {
  const {db, files} = await createDatabase();
  const secret = crypto.randomBytes(32), refresh = new Map(), queue = serial();
  const stats = {rpc: {}, tokens: 0, refreshes: 0};

  async function issue(user) {
    const now = Math.floor(Date.now() / 1000), sid = crypto.randomUUID();
    const access = signJwt({sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email,
      session_id: sid, iat: now, exp: now + accessTtl}, secret);
    const token = crypto.randomBytes(16).toString('hex');
    refresh.set(token, {user, sid, revoked: false});
    return {access_token: access, token_type: 'bearer', expires_in: accessTtl, expires_at: now + accessTtl,
      refresh_token: token, user: {id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email}};
  }
  const authError = (status, error_code, msg) => ({status, body: {code: status, error_code, msg}});

  async function token(grant, body) {
    if (grant === 'password') {
      const email = String(body.email || '').toLowerCase(), password = String(body.password || '');
      const {rows: [user]} = await db.query(
        `select id, email, email_confirmed_at, encrypted_password = extensions.crypt($2, encrypted_password) as ok
           from auth.users where email = $1`, [email, password]);
      if (!user || !user.ok) return authError(400, 'invalid_credentials', 'Invalid login credentials');
      if (!user.email_confirmed_at) return authError(400, 'email_not_confirmed', 'Email not confirmed');
      stats.tokens++;
      return {status: 200, body: await issue(user)};
    }
    if (grant === 'refresh_token') {
      const entry = refresh.get(String(body.refresh_token || ''));
      if (!entry || entry.revoked) return authError(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
      entry.revoked = true; stats.refreshes++;
      return {status: 200, body: await issue(entry.user)};
    }
    return authError(400, 'validation_failed', 'Unsupported grant type');
  }

  async function rpc(fn, body, claims) {
    if (!/^[a-z_][a-z0-9_]*$/.test(fn)) return {status: 404, body: {code: 'PGRST202', message: 'Could not find the function'}};
    const {rows: [proc]} = await db.query(
      `select p.provolatile as v, coalesce(p.proargnames, '{}') as names from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1`, [fn]);
    if (!proc) return {status: 404, body: {code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache`}};
    const args = Object.entries(body || {});
    if (args.some(([k]) => !proc.names.includes(k))) return {status: 404, body: {code: 'PGRST202', message: `Could not find the function public.${fn} with those parameters`}};
    const sql = `select to_jsonb(public.${fn}(${args.map(([k], i) => `${k} => $${i + 1}`).join(', ')})) as r`;
    const values = args.map(([, v]) => v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : String(v));
    const role = claims ? 'authenticated' : 'anon';
    stats.rpc[fn] = (stats.rpc[fn] || 0) + 1;
    return db.transaction(async tx => {
      if (proc.v !== 'v') await tx.exec('set transaction read only');
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims || {role: 'anon'})]);
      await tx.exec(`set local role ${role}`);
      const {rows: [row]} = await tx.query(sql, values);
      return {status: 200, body: row.r};
    }).catch(error => {
      const code = error.code || 'XX000';
      const status = code === '42501' ? (claims ? 403 : 401) : code === '25006' ? 405 : code.startsWith('P0') || code.startsWith('22') || code.startsWith('23') ? 400 : 500;
      return {status, body: {code, details: error.detail || null, hint: error.hint || null, message: error.message}};
    });
  }

  const server = http.createServer((req, res) => {
    const send = ({status, body}) => {
      res.writeHead(status, {'content-type': 'application/json', 'access-control-allow-origin': '*'});
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'apikey,authorization,content-type,x-client-info,prefer', 'access-control-max-age': '600'});
      return res.end();
    }
    let raw = '';
    req.on('data', chunk => {raw += chunk;});
    req.on('end', () => queue(async () => {
      const url = new URL(req.url, 'http://x');
      if (req.headers.apikey !== key) return send({status: 401, body: {message: 'Invalid API key'}});
      let body = {};
      try {body = raw ? JSON.parse(raw) : {};} catch {return send({status: 400, body: {message: 'Bad JSON'}});}
      const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (url.pathname === '/auth/v1/token') return send(await token(url.searchParams.get('grant_type'), body));
      if (url.pathname === '/auth/v1/logout') {
        const claims = verifyJwt(bearer, secret);
        if (!claims) return send({status: 401, body: {code: 401, msg: 'Invalid token'}});
        for (const entry of refresh.values()) if (entry.sid === claims.session_id) entry.revoked = true;
        return send({status: 204});
      }
      const m = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/);
      if (m && req.method === 'POST') {
        let claims = null;
        if (bearer && bearer !== key) {
          claims = verifyJwt(bearer, secret);
          if (!claims) return send({status: 401, body: {code: 'PGRST301', message: 'JWT expired or invalid'}});
        }
        const result = await rpc(m[1], body, claims);
        if (log) console.log(`rpc ${m[1]} -> ${result.status}`);
        return send(result);
      }
      send({status: 404, body: {message: 'Not found'}});
    }).catch(error => send({status: 500, body: {message: error.message}})));
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {url, key, db, files, stats, queue,
    close: () => new Promise(resolve => {server.closeAllConnections?.(); server.close(() => db.close().then(resolve, resolve));})};
}
