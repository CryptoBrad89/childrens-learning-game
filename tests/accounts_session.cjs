/* Fake-clock checks for session limits. No network. */
'use strict';
const assert = require('node:assert/strict');
const Session = require('../accounts/session.js');

const start = Date.parse('2026-10-21T12:00:00.000Z');
const grown = (elapsedMinutes, idleMinutes = elapsedMinutes) => Session.assess({
  role: 'parent',
  startedAt: start,
  lastActiveAt: start + (elapsedMinutes - idleMinutes) * 60 * 1000,
  now: start + elapsedMinutes * 60 * 1000
});
const child = minutes => Session.assess({
  role: 'child',
  startedAt: start,
  lastActiveAt: start + minutes * 60 * 1000,
  now: start + minutes * 60 * 1000
});

assert.equal(Session.GROWN_MS, 30 * 60 * 1000);
assert.equal(Session.CHILD_MS, 6 * 60 * 60 * 1000);
assert.equal(grown(29).ok, true);
assert.equal(grown(29).limit, 'inactivity');
assert.equal(grown(30).ok, false);
assert.equal(grown(30).reason, 'safety');
assert.equal(grown(90, 10).ok, true, 'a grown-up click keeps the session');
assert.equal(grown(90, 10).limit, 'inactivity');
assert.equal(child(5 * 60 + 59).ok, true);
assert.equal(child(6 * 60).ok, false);
assert.equal(child(6 * 60).limit, 'sign-in');
assert.equal(child(6 * 60).reason, 'safety');
const missing = Session.assess({role: 'parent', startedAt: 'nope', lastActiveAt: start, now: start});
assert.equal(missing.ok, true, 'a missing clock does not sign anyone out');

console.log('PASS accounts session: grown-up inactivity, child sign-in limit');
