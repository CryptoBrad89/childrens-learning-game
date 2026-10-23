/* Session limits. Grown-ups end after 30 minutes without activity.
 * Children end 6 hours after sign-in, even if they keep playing.
 * `now` is passed in so tests can use a fake clock. The server uses its own
 * clock and never trusts a time sent by the browser.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LittleWoofSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const GROWN_MS = 30 * 60 * 1000;
  const CHILD_MS = 6 * 60 * 60 * 1000;

  function millis(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string' || !value) return NaN;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function assess(input) {
    const role = input && input.role || '';
    const now = millis(input && input.now);
    const started = millis(input && input.startedAt);
    const active = millis(input && input.lastActiveAt);
    if (!Number.isFinite(now) || !Number.isFinite(started) || !Number.isFinite(active)) {
      return {ok: true, reason: '', limit: role === 'child' ? 'sign-in' : 'inactivity'};
    }
    if (role === 'child') {
      const expired = now - started >= CHILD_MS;
      return {ok: !expired, reason: expired ? 'safety' : '', limit: 'sign-in'};
    }
    const expired = now - active >= GROWN_MS;
    return {ok: !expired, reason: expired ? 'safety' : '', limit: 'inactivity'};
  }

  return {GROWN_MS, CHILD_MS, assess};
});
