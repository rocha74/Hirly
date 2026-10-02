const crypto = require('node:crypto');
const { limitReached } = require('./errors');

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const LEASE_MS = 90_000;
const REPLAY_MS = 8_000;

const fingerprintRequest = (feature, payload) =>
  crypto.createHash('sha256').update(JSON.stringify({ feature, payload })).digest('hex');

const windowStart = (now, size) => Math.floor(now / size) * size;

const reserveQuota = async ({ firestore, uid, feature, payload, quota, now = Date.now }) => {
  const ref = firestore.doc(`aiQuotas/${uid}/features/${feature}`);
  const currentMs = now();
  const minuteStart = windowStart(currentMs, MINUTE_MS);
  const dayStart = windowStart(currentMs, DAY_MS);
  const fingerprint = fingerprintRequest(feature, payload);
  const leaseId = crypto.randomUUID();

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? snapshot.data() : {};
    const minuteCount = previous.minuteStart === minuteStart ? Number(previous.minuteCount) || 0 : 0;
    const dayCount = previous.dayStart === dayStart ? Number(previous.dayCount) || 0 : 0;
    const regenerationCount = previous.dayStart === dayStart ? Number(previous.regenerationCount) || 0 : 0;
    const isRegeneration = payload.regenerate === true;
    if (minuteCount >= quota.minute || dayCount >= quota.day) throw limitReached();
    if (isRegeneration && regenerationCount >= quota.regenerations) throw limitReached();
    if (Number(previous.activeUntilMs) > currentMs) throw limitReached();
    if (previous.lastFingerprint === fingerprint && currentMs - Number(previous.lastRequestAtMs) < REPLAY_MS) {
      throw limitReached();
    }
    transaction.set(ref, {
      uid, feature, minuteStart, minuteCount: minuteCount + 1,
      dayStart, dayCount: dayCount + 1,
      regenerationCount: regenerationCount + (isRegeneration ? 1 : 0),
      lastFingerprint: fingerprint, lastRequestAtMs: currentMs,
      activeLeaseId: leaseId, activeUntilMs: currentMs + LEASE_MS, updatedAtMs: currentMs,
    }, { merge: true });
  });
  return { ref, leaseId };
};

const releaseQuota = async ({ firestore, reservation, now = Date.now }) => {
  if (!reservation) return;
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reservation.ref);
    if (!snapshot.exists || snapshot.data().activeLeaseId !== reservation.leaseId) return;
    transaction.set(reservation.ref, {
      activeLeaseId: null, activeUntilMs: 0, updatedAtMs: now(),
    }, { merge: true });
  });
};

module.exports = { DAY_MS, MINUTE_MS, fingerprintRequest, releaseQuota, reserveQuota };
