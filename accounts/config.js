/* Where accounts and sync live. The publishable key is meant to ship in the
 * client: it only reaches the functions in supabase/migrations, which check
 * who is signed in. */
window.LW_CONFIG = Object.assign({
  url: 'https://eyqxkxnhzzemafnwmzbf.supabase.co',
  key: 'sb_publishable_vWrE_7bE1vtddS-JifEX9w_pYICi3I0'
}, window.LW_CONFIG_OVERRIDE || {});
