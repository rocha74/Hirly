'use strict';

const { VERIFICATION_MAX_AGE_DAYS, timestampMillis } = require('./shared/jobPipeline');

const maintenancePatch = (job, now) => {
  const expiresAt = timestampMillis(job.expiresAt);
  const deadline = timestampMillis(job.applicationDeadline);
  if ((expiresAt && expiresAt <= now) || (deadline && deadline <= now)) {
    return {
      status: 'expired',
      isActive: false,
      verificationStatus: 'stale',
      maintenanceReason: deadline && deadline <= now ? 'application_deadline' : 'expires_at',
    };
  }
  const lastVerifiedAt = timestampMillis(job.lastVerifiedAt);
  const staleBefore = now - VERIFICATION_MAX_AGE_DAYS * 86_400_000;
  if (!lastVerifiedAt || lastVerifiedAt < staleBefore) {
    return {
      status: 'paused',
      isActive: false,
      verificationStatus: 'stale',
      curationStatus: 'needs_review',
      maintenanceReason: 'verification_stale',
    };
  }
  return null;
};

const createExpireJobsHandler = ({ firestore, logger, now = Date.now, serverTimestamp }) => async () => {
  const snapshot = await firestore.collection('jobs').where('isActive', '==', true).get();
  let expired = 0;
  let stale = 0;
  let batch = firestore.batch();
  let batchSize = 0;
  for (const document of snapshot.docs) {
    const patch = maintenancePatch(document.data(), now());
    if (!patch) continue;
    if (patch.status === 'expired') expired += 1;
    else stale += 1;
    batch.update(document.ref, { ...patch, maintenanceAt: serverTimestamp() });
    batchSize += 1;
    if (batchSize === 400) {
      await batch.commit();
      batch = firestore.batch();
      batchSize = 0;
    }
  }
  if (batchSize > 0) await batch.commit();
  logger.info('expireJobs completed', { scanned: snapshot.size, expired, stale });
  return { scanned: snapshot.size, expired, stale };
};

module.exports = { createExpireJobsHandler, maintenancePatch };
