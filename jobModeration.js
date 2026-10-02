'use strict';

const { HttpsError } = require('firebase-functions/v2/https');

const REPORT_REASONS = new Set([
  'fake', 'mlm', 'discrimination', 'salary_lie', 'closed', 'duplicate', 'broken_link', 'other',
]);
const AUTO_PAUSE_REPORT_COUNT = 3;

const createReportJobHandler = ({ firestore, logger, serverTimestamp }) => async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
  const data = request.data && typeof request.data === 'object' ? request.data : {};
  const jobId = typeof data.jobId === 'string' ? data.jobId.trim() : '';
  const reason = typeof data.reason === 'string' ? data.reason : '';
  const details = typeof data.details === 'string' ? data.details.trim().slice(0, 600) : '';
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(jobId)) throw new HttpsError('invalid-argument', 'INVALID_JOB');
  if (!REPORT_REASONS.has(reason)) throw new HttpsError('invalid-argument', 'INVALID_REASON');

  const uid = request.auth.uid;
  const reportId = `${jobId}_${uid}`;
  const reportRef = firestore.doc(`reports/${reportId}`);
  const nestedRef = firestore.doc(`jobs/${jobId}/reports/${uid}`);
  const jobRef = firestore.doc(`jobs/${jobId}`);

  try {
    return await firestore.runTransaction(async (transaction) => {
      const [existingReport, jobSnapshot] = await Promise.all([
        transaction.get(reportRef),
        transaction.get(jobRef),
      ]);
      if (!jobSnapshot.exists) throw new HttpsError('not-found', 'JOB_NOT_FOUND');
      if (existingReport.exists) return { reported: true, duplicate: true };

      const currentCount = Number(jobSnapshot.data()?.reportsCount ?? 0);
      const reportsCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
      const payload = {
        jobId,
        reason,
        details,
        reportedBy: uid,
        createdAt: serverTimestamp(),
      };
      transaction.create(reportRef, payload);
      transaction.set(nestedRef, payload);
      transaction.update(jobRef, {
        reportsCount,
        moderationStatus: reportsCount >= AUTO_PAUSE_REPORT_COUNT ? 'needs_review' : 'clear',
        ...(reportsCount >= AUTO_PAUSE_REPORT_COUNT ? {
          status: 'paused',
          isActive: false,
          verificationStatus: 'needs_review',
        } : {}),
        moderationUpdatedAt: serverTimestamp(),
      });
      return { reported: true, duplicate: false };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('reportJob failed', { code: error?.code || 'unknown' });
    throw new HttpsError('internal', 'REPORT_FAILED');
  }
};

module.exports = { AUTO_PAUSE_REPORT_COUNT, REPORT_REASONS, createReportJobHandler };
