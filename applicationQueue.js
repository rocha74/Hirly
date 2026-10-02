'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const {
  approvePackageValue,
  loadPackage,
  persistPackage,
  projectQueue,
} = require('./applicationPackages');
const { evaluateBulkApproval, timestampMillis } = require('./shared/applicationQueue');
const {
  assertApplyJourneyTransition,
  deriveApplyJourneyState,
} = require('./shared/applyJourneyState');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const requestData = (request, allowed) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
  const data = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
    ? request.data : {};
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new HttpsError('invalid-argument', 'INVALID_REQUEST');
  }
  return data;
};

const id = (value, code) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!SAFE_ID.test(normalized)) throw new HttpsError('invalid-argument', code);
  return normalized;
};

const jobIds = (value) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new HttpsError('invalid-argument', 'INVALID_JOB_IDS');
  }
  return value.map((jobId) => id(jobId, 'INVALID_JOB'));
};

const queueRef = (firestore, uid, jobId) =>
  firestore.doc(`users/${uid}/applicationQueue/${jobId}`);
const operationRef = (firestore, uid, actionId) =>
  firestore.doc(`users/${uid}/applyOperations/queue_${actionId}`);

const loadQueueItem = async (firestore, uid, jobId) => {
  const snapshot = await queueRef(firestore, uid, jobId).get();
  return snapshot.exists ? { id: jobId, ...(snapshot.data() || {}) } : null;
};

const createDeferApplicationQueueItemHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobId', 'actionId']);
  const jobId = id(data.jobId, 'INVALID_JOB');
  const actionId = id(data.actionId, 'INVALID_ACTION');
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    return await firestore.runTransaction(async (transaction) => {
      const ref = queueRef(firestore, uid, jobId);
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists ? snapshot.data() : null;
      if (!current) throw new HttpsError('failed-precondition', 'QUEUE_ITEM_NOT_FOUND');
      if (current.status === 'deferred' && current.lastActionId === actionId) {
        return { jobId, deferred: true, duplicate: true };
      }
      const expiryMs = timestampMillis(current.expiresAt);
      if (!['prepared', 'needs_information', 'approved', 'deferred', 'failed'].includes(current.status)
        || (expiryMs != null && expiryMs <= now())) {
        throw new HttpsError('failed-precondition', 'QUEUE_ITEM_NOT_DEFERRABLE');
      }
      transaction.set(ref, {
        ...current,
        status: 'deferred',
        candidateDecision: 'deferred',
        deferredAt: nowTimestamp,
        updatedAt: nowTimestamp,
        lastActionId: actionId,
      });
      return { jobId, deferred: true, duplicate: false };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('deferApplicationQueueItem failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'QUEUE_SYNC_FAILED');
  }
};

const approvedAnswers = async (firestore, uid, next, nowTimestamp) => {
  await Promise.all(next.answers.map((answer) =>
    firestore.doc(`users/${uid}/approvedAnswers/${answer.id}`).set({
      ...answer, sourcePackageId: next.jobId, approvedAt: nowTimestamp,
    }, { merge: true })));
};

const createBulkApproveApplicationQueueHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobIds', 'actionId']);
  const requestedJobIds = jobIds(data.jobIds);
  const actionId = id(data.actionId, 'INVALID_ACTION');
  const uid = request.auth.uid;
  const nowMs = now();
  const nowTimestamp = timestampFromMillis(nowMs);
  const operation = operationRef(firestore, uid, actionId);
  try {
    const previous = await operation.get();
    if (previous.exists && previous.data()?.result) {
      return { ...previous.data().result, duplicate: true };
    }
    const uniqueIds = Array.from(new Set(requestedJobIds));
    const pairs = await Promise.all(uniqueIds.map(async (jobId) => ({
      jobId,
      applicationPackage: await loadPackage(firestore, uid, jobId),
      queueItem: await loadQueueItem(firestore, uid, jobId),
    })));
    const entries = new Map(pairs.filter((entry) => entry.applicationPackage && entry.queueItem)
      .map((entry) => [entry.jobId, entry]));
    const evaluation = evaluateBulkApproval({ jobIds: requestedJobIds, entries, nowMs });
    for (const jobId of evaluation.approvedIds) {
      const entry = entries.get(jobId);
      const next = approvePackageValue(entry.applicationPackage, nowTimestamp);
      assertApplyJourneyTransition(deriveApplyJourneyState({
        queueItem: entry.queueItem, applicationPackage: entry.applicationPackage, nowMs,
      }), 'approved', {
        expiresAt: entry.queueItem.expiresAt,
        nowMs,
        packageRevision: next.revision,
        approvedRevision: next.approvedRevision,
      });
      const queueItem = await projectQueue({
        firestore, uid, applicationPackage: next, nowTimestamp, nowMs,
      });
      queueItem.lastActionId = actionId;
      await persistPackage(
        firestore, uid, next, { approvedAt: nowTimestamp }, queueItem,
        entry.applicationPackage.revision, entry.applicationPackage.status,
      );
      await approvedAnswers(firestore, uid, next, nowTimestamp);
    }
    const result = {
      approvedIds: evaluation.approvedIds,
      blocked: evaluation.blocked,
      duplicateCount: evaluation.duplicateCount,
      duplicate: false,
    };
    await operation.set({ actionId, type: 'bulk_approve', createdAt: nowTimestamp, result });
    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('bulkApproveApplicationQueue failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'QUEUE_SYNC_FAILED');
  }
};

const createBulkRemoveApplicationQueueHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobIds', 'actionId']);
  const requestedJobIds = Array.from(new Set(jobIds(data.jobIds)));
  const actionId = id(data.actionId, 'INVALID_ACTION');
  const uid = request.auth.uid;
  const nowMs = now();
  const nowTimestamp = timestampFromMillis(nowMs);
  const operation = operationRef(firestore, uid, actionId);
  try {
    const previous = await operation.get();
    if (previous.exists && previous.data()?.result) {
      return { ...previous.data().result, duplicate: true };
    }
    const removedIds = [];
    const blocked = [];
    for (const jobId of requestedJobIds) {
      const current = await loadPackage(firestore, uid, jobId);
      const currentQueue = await loadQueueItem(firestore, uid, jobId);
      if (!current || !currentQueue || currentQueue.status === 'submitted') {
        blocked.push({ jobId, reasons: [currentQueue?.status === 'submitted' ? 'already_submitted' : 'not_found'] });
        continue;
      }
      try {
        assertApplyJourneyTransition(deriveApplyJourneyState({
          queueItem: currentQueue, applicationPackage: current, nowMs,
        }), 'rejected', { expiresAt: currentQueue.expiresAt, nowMs });
      } catch {
        blocked.push({ jobId, reasons: ['invalid_transition'] });
        continue;
      }
      const next = {
        ...current,
        status: 'rejected', generationState: 'failed', approvedRevision: null,
        approvedAt: null, updatedAt: nowTimestamp,
      };
      const queueItem = await projectQueue({
        firestore, uid, applicationPackage: next, nowTimestamp, nowMs,
      });
      queueItem.rejectionReason = 'bulk_removed';
      queueItem.lastActionId = actionId;
      await persistPackage(
        firestore, uid, next,
        { rejectedAt: nowTimestamp, rejectionReason: 'bulk_removed' }, queueItem,
        current.revision, current.status,
      );
      removedIds.push(jobId);
    }
    const result = { removedIds, blocked, duplicate: false };
    await operation.set({ actionId, type: 'bulk_remove', createdAt: nowTimestamp, result });
    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('bulkRemoveApplicationQueue failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'QUEUE_SYNC_FAILED');
  }
};

module.exports = {
  createBulkApproveApplicationQueueHandler,
  createBulkRemoveApplicationQueueHandler,
  createDeferApplicationQueueItemHandler,
  loadQueueItem,
};
