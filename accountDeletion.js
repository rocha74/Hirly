const { HttpsError } = require('firebase-functions/v2/https');
const { randomUUID } = require('node:crypto');
const { lifecycleRef } = require('./shared/accountLifecycle');

const DELETE_PAGE_SIZE = 200;
const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;

const safeErrorCode = (error) => {
  if (!error || typeof error !== 'object') return 'unknown';
  return typeof error.code === 'string' ? error.code : 'unknown';
};

const isAuthUserNotFound = (error) =>
  safeErrorCode(error) === 'auth/user-not-found';

const deleteQueryInPages = async (firestore, baseQuery) => {
  while (true) {
    const snapshot = await baseQuery.limit(DELETE_PAGE_SIZE).get();
    if (snapshot.empty) return;
    const batch = firestore.batch();
    for (const document of snapshot.docs) batch.delete(document.ref);
    await batch.commit();
  }
};

const personalDataQueries = (firestore, uid) => [
  firestore.collection('events').where('uid', '==', uid),
  firestore.collection('aiEvents').where('uid', '==', uid),
  firestore.collection('evalRuns').where('uid', '==', uid),
  firestore.collection('feedback').where('uid', '==', uid),
  firestore.collection('feedback').where('userId', '==', uid),
  firestore.collection('feedbacks').where('uid', '==', uid),
  firestore.collection('feedbacks').where('userId', '==', uid),
];

const deleteReportsInPages = async (firestore, uid) => {
  const reports = firestore.collection('reports').where('reportedBy', '==', uid);
  while (true) {
    const snapshot = await reports.limit(DELETE_PAGE_SIZE).get();
    if (snapshot.empty) return;
    const batch = firestore.batch();
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      const jobId = document.data()?.jobId;
      if (typeof jobId === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(jobId)) {
        batch.delete(firestore.doc(`jobs/${jobId}/reports/${uid}`));
      }
    }
    await batch.commit();
  }
};

const hasRecentAuthentication = (request, now) => {
  const authTime = Number(request.auth && request.auth.token && request.auth.token.auth_time);
  if (!Number.isFinite(authTime) || authTime <= 0) return false;
  const ageSeconds = Math.floor(now() / 1000) - authTime;
  return ageSeconds >= 0 && ageSeconds <= RECENT_AUTH_MAX_AGE_SECONDS;
};

const DAY_MS = 86400000;
// Legacy resumable sessions can survive their creator. Completion additionally
// requires a staging-validated storage fence; this gate is OFF by default.
const STORAGE_DRAIN_MS = 8 * DAY_MS;
const createDeletionWorker = ({ auth, firestore, bucket, logger, now = Date.now,
  storageFenceVerified = () => false, storageDrainMs = STORAGE_DRAIN_MS }) => async (uid) => {
  const ref = lifecycleRef(firestore, uid);
  const token = randomUUID();
  const state = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const value = snap.data();
    if (!snap.exists || value.state === 'active' || value.leaseUntilMs > now()) return null;
    tx.update(ref, { leaseToken: token, leaseUntilMs: now() + 10 * 60000 });
    return value;
  });
  if (!state) return { accepted: true, deleted: false };
  const save = async (fields) => firestore.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.data()?.leaseToken !== token) throw new Error('DELETION_LEASE_LOST');
    tx.update(ref, { ...fields, updatedAtMs: now() });
  });
  let stage = 'disable-auth';
  try {
    try {
      await auth.updateUser(uid, { disabled: true });
      await auth.revokeRefreshTokens(uid);
    } catch (error) { if (!isAuthUserNotFound(error)) throw error; }
    stage = 'user-firestore';
    await save({ stage });
    await firestore.recursiveDelete(firestore.doc(`users/${uid}`));
    stage = 'ai-quotas';
    await firestore.recursiveDelete(firestore.doc(`aiQuotas/${uid}`));
    stage = 'user-storage';
    await save({ stage });
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
    stage = 'global-personal-data';
    for (const query of personalDataQueries(firestore, uid)) await deleteQueryInPages(firestore, query);
    stage = 'reports';
    await deleteReportsInPages(firestore, uid);
    stage = 'authentication';
    try { await auth.deleteUser(uid); } catch (error) {
      if (!isAuthUserNotFound(error)) throw error;
    }
    // Persistently sweep late objects even after completion. A tombstone never
    // expires automatically: removing it would reauthorize an old UID.
    const [files] = await bucket.getFiles({ prefix: `users/${uid}/`, maxResults: 1, autoPaginate: false });
    const complete = files.length === 0 && storageFenceVerified() === true
      && now() >= state.requestedAtMs + storageDrainMs;
    await save({ state: complete ? 'deleted' : 'deleting', stage: complete ? 'complete' : 'storage-drain',
      leaseUntilMs: 0, leaseToken: null, nextSweepMs: now() + DAY_MS, errorCode: null });
    return { accepted: true, deleted: complete, state: complete ? 'deleted' : 'deleting' };
  } catch (error) {
    logger.error('account deletion deferred', { stage, code: 'CLEANUP_RETRY_REQUIRED' });
    await save({ state: 'retry_required', stage, errorCode: 'CLEANUP_RETRY_REQUIRED',
      leaseUntilMs: 0, leaseToken: null, nextSweepMs: now() + 15 * 60000 });
    return { accepted: true, deleted: false, state: 'retry_required' };
  }
};

const createDeleteMyAccountHandler = (dependencies) => async (request) => {
  const { firestore, now = Date.now } = dependencies;
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
  }
  if (!hasRecentAuthentication(request, now)) {
    throw new HttpsError('failed-precondition', 'RECENT_LOGIN_REQUIRED');
  }

  // O UID vem exclusivamente do token verificado pela callable.
  const uid = request.auth.uid;
  const ref = lifecycleRef(firestore, uid);
  await firestore.runTransaction(async (tx) => {
    const previous = await tx.get(ref);
    if (previous.exists && previous.data()?.state !== 'active') return;
    tx.set(ref, { state: 'deleting', requestedAtMs: now(), updatedAtMs: now(),
      nextSweepMs: now(), stage: 'requested', leaseUntilMs: 0 });
  });
  return createDeletionWorker(dependencies)(uid);
};

const createDeletionSweep = (dependencies) => async () => {
  const { firestore, now = Date.now } = dependencies;
  const pending = await firestore.collection('accountLifecycle')
    .where('nextSweepMs', '<=', now()).orderBy('nextSweepMs').limit(25).get();
  const worker = createDeletionWorker(dependencies);
  for (const item of pending.docs) await worker(item.id);
};

module.exports = {
  createDeleteMyAccountHandler,
  createDeletionWorker,
  createDeletionSweep,
  STORAGE_DRAIN_MS,
  RECENT_AUTH_MAX_AGE_SECONDS,
};
