'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const { isJobDiscoverable, timestampMillis } = require('./shared/jobPipeline');

const createResolveJobLinkHandler = ({ firestore, logger, now = () => Date.now() }) => async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
  const data = request.data && typeof request.data === 'object' ? request.data : {};
  if (Object.keys(data).some((key) => key !== 'jobId')) {
    throw new HttpsError('invalid-argument', 'INVALID_REQUEST');
  }
  const jobId = typeof data.jobId === 'string' ? data.jobId.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(jobId)) {
    throw new HttpsError('invalid-argument', 'INVALID_JOB');
  }

  try {
    const snapshot = await firestore.doc(`jobs/${jobId}`).get();
    if (!snapshot.exists) return { status: 'not_found' };
    const job = snapshot.data() || {};
    const currentTime = now();
    if (isJobDiscoverable(job, currentTime)) return { status: 'available' };
    const expiresAt = timestampMillis(job.expiresAt);
    const deadline = timestampMillis(job.applicationDeadline);
    const expired = (expiresAt != null && expiresAt <= currentTime)
      || (deadline != null && deadline <= currentTime);
    return { status: 'closed', reason: expired ? 'expired' : 'inactive' };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('resolveJobLink failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'LINK_RESOLUTION_UNAVAILABLE');
  }
};

module.exports = { createResolveJobLinkHandler };
