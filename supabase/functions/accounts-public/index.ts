import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

// Public signup is closed. verify_jwt stays off so this refusal is the
// response, not a platform 401. Only a signed-in admin can add a grown-up,
// and that goes through accounts-manage.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: cors});
  if (req.method !== "POST") return json({error: "Use POST"}, 405);
  return json({
    error: "Grown-up accounts are created by an admin who is already signed in.",
  }, 403);
});
