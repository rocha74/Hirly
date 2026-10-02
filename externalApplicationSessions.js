'use strict';

const { isDeepStrictEqual } = require('node:util');
const { HttpsError } = require('firebase-functions/v2/https');
const { loadPackage } = require('./applicationPackages');
const { jobContentFingerprint } = require('./shared/applicationPackage');
const { timestampMillis } = require('./shared/applicationQueue');
const { isJobDiscoverable } = require('./shared/jobPipeline');
const {
  assertApplyJourneyTransition,
  deriveApplyJourneyState,
} = require('./shared/applyJourneyState');
const {
  FAILURE_REASONS,
  completeExternalSession,
  createExternalApplicationSession,
  markAnswerCopied,
  markSessionOpened,
  resumeStoragePathForPackage,
  safeExternalUrl,
  toggleSessionTarget,
} = require('./shared/externalApplication');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';

const requestData = (request, allowed) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
  const data = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
    ? request.data : {};
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new HttpsError('invalid-argument', 'INVALID_REQUEST');
  }
  return data;
};

const requiredId = (value, code) => {
  const normalized = text(value, 160);
  if (!SAFE_ID.test(normalized)) throw new HttpsError('invalid-argument', code);
  return normalized;
};

const snapshotData = (snapshot, id) => snapshot.exists ? { id, ...(snapshot.data() || {}) } : null;
const collectionData = async (firestore, path) => {
  const snapshot = await firestore.collection(path).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() || {}) }));
};
const sessionRef = (firestore, uid, sessionId) =>
  firestore.doc(`users/${uid}/externalApplicationSessions/${sessionId}`);
const queueRef = (firestore, uid, jobId) =>
  firestore.doc(`users/${uid}/applicationQueue/${jobId}`);
const packageRef = (firestore, uid, jobId) =>
  firestore.doc(`users/${uid}/applicationPackages/${jobId}`);
const applicationRef = (firestore, uid, jobId) =>
  firestore.doc(`users/${uid}/applications/${jobId}`);

const loadSession = async (firestore, uid, sessionId) => {
  const snapshot = await sessionRef(firestore, uid, sessionId).get();
  return snapshotData(snapshot, sessionId);
};

const requireSession = async (firestore, uid, sessionId) => {
  const session = await loadSession(firestore, uid, sessionId);
  if (!session) throw new HttpsError('failed-precondition', 'EXTERNAL_SESSION_NOT_FOUND');
  return session;
};

const persistSessionAndQueue = async (
  firestore, uid, session, queuePatch, packagePatch, expectedSession, expectedPackage,
) => firestore.runTransaction(async (transaction) => {
  const sRef = sessionRef(firestore, uid, session.id);
  const pRef = packageRef(firestore, uid, session.packageId);
  const [sessionSnapshot, packageSnapshot] = await Promise.all([
    transaction.get(sRef), transaction.get(pRef),
  ]);
  const currentSession = snapshotData(sessionSnapshot, session.id);
  const currentPackage = snapshotData(packageSnapshot, session.packageId);
  if (!isDeepStrictEqual(currentSession, expectedSession)) {
    throw new HttpsError('aborted', 'STALE_SESSION');
  }
  if (!currentPackage
    || currentPackage.revision !== expectedPackage.revision
    || currentPackage.approvedRevision !== expectedPackage.approvedRevision
    || currentPackage.status !== expectedPackage.status) {
    throw new HttpsError('aborted', 'STALE_PACKAGE');
  }
  transaction.set(sRef, session);
  if (queuePatch) transaction.set(queueRef(firestore, uid, session.jobId), queuePatch, { merge: true });
  if (packagePatch) transaction.set(pRef, packagePatch, { merge: true });
});

const approvedRevisionIsCurrent = (applicationPackage, revision) =>
  Number(applicationPackage?.revision) === Number(revision)
  && Number(applicationPackage?.approvedRevision) === Number(revision);

const assertCurrentSessionPackage = (applicationPackage, session) => {
  if (!applicationPackage || !approvedRevisionIsCurrent(applicationPackage, session.packageRevision)) {
    throw new HttpsError('aborted', 'STALE_PACKAGE');
  }
};

const applicationRecord = (session, nowTimestamp) => ({
  jobId: session.jobId,
  title: session.jobSnapshot?.title || 'Vaga',
  company: session.jobSnapshot?.company || 'Empresa',
  location: session.jobSnapshot?.location || 'Local não informado',
  companyLogoUrl: null,
  applyUrl: session.externalUrl,
  appliedAt: nowTimestamp,
  snapshotAt: nowTimestamp,
  status: 'applied',
  statusUpdatedAt: nowTimestamp,
  applicationSource: 'assistant',
  confirmedByUser: true,
});

const createStartExternalApplicationSessionHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobId']);
  const jobId = requiredId(data.jobId, 'INVALID_JOB');
  const uid = request.auth.uid;
  const nowMs = now();
  const nowTimestamp = timestampFromMillis(nowMs);
  try {
    const [applicationPackage, jobSnapshot, profileSnapshot, facts, queueSnapshot, applicationSnapshot] = await Promise.all([
      loadPackage(firestore, uid, jobId),
      firestore.doc(`jobs/${jobId}`).get(),
      firestore.doc(`users/${uid}`).get(),
      collectionData(firestore, `users/${uid}/professionalFacts`),
      queueRef(firestore, uid, jobId).get(),
      applicationRef(firestore, uid, jobId).get(),
    ]);
    if (!applicationPackage) throw new HttpsError('failed-precondition', 'PACKAGE_NOT_FOUND');
    if (!approvedRevisionIsCurrent(applicationPackage, applicationPackage.revision)) {
      throw new HttpsError('failed-precondition', 'PACKAGE_NOT_APPROVED');
    }
    const job = snapshotData(jobSnapshot, jobId);
    const profile = snapshotData(profileSnapshot, uid);
    if (!job || !profile || !queueSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'EXTERNAL_SESSION_INPUT_MISSING');
    }
    const expiryMs = timestampMillis(job.applicationDeadline || job.expiresAt);
    if (expiryMs != null && expiryMs <= nowMs) {
      throw new HttpsError('failed-precondition', 'JOB_EXPIRED');
    }
    if (!isJobDiscoverable(job, nowMs)) {
      throw new HttpsError('failed-precondition', 'JOB_UNAVAILABLE');
    }
    const queue = queueSnapshot.data() || {};
    const approvedJob = queue.jobSnapshot;
    const currentUrl = safeExternalUrl(job.applyUrl);
    if (applicationPackage.jobContentFingerprint
      && applicationPackage.jobContentFingerprint !== jobContentFingerprint(job)) {
      throw new HttpsError('aborted', 'JOB_CHANGED_REVIEW_REQUIRED');
    }
    if (approvedJob && (
      approvedJob.title !== job.title
      || approvedJob.company !== job.company
      || safeExternalUrl(approvedJob.applyUrl) !== currentUrl
    )) throw new HttpsError('aborted', 'JOB_CHANGED_REVIEW_REQUIRED');
    const resumeStoragePath = resumeStoragePathForPackage(applicationPackage, profile);
    const sessionId = `${jobId}:${applicationPackage.revision}`;
    const existing = await loadSession(firestore, uid, sessionId);
    const currentState = deriveApplyJourneyState({
      application: snapshotData(applicationSnapshot, jobId),
      queueItem: queue,
      applicationPackage,
      externalSession: existing,
      expiresAt: job.applicationDeadline || job.expiresAt,
      nowMs,
    });
    if (existing?.status === 'completed' && existing.userConfirmation === 'submitted') {
      return { sessionId, externalUrl: existing.externalUrl, status: existing.status, duplicate: true };
    }
    if (existing && ['created', 'in_progress', 'awaiting_confirmation'].includes(existing.status)) {
      if (safeExternalUrl(existing.externalUrl) !== currentUrl) {
        throw new HttpsError('aborted', 'JOB_CHANGED_REVIEW_REQUIRED');
      }
      if (existing.resumeStoragePath !== resumeStoragePath) {
        await persistSessionAndQueue(firestore, uid, {
          ...existing, resumeStoragePath, updatedAt: nowTimestamp,
        }, null, null, existing, applicationPackage);
      }
      return { sessionId, externalUrl: existing.externalUrl, status: existing.status, duplicate: true };
    }
    assertApplyJourneyTransition(currentState, 'external_pending', {
      expiresAt: job.applicationDeadline || job.expiresAt, nowMs,
    });
    const session = createExternalApplicationSession({
      applicationPackage, job, profile, professionalFacts: facts, existing,
      nowTimestamp,
    });
    await persistSessionAndQueue(firestore, uid, session, {
      status: 'external_pending', candidateDecision: 'approved',
      approvedAt: queue.approvedAt || applicationPackage.approvedAt,
      updatedAt: nowTimestamp,
    }, {
      status: 'external_pending', updatedAt: nowTimestamp,
    }, existing, applicationPackage);
    return { sessionId, externalUrl: session.externalUrl, status: session.status, duplicate: false };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error?.message === 'STALE_RESUME') {
      throw new HttpsError('aborted', 'RESUME_CHANGED_REVIEW_REQUIRED');
    }
    logger.error('startExternalApplicationSession failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'EXTERNAL_SESSION_START_FAILED');
  }
};

const createMarkExternalApplicationSessionOpenedHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['sessionId']);
  const sessionId = requiredId(data.sessionId, 'INVALID_SESSION');
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    const current = await requireSession(firestore, uid, sessionId);
    if (current.status === 'completed') return { sessionId, duplicate: true };
    const [applicationPackage, jobSnapshot] = await Promise.all([
      loadPackage(firestore, uid, current.packageId),
      firestore.doc(`jobs/${current.jobId}`).get(),
    ]);
    assertCurrentSessionPackage(applicationPackage, current);
    const job = snapshotData(jobSnapshot, current.jobId);
    if (!job || !isJobDiscoverable(job, now())
      || (applicationPackage.jobContentFingerprint
        && applicationPackage.jobContentFingerprint !== jobContentFingerprint(job))
      || safeExternalUrl(job.applyUrl) !== safeExternalUrl(current.externalUrl)) {
      throw new HttpsError('failed-precondition', 'JOB_UNAVAILABLE');
    }
    assertApplyJourneyTransition(
      deriveApplyJourneyState({ applicationPackage, externalSession: current, nowMs: now() }),
      'external_in_progress',
      { nowMs: now() },
    );
    const next = markSessionOpened(current, nowTimestamp);
    await persistSessionAndQueue(firestore, uid, next, {
      status: 'external_in_progress', updatedAt: nowTimestamp,
    }, {
      status: 'external_in_progress', updatedAt: nowTimestamp,
    }, current, applicationPackage);
    return { sessionId, duplicate: current.status === 'in_progress' };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('markExternalApplicationSessionOpened failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'EXTERNAL_SESSION_SYNC_FAILED');
  }
};

const createMarkExternalAnswerCopiedHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['sessionId', 'answerId']);
  const sessionId = requiredId(data.sessionId, 'INVALID_SESSION');
  const answerId = requiredId(data.answerId, 'INVALID_ANSWER');
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    const current = await requireSession(firestore, uid, sessionId);
    const applicationPackage = await loadPackage(firestore, uid, current.packageId);
    assertCurrentSessionPackage(applicationPackage, current);
    if (current.status === 'completed') throw new HttpsError('failed-precondition', 'SESSION_ALREADY_COMPLETED');
    const answer = applicationPackage?.answers.find((item) => item.id === answerId);
    if (!answer) throw new HttpsError('failed-precondition', 'ANSWER_NOT_FOUND');
    if (answer.sensitive) throw new HttpsError('failed-precondition', 'SENSITIVE_ANSWER_MANUAL_ONLY');
    const duplicate = (current.copiedAnswers || []).some((item) => item.answerId === answerId);
    const next = markAnswerCopied(current, answerId, nowTimestamp);
    await persistSessionAndQueue(firestore, uid, next, null, null, current, applicationPackage);
    return { sessionId, answerId, duplicate };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('markExternalAnswerCopied failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'EXTERNAL_SESSION_SYNC_FAILED');
  }
};

const createToggleExternalSessionTargetHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['sessionId', 'targetType', 'targetId', 'completed']);
  const sessionId = requiredId(data.sessionId, 'INVALID_SESSION');
  const targetId = requiredId(data.targetId, 'INVALID_TARGET');
  if (!['field', 'checklist'].includes(data.targetType) || typeof data.completed !== 'boolean') {
    throw new HttpsError('invalid-argument', 'INVALID_TARGET');
  }
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    const current = await requireSession(firestore, uid, sessionId);
    const applicationPackage = await loadPackage(firestore, uid, current.packageId);
    assertCurrentSessionPackage(applicationPackage, current);
    if (current.status === 'completed') throw new HttpsError('failed-precondition', 'SESSION_ALREADY_COMPLETED');
    const next = toggleSessionTarget(
      current, data.targetType, targetId, data.completed, nowTimestamp,
    );
    await persistSessionAndQueue(firestore, uid, next, null, null, current, applicationPackage);
    return { sessionId, targetId, completed: data.completed };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error?.message === 'TARGET_NOT_FOUND') {
      throw new HttpsError('failed-precondition', 'TARGET_NOT_FOUND');
    }
    logger.error('toggleExternalSessionTarget failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'EXTERNAL_SESSION_SYNC_FAILED');
  }
};

const createCompleteExternalApplicationSessionHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['sessionId', 'outcome', 'failureReason']);
  const sessionId = requiredId(data.sessionId, 'INVALID_SESSION');
  if (!['submitted', 'failed', 'remind_later'].includes(data.outcome)) {
    throw new HttpsError('invalid-argument', 'INVALID_OUTCOME');
  }
  const failureReason = data.outcome === 'failed' ? text(data.failureReason, 80) : null;
  if (data.outcome === 'failed' && !FAILURE_REASONS.has(failureReason)) {
    throw new HttpsError('invalid-argument', 'INVALID_FAILURE_REASON');
  }
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    if (typeof firestore.runTransaction === 'function') {
      return await firestore.runTransaction(async (transaction) => {
        const sRef = sessionRef(firestore, uid, sessionId);
        const initialSessionSnapshot = await transaction.get(sRef);
        const current = snapshotData(initialSessionSnapshot, sessionId);
        if (!current) throw new HttpsError('failed-precondition', 'EXTERNAL_SESSION_NOT_FOUND');
        const pRef = packageRef(firestore, uid, current.packageId);
        const qRef = queueRef(firestore, uid, current.jobId);
        const aRef = applicationRef(firestore, uid, current.jobId);
        const [packageSnapshot, queueSnapshot, applicationSnapshot] = await Promise.all([
          transaction.get(pRef), transaction.get(qRef), transaction.get(aRef),
        ]);
        const applicationPackage = snapshotData(packageSnapshot, current.packageId);
        const existingApplication = snapshotData(applicationSnapshot, current.jobId);
        if ((current.status === 'completed' && current.userConfirmation === 'submitted')
          || existingApplication) {
          const reconciled = completeExternalSession(
            current, 'submitted', null, null, nowTimestamp,
          );
          transaction.set(sRef, reconciled);
          transaction.set(qRef, {
            status: 'submitted', submittedAt: current.completedAt || nowTimestamp,
            updatedAt: nowTimestamp,
          }, { merge: true });
          transaction.set(pRef, {
            status: 'submitted', updatedAt: nowTimestamp,
          }, { merge: true });
          transaction.set(firestore.doc(`users/${uid}/interactions/${current.jobId}`), {
            jobId: current.jobId,
            appliedAt: existingApplication?.appliedAt || current.completedAt || nowTimestamp,
            lastActionAt: nowTimestamp,
          }, { merge: true });
          return { sessionId, status: 'completed', duplicate: true };
        }
        assertCurrentSessionPackage(applicationPackage, current);
        const targetState = data.outcome === 'submitted' ? 'submitted'
          : data.outcome === 'failed' ? 'failed' : 'external_pending';
        assertApplyJourneyTransition(deriveApplyJourneyState({
          queueItem: snapshotData(queueSnapshot, current.jobId),
          applicationPackage,
          externalSession: current,
          nowMs: now(),
        }), targetState, {
          nowMs: now(), explicitConfirmation: data.outcome === 'submitted',
        });
        const next = completeExternalSession(
          current, data.outcome, failureReason, null, nowTimestamp,
        );
        transaction.set(sRef, next);
        transaction.set(qRef, {
          status: targetState,
          submittedAt: data.outcome === 'submitted' ? nowTimestamp : null,
          updatedAt: nowTimestamp,
        }, { merge: true });
        transaction.set(pRef, {
          status: targetState,
          updatedAt: nowTimestamp,
        }, { merge: true });
        if (data.outcome === 'submitted') {
          transaction.set(aRef, applicationRecord(current, nowTimestamp), { merge: true });
          transaction.set(firestore.doc(`users/${uid}/interactions/${current.jobId}`), {
            jobId: current.jobId, appliedAt: nowTimestamp, lastActionAt: nowTimestamp,
          }, { merge: true });
        }
        return { sessionId, status: next.status, duplicate: false };
      });
    }
    const current = await requireSession(firestore, uid, sessionId);
    if (current.status === 'completed' && data.outcome === 'submitted') {
      return { sessionId, status: current.status, duplicate: true };
    }
    const applicationPackage = await loadPackage(firestore, uid, current.packageId);
    assertCurrentSessionPackage(applicationPackage, current);
    const targetState = data.outcome === 'submitted' ? 'submitted'
      : data.outcome === 'failed' ? 'failed' : 'external_pending';
    assertApplyJourneyTransition(deriveApplyJourneyState({
      applicationPackage, externalSession: current, nowMs: now(),
    }), targetState, { nowMs: now(), explicitConfirmation: data.outcome === 'submitted' });
    const next = completeExternalSession(
      current, data.outcome, failureReason, null, nowTimestamp,
    );
    const queueStatus = targetState;
    const batch = firestore.batch();
    batch.set(sessionRef(firestore, uid, sessionId), next);
    batch.set(queueRef(firestore, uid, current.jobId), {
      status: queueStatus,
      submittedAt: data.outcome === 'submitted' ? nowTimestamp : null,
      updatedAt: nowTimestamp,
    }, { merge: true });
    batch.set(packageRef(firestore, uid, current.packageId), {
      status: targetState, updatedAt: nowTimestamp,
    }, { merge: true });
    if (data.outcome === 'submitted') {
      batch.set(applicationRef(firestore, uid, current.jobId), applicationRecord(current, nowTimestamp), { merge: true });
      batch.set(firestore.doc(`users/${uid}/interactions/${current.jobId}`), {
        jobId: current.jobId, appliedAt: nowTimestamp, lastActionAt: nowTimestamp,
      }, { merge: true });
    }
    await batch.commit();
    return { sessionId, status: next.status, duplicate: false };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('completeExternalApplicationSession failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'EXTERNAL_SESSION_SYNC_FAILED');
  }
};

module.exports = {
  createCompleteExternalApplicationSessionHandler,
  createMarkExternalAnswerCopiedHandler,
  createMarkExternalApplicationSessionOpenedHandler,
  createStartExternalApplicationSessionHandler,
  createToggleExternalSessionTargetHandler,
  loadSession,
};
