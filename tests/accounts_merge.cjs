/* Pure checks for the sync rules. No network. */
'use strict';
const assert = require('node:assert/strict');
const Merge = require('../accounts/merge.js');
const Store = require('../accounts/store.js');
const {mergeState, emptyState, withAchievements, sameState} = Merge;

const t = '2026-10-19T12:00:00.000Z';
const later = '2026-10-19T12:05:00.000Z';
const fill = partial => mergeState(emptyState(), partial);
const replicaA = '11111111-1111-4111-8111-111111111111';
const replicaB = '22222222-2222-4222-8222-222222222222';

const apple = fill({progress: {post: {letters: {A: t}, counts: {[replicaA]: 1}}}});
const ball = fill({progress: {post: {letters: {B: later}, counts: {[replicaB]: 2}}}});
const both = mergeState(apple, ball);
assert.deepEqual(Object.keys(both.progress.post.letters).sort(), ['A', 'B']);
assert.equal(mergeState(fill({progress: {post: {letters: {A: later}}}}), fill({progress: {post: {letters: {A: t}}}})).progress.post.letters.A, t, 'earliest letter time wins');

const counts = mergeState(
  fill({progress: {post: {letters: {}, counts: {[replicaA]: 2}}}}),
  fill({progress: {post: {letters: {}, counts: {[replicaA]: 1, [replicaB]: 3}}}})
);
assert.equal(counts.progress.post.counts[replicaA], 2, 'same device keeps the higher count');
assert.equal(counts.progress.post.counts[replicaB], 3, 'the other device is kept');
assert.ok(sameState(both, mergeState(both, both)), 'merge is idempotent');
assert.ok(sameState(mergeState(apple, ball), mergeState(ball, apple)), 'merge is commutative');
const silk = fill({progress: {silk: {letters: {C: t}, counts: {}}}});
assert.ok(sameState(mergeState(mergeState(apple, ball), silk), mergeState(apple, mergeState(ball, silk))), 'merge is associative');
assert.equal(mergeState(both, emptyState()).progress.post.letters.B, later, 'an empty copy deletes nothing');

const quiet = fill({settings: {voice: {v: false, t}, volume: {v: 40, t: later}}});
const loud = fill({settings: {voice: {v: true, t: later}, volume: {v: 10, t}}});
const settings = mergeState(quiet, loud);
assert.equal(settings.settings.voice.v, true);
assert.equal(settings.settings.volume.v, 40, 'an older volume does not replace a newer one');

const earned = withAchievements(both, later);
assert.equal(earned.achievements['first-sound'], later);
const kept = withAchievements(earned, '2026-10-19T13:00:00.000Z');
assert.equal(kept.achievements['first-sound'], later, 'an achievement keeps its first time');

const stamped = Store.stampSettings({}, {...Store.DEFAULTS, voice: false}, t);
assert.equal(stamped.voice.v, false);
assert.equal(stamped.volume, undefined, 'unchanged defaults are not written over the server');
const storage = Store.memory();
assert.equal(Store.replicaId(storage), Store.replicaId(storage));

const resetAt = '2026-10-21T01:00:00.000Z';
const olderRound = '2026-10-21T00:30:00.000Z';
const newerRound = '2026-10-21T01:10:00.000Z';
const reset = fill({
  progressEpoch: {v: resetAt, t: resetAt},
  progress: {post: {letters: {}, counts: {}}},
  achievements: {}
});
const queued = fill({
  progress: {post: {letters: {A: olderRound}, counts: {[replicaA]: 1}}},
  achievements: {'first-sound': olderRound}
});
const beaten = mergeState(reset, queued);
assert.deepEqual(beaten.progress.post.letters, {}, 'an offline reset beats an older queued round');
assert.deepEqual(beaten.achievements, {});
assert.equal(beaten.progressEpoch.t, resetAt);
const after = fill({
  progressEpoch: {v: resetAt, t: resetAt},
  progress: {post: {letters: {B: newerRound}, counts: {[replicaB]: 1}}}
});
const once = mergeState(reset, after);
assert.equal(once.progress.post.letters.B, newerRound, 'a round after the same reset counts once');
const again = mergeState(once, after);
assert.equal(again.progress.post.counts[replicaB], 1, 'the same round does not count twice');
const keptSettings = mergeState(reset, fill({settings: {voice: {v: false, t: olderRound}}}));
assert.equal(keptSettings.settings.voice.v, false, 'a reset does not clear settings');
assert.equal(mergeState(apple, emptyState()).progressEpoch, null);

console.log('PASS accounts merge: letters union, G-counter, per-field settings, reset epoch, idempotent');
