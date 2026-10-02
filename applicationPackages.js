'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const { isJobDiscoverable } = require('./shared/jobPipeline');
const {
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  generateApplicationPackage,
  inputFingerprint,
  regenerateApplicationPackageSection,
} = require('./shared/applicationPackage');
const { projectApplicationQueueItem } = require('./shared/applicationQueue');
const {
  assertApplyJourneyTransition,
  deriveApplyJourneyState,
  packageState,
} = require('./shared/applyJourneyState');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const SECTIONS = new Set([
  'job_analysis', 'resume', 'resume_changes', 'pitch', 'cover_letter', 'answers', 'checklist',
]);

const requestData = (request, allowed) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
  const data = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
    ? request.data : {};
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new HttpsError('invalid-argument', 'INVALID_REQUEST');
  }
  return data;
};

const requiredJobId = (data) => {
  const jobId = typeof data.jobId === 'string' ? data.jobId.trim() : '';
  if (!SAFE_ID.test(jobId)) throw new HttpsError('invalid-argument', 'INVALID_JOB');
  return jobId;
};

const snapshotData = (snapshot, id) => snapshot?.exists ? { id, ...(snapshot.data() || {}) } : null;
const collectionData = async (firestore, path) => {
  const snapshot = await firestore.collection(path).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() || {}) }));
};

const loadInput = async ({ firestore, uid, jobId, nowTimestamp }) => {
  const [
    jobSnapshot, profileSnapshot, professionalFacts, approvedAnswers, recommendationSnapshot,
    applicationSnapshot, queueSnapshot, interactionSnapshot,
  ] = await Promise.all([
    firestore.doc(`jobs/${jobId}`).get(),
    firestore.doc(`users/${uid}`).get(),
    collectionData(firestore, `users/${uid}/professionalFacts`),
    collectionData(firestore, `users/${uid}/approvedAnswers`),
    firestore.doc(`users/${uid}/jobRecommendations/today`).get(),
    firestore.doc(`users/${uid}/applications/${jobId}`).get(),
    firestore.doc(`users/${uid}/applicationQueue/${jobId}`).get(),
    firestore.doc(`users/${uid}/interactions/${jobId}`).get(),
  ]);
  const job = snapshotData(jobSnapshot, jobId);
  const profile = snapshotData(profileSnapshot, uid);
  if (!job || !isJobDiscoverable(job)) throw new HttpsError('failed-precondition', 'JOB_UNAVAILABLE');
  if (!profile) throw new HttpsError('failed-precondition', 'PROFILE_NOT_FOUND');
  const recommendations = recommendationSnapshot.exists
    ? recommendationSnapshot.data()?.recommendations : [];
  const recommendation = Array.isArray(recommendations)
    ? recommendations.find((item) => item?.jobId === jobId) : null;
  return {
    packageId: jobId,
    candidateId: uid,
    job,
    profile,
    professionalFacts,
    approvedAnswers,
    matchScore: recommendation?.score || 0,
    recommendation,
    existingApplication: snapshotData(applicationSnapshot, jobId),
    existingQueueItem: snapshotData(queueSnapshot, jobId),
    interaction: snapshotData(interactionSnapshot, jobId),
    nowTimestamp,
  };
};

const packageRef = (firestore, uid, packageId) =>
  firestore.doc(`users/${uid}/applicationPackages/${packageId}`);
const queueRef = (firestore, uid, jobId) =>
  firestore.doc(`users/${uid}/applicationQueue/${jobId}`);
const operationRef = (firestore, uid, packageId) =>
  firestore.doc(`users/${uid}/applyOperations/package_${packageId}`);

const acquireGenerationLease = async (
  firestore, uid, packageId, fingerprint, nowMs, nowTimestamp,
) => {
  const ref = operationRef(firestore, uid, packageId);
  const leaseUntilMs = nowMs + 120_000;
  const attemptId = `${packageId}:${nowMs}:${Math.random().toString(36).slice(2, 10)}`;
  if (typeof firestore.runTransaction !== 'function') {
    const snapshot = await ref.get();
    const current = snapshot.exists ? snapshot.data() || {} : {};
    if (Number(current.leaseUntilMs || 0) > nowMs) {
      return null;
    }
    await ref.set({ inputFingerprint: fingerprint, leaseUntilMs, attemptId, startedAt: nowTimestamp }, { merge: true });
    return attemptId;
  }
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() || {} : {};
    if (Number(current.leaseUntilMs || 0) > nowMs) {
      return null;
    }
    transaction.set(ref, {
      inputFingerprint: fingerprint, leaseUntilMs, attemptId, startedAt: nowTimestamp,
    }, { merge: true });
    return attemptId;
  });
};

const loadPackage = async (firestore, uid, packageId) => {
  const [metadataSnapshot, answerSnapshot] = await Promise.all([
    packageRef(firestore, uid, packageId).get(),
    firestore.collection(`users/${uid}/applicationPackages/${packageId}/answers`).get(),
  ]);
  if (!metadataSnapshot.exists) return null;
  const metadata = metadataSnapshot.data() || {};
  const answerById = new Map(answerSnapshot.docs.map((document) => [
    document.id, { id: document.id, ...(document.data() || {}) },
  ]));
  const answers = Array.isArray(metadata.answerIds)
    ? metadata.answerIds.map((id) => answerById.get(id)).filter(Boolean)
    : Array.from(answerById.values());
  const { answerIds: _answerIds, ...rest } = metadata;
  return { ...rest, id: packageId, answers };
};

const persistPackage = async (
  firestore, uid, applicationPackage, operation = {}, queueItem = null, expectedRevision = null,
  expectedStatus = undefined, expectedAttemptId = null,
) => {
  const { answers, ...metadata } = applicationPackage;
  const answersCollection = firestore.collection(
    `users/${uid}/applicationPackages/${applicationPackage.id}/answers`,
  );
  if (expectedRevision != null && typeof firestore.runTransaction === 'function') {
    await firestore.runTransaction(async (transaction) => {
      const metadataRef = packageRef(firestore, uid, applicationPackage.id);
      const [metadataSnapshot, existingAnswers, generationSnapshot] = await Promise.all([
        transaction.get(metadataRef), transaction.get(answersCollection),
        expectedAttemptId ? transaction.get(operationRef(firestore, uid, applicationPackage.id)) : null,
      ]);
      const existing = metadataSnapshot.exists ? metadataSnapshot.data() : null;
      if ((expectedRevision === 0 ? metadataSnapshot.exists
        : !existing || Number(existing.revision) !== Number(expectedRevision))
        || (expectedStatus !== undefined && existing?.status !== expectedStatus)
        || (expectedAttemptId && generationSnapshot?.data()?.attemptId !== expectedAttemptId)) {
        throw new HttpsError('aborted', 'STALE_PACKAGE');
      }
      const nextIds = new Set(answers.map((answer) => answer.id));
      transaction.set(metadataRef, { ...metadata, answerIds: answers.map((answer) => answer.id) });
      answers.forEach((answer) => transaction.set(answersCollection.doc(answer.id), answer));
      existingAnswers.docs.forEach((document) => {
        if (!nextIds.has(document.id)) transaction.delete(document.ref);
      });
      if (Object.keys(operation).length > 0) {
        transaction.set(operationRef(firestore, uid, applicationPackage.id), operation, { merge: true });
      }
      if (queueItem) transaction.set(queueRef(firestore, uid, applicationPackage.jobId), queueItem);
    });
    return;
  }
  const existingAnswers = await answersCollection.get();
  const nextIds = new Set(answers.map((answer) => answer.id));
  const batch = firestore.batch();
  batch.set(packageRef(firestore, uid, applicationPackage.id), {
    ...metadata,
    answerIds: answers.map((answer) => answer.id),
  });
  answers.forEach((answer) => batch.set(answersCollection.doc(answer.id), answer));
  existingAnswers.docs.forEach((document) => {
    if (!nextIds.has(document.id)) batch.delete(document.ref);
  });
  if (Object.keys(operation).length > 0) {
    batch.set(operationRef(firestore, uid, applicationPackage.id), operation, { merge: true });
  }
  if (queueItem) batch.set(queueRef(firestore, uid, applicationPackage.jobId), queueItem);
  await batch.commit();
};

const projectQueue = async ({ firestore, uid, applicationPackage, input, nowTimestamp, nowMs }) => {
  const existingSnapshot = await queueRef(firestore, uid, applicationPackage.jobId).get();
  const existing = existingSnapshot.exists ? existingSnapshot.data() || {} : null;
  const fallbackJob = existing?.jobSnapshot ? {
    id: applicationPackage.jobId,
    ...existing.jobSnapshot,
    expiresAt: existing.expiresAt,
  } : { id: applicationPackage.jobId };
  return projectApplicationQueueItem({
    applicationPackage,
    job: input?.job || fallbackJob,
    recommendation: input?.recommendation || null,
    existing,
    nowTimestamp,
    nowMs,
  });
};

const generatingPackage = (input) => ({
  id: input.packageId, jobId: input.job.id, candidateId: input.candidateId,
  status: 'package_generating', generationState: 'generating', matchScore: input.matchScore,
  jobSummary: null, requiredRequirements: [], desiredRequirements: [],
  matchedRequirements: [], missingRequirements: [], risks: [], recommendedResumeId: null,
  adaptedResume: null, pitch: null, coverLetter: null, answers: [], pendingInformation: [],
  warnings: [], checklist: [], createdAt: input.nowTimestamp, updatedAt: input.nowTimestamp,
  generatorVersion: GENERATOR_VERSION, confidence: 'low', revision: 1,
  approvedRevision: null, approvedAt: null, schemaVersion: SCHEMA_VERSION,
});

const createPrepareApplicationPackageHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobId', 'force']);
  const jobId = requiredJobId(data);
  if (data.force != null && typeof data.force !== 'boolean') {
    throw new HttpsError('invalid-argument', 'INVALID_FORCE');
  }
  const uid = request.auth.uid;
  const nowMs = now();
  const nowTimestamp = timestampFromMillis(nowMs);
  let input;
  let generationAttemptId;
  let generationRevision;
  let generationCreatedAt;
  try {
    input = await loadInput({ firestore, uid, jobId, nowTimestamp });
    const fingerprint = inputFingerprint(input);
    const [existing, operationSnapshot] = await Promise.all([
      loadPackage(firestore, uid, jobId),
      operationRef(firestore, uid, jobId).get(),
    ]);
    const operation = operationSnapshot.exists ? operationSnapshot.data() || {} : {};
    const currentState = deriveApplyJourneyState({
      application: input.existingApplication,
      queueItem: input.existingQueueItem,
      applicationPackage: existing,
      recommendation: input.recommendation,
      expiresAt: input.job.applicationDeadline || input.job.expiresAt,
      nowMs,
    });
    if (input.interaction?.recommendationRejectedAt || input.interaction?.passedAt) {
      throw new HttpsError('failed-precondition', 'APPLICATION_REJECTED');
    }
    if (currentState === 'submitted' && existing) {
      return {
        packageId: jobId,
        cached: true,
        generationState: existing.generationState || 'approved',
        terminal: true,
      };
    }
    if (['rejected', 'expired'].includes(currentState)) {
      throw new HttpsError('failed-precondition', `APPLICATION_${currentState.toUpperCase()}`);
    }
    if (!data.force && existing && operation.inputFingerprint === fingerprint
      && !['failed', 'rejected', 'expired', 'package_generating'].includes(existing.status)) {
      const queueItem = await projectQueue({
        firestore, uid, applicationPackage: existing, input, nowTimestamp, nowMs: now(),
      });
      await persistPackage(firestore, uid, existing, {}, queueItem, existing.revision, existing.status);
      return { packageId: jobId, cached: true, generationState: existing.generationState || 'ready_for_review' };
    }

    assertApplyJourneyTransition(currentState, 'package_generating', {
      expiresAt: input.job.applicationDeadline || input.job.expiresAt, nowMs,
    });
    const attemptId = await acquireGenerationLease(
      firestore, uid, jobId, fingerprint, nowMs, nowTimestamp,
    );
    if (!attemptId) {
      return { packageId: jobId, cached: true, generationState: 'generating', inProgress: true };
    }
    generationAttemptId = attemptId;
    generationRevision = existing ? Number(existing.revision || 1) + 1 : 1;
    generationCreatedAt = existing?.createdAt || nowTimestamp;

    await persistPackage(firestore, uid, {
      ...generatingPackage(input),
      createdAt: generationCreatedAt,
      revision: generationRevision,
    }, {
      inputFingerprint: fingerprint, startedAt: nowTimestamp, generatorVersion: GENERATOR_VERSION,
      attemptId, leaseUntilMs: nowMs + 120_000,
    }, null, existing?.revision ?? 0, existing?.status, attemptId);

    const generated = await generateApplicationPackage({
      ...input,
      createdAt: existing?.createdAt,
      revision: generationRevision,
    });
    const queueItem = await projectQueue({
      firestore, uid, applicationPackage: generated, input, nowTimestamp, nowMs: now(),
    });
    assertApplyJourneyTransition('package_generating', packageState(generated.status), {
      expiresAt: input.job.applicationDeadline || input.job.expiresAt, nowMs,
    });
    await persistPackage(firestore, uid, generated, {
      inputFingerprint: fingerprint,
      completedAt: nowTimestamp,
      generatorVersion: GENERATOR_VERSION,
      lastErrorCode: null,
      leaseUntilMs: 0,
    }, queueItem, generationRevision, 'package_generating', attemptId);
    return { packageId: jobId, cached: false, generationState: generated.generationState };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('prepareApplicationPackage failed', {
      jobId, code: error?.code || 'unknown',
    });
    if (input && generationAttemptId) {
      const failed = {
        ...generatingPackage(input),
        createdAt: generationCreatedAt,
        revision: generationRevision,
        status: 'failed', generationState: 'failed',
        warnings: [{ code: 'package_generation_failed', message: 'Não foi possível gerar o pacote.', blocking: true }],
      };
      try {
        const queueItem = await projectQueue({
          firestore, uid, applicationPackage: failed, input, nowTimestamp, nowMs: now(),
        });
        await persistPackage(firestore, uid, failed, {
          failedAt: nowTimestamp, lastErrorCode: String(error?.code || 'unknown').slice(0, 80),
          leaseUntilMs: 0,
        }, queueItem, generationRevision, 'package_generating', generationAttemptId);
      } catch (persistError) {
        logger.error('failed package persistence failed', { code: persistError?.code || 'unknown' });
      }
    }
    throw new HttpsError('unavailable', 'PACKAGE_GENERATION_FAILED');
  }
};

const createRegenerateApplicationPackageSectionHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobId', 'section', 'expectedRevision']);
  const jobId = requiredJobId(data);
  if (!SECTIONS.has(data.section)) throw new HttpsError('invalid-argument', 'INVALID_SECTION');
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    const [input, existing] = await Promise.all([
      loadInput({ firestore, uid, jobId, nowTimestamp }),
      loadPackage(firestore, uid, jobId),
    ]);
    if (!existing) throw new HttpsError('failed-precondition', 'PACKAGE_NOT_FOUND');
    if (data.expectedRevision != null
      && (!Number.isInteger(data.expectedRevision)
        || Number(data.expectedRevision) !== Number(existing.revision))) {
      throw new HttpsError('aborted', 'STALE_PACKAGE');
    }
    const regenerated = await regenerateApplicationPackageSection(
      existing, data.section, input,
    );
    assertApplyJourneyTransition(packageState(existing.status), packageState(regenerated.status), {
      packageChanged: true,
      currentRevision: existing.revision,
      nextRevision: regenerated.revision,
      expiresAt: input.job.applicationDeadline || input.job.expiresAt,
      nowMs: now(),
    });
    const queueItem = await projectQueue({
      firestore, uid, applicationPackage: regenerated, input, nowTimestamp, nowMs: now(),
    });
    await persistPackage(firestore, uid, regenerated, {
      lastRegeneratedSection: data.section,
      lastRegeneratedAt: nowTimestamp,
      inputFingerprint: inputFingerprint(input),
    }, queueItem, existing.revision, existing.status);
    return { packageId: jobId, section: data.section, revision: regenerated.revision };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('regenerateApplicationPackageSection failed', {
      section: data.section, code: error?.code || 'unknown',
    });
    throw new HttpsError('unavailable', 'PACKAGE_SECTION_REGENERATION_FAILED');
  }
};

const contentTarget = (target) => ({
  job_summary: 'jobSummary', resume_changes: 'adaptedResume', pitch: 'pitch', cover_letter: 'coverLetter',
})[target];

const packageReadyState = (applicationPackage) => {
  const blocking = applicationPackage.pendingInformation.some((item) => item.blocking)
    || applicationPackage.warnings.some((item) => item.blocking);
  return {
    status: blocking ? 'package_needs_information' : 'package_ready',
    generationState: blocking ? 'needs_information' : 'ready_for_review',
  };
};

const createUpdateApplicationPackageContentHandler = ({
  firestore,
  logger,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, [
    'jobId', 'target', 'value', 'answerId', 'pendingId', 'riskId', 'expectedRevision',
  ]);
  const jobId = requiredJobId(data);
  const value = text(data.value, 20_000);
  if (!value) throw new HttpsError('invalid-argument', 'EMPTY_CONTENT');
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  try {
    const current = await loadPackage(firestore, uid, jobId);
    if (!current) throw new HttpsError('failed-precondition', 'PACKAGE_NOT_FOUND');
    if (data.expectedRevision != null
      && (!Number.isInteger(data.expectedRevision)
        || Number(data.expectedRevision) !== Number(current.revision))) {
      throw new HttpsError('aborted', 'STALE_PACKAGE');
    }
    const next = {
      ...current,
      revision: Number(current.revision || 1) + 1,
      approvedRevision: null,
      approvedAt: null,
      updatedAt: nowTimestamp,
    };
    const field = contentTarget(data.target);
    if (field) {
      next[field] = {
        content: value,
        sources: [{ type: 'user_input', referenceId: `package:${jobId}:${data.target}`, label: 'Texto editado pelo candidato' }],
        confidence: 'high', generated: false, sensitive: Boolean(next[field]?.sensitive),
        justification: 'Conteúdo informado explicitamente pelo candidato.',
        needsReview: false, reviewStatus: 'reviewed', updatedAt: nowTimestamp,
      };
    } else if (data.target === 'answer') {
      const answerId = text(data.answerId, 160);
      const index = next.answers.findIndex((answer) => answer.id === answerId);
      if (index < 0) throw new HttpsError('invalid-argument', 'ANSWER_NOT_FOUND');
      next.answers[index] = {
        ...next.answers[index], answer: value,
        sources: [{ type: 'user_input', referenceId: answerId, label: 'Resposta editada pelo candidato' }],
        confidence: 'high', generated: false, reused: false, reviewed: true, approved: true,
        justification: 'Resposta informada explicitamente pelo candidato.', needsReview: false,
        updatedAt: nowTimestamp,
      };
    } else if (data.target === 'pending') {
      const pendingId = text(data.pendingId, 160);
      const pending = next.pendingInformation.find((item) => item.id === pendingId);
      if (!pending?.question || !pending.answerId) {
        throw new HttpsError('invalid-argument', 'PENDING_NOT_EDITABLE');
      }
      next.answers.push({
        id: pending.answerId, packageId: jobId, question: pending.question, answer: value,
        sources: [{ type: 'user_input', referenceId: pendingId, label: 'Resposta fornecida pelo candidato' }],
        confidence: 'high', generated: false, reused: false, reviewed: true, approved: true,
        sensitive: pending.sensitive, justification: 'Informação fornecida explicitamente pelo candidato.',
        needsReview: false, updatedAt: nowTimestamp,
      });
      next.pendingInformation = next.pendingInformation.filter((item) => item.id !== pendingId);
    } else if (data.target === 'risk_confirmation') {
      const riskId = text(data.riskId, 160);
      const riskIndex = next.risks.findIndex((risk) => risk.code === riskId);
      if (riskIndex < 0 || next.risks[riskIndex].requiresConfirmation !== true) {
        throw new HttpsError('invalid-argument', 'RISK_NOT_CONFIRMABLE');
      }
      next.risks[riskIndex] = { ...next.risks[riskIndex], confirmed: true };
    } else {
      throw new HttpsError('invalid-argument', 'INVALID_TARGET');
    }
    Object.assign(next, packageReadyState(next));
    assertApplyJourneyTransition(packageState(current.status), packageState(next.status), {
      packageChanged: true,
      currentRevision: current.revision,
      nextRevision: next.revision,
      nowMs: now(),
    });
    const queueItem = await projectQueue({
      firestore, uid, applicationPackage: next, nowTimestamp, nowMs: now(),
    });
    await persistPackage(
      firestore, uid, next, { lastEditedAt: nowTimestamp }, queueItem, current.revision, current.status,
    );
    return { packageId: jobId, revision: next.revision };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('updateApplicationPackageContent failed', { code: error?.code || 'unknown' });
    throw new HttpsError('unavailable', 'PACKAGE_UPDATE_FAILED');
  }
};

const approvePackageValue = (current, nowTimestamp) => {
  if (current.pendingInformation.some((item) => item.blocking)
    || current.warnings.some((item) => item.blocking)
    || current.missingRequirements.some((item) => item.eliminatory)
    || current.risks.some((item) => item.requiresConfirmation && !item.confirmed)) {
    throw new HttpsError('failed-precondition', 'PACKAGE_HAS_BLOCKERS');
  }
  const content = [current.jobSummary, current.adaptedResume, current.pitch, current.coverLetter].filter(Boolean);
  if (!current.jobSummary || content.some((item) => item.confidence === 'low')
    || current.answers.some((answer) => answer.confidence === 'low')) {
    throw new HttpsError('failed-precondition', 'PACKAGE_LOW_CONFIDENCE');
  }
  return {
    ...current,
    status: 'package_approved', generationState: 'approved',
    jobSummary: { ...current.jobSummary, reviewStatus: 'approved', needsReview: false },
    adaptedResume: current.adaptedResume
      ? { ...current.adaptedResume, reviewStatus: 'approved', needsReview: false } : null,
    pitch: current.pitch ? { ...current.pitch, reviewStatus: 'approved', needsReview: false } : null,
    coverLetter: current.coverLetter
      ? { ...current.coverLetter, reviewStatus: 'approved', needsReview: false } : null,
    answers: current.answers.map((answer) => ({
      ...answer, reviewed: true, approved: true, needsReview: false,
    })),
    checklist: (current.checklist || []).map((item) => ({
      ...item, completed: true, needsReview: false,
    })),
    approvedRevision: current.revision, approvedAt: nowTimestamp, updatedAt: nowTimestamp,
  };
};

const createApproveApplicationPackageHandler = ({
  firestore,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobId', 'expectedRevision']);
  const jobId = requiredJobId(data);
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  const current = await loadPackage(firestore, uid, jobId);
  if (!current) throw new HttpsError('failed-precondition', 'PACKAGE_NOT_FOUND');
  if (data.expectedRevision != null
    && (!Number.isInteger(data.expectedRevision) || Number(data.expectedRevision) !== Number(current.revision))) {
    throw new HttpsError('aborted', 'STALE_PACKAGE');
  }
  const next = approvePackageValue(current, nowTimestamp);
  const currentQueueSnapshot = await queueRef(firestore, uid, jobId).get();
  const currentQueue = currentQueueSnapshot.exists ? currentQueueSnapshot.data() || {} : null;
  assertApplyJourneyTransition(
    deriveApplyJourneyState({ queueItem: currentQueue, applicationPackage: current, nowMs: now() }),
    'approved',
    {
      expiresAt: currentQueue?.expiresAt,
      nowMs: now(),
      packageRevision: next.revision,
      approvedRevision: next.approvedRevision,
    },
  );
  const queueItem = await projectQueue({
    firestore, uid, applicationPackage: next, nowTimestamp, nowMs: now(),
  });
  await persistPackage(
    firestore, uid, next, { approvedAt: nowTimestamp }, queueItem, current.revision, current.status,
  );
  await Promise.all(next.answers.map((answer) =>
    firestore.doc(`users/${uid}/approvedAnswers/${answer.id}`).set({
      ...answer,
      sourcePackageId: jobId,
      approvedAt: nowTimestamp,
    }, { merge: true })));
  return { packageId: jobId, revision: next.revision };
};

const createRejectApplicationPackageHandler = ({
  firestore,
  now = () => Date.now(),
  timestampFromMillis = (value) => value,
}) => async (request) => {
  const data = requestData(request, ['jobId', 'reason']);
  const jobId = requiredJobId(data);
  const reason = text(data.reason, 80);
  const uid = request.auth.uid;
  const nowTimestamp = timestampFromMillis(now());
  const current = await loadPackage(firestore, uid, jobId);
  if (!current) throw new HttpsError('failed-precondition', 'PACKAGE_NOT_FOUND');
  assertApplyJourneyTransition(packageState(current.status), 'rejected', { nowMs: now() });
  const next = {
    ...current, status: 'rejected', generationState: 'failed',
    approvedRevision: null, approvedAt: null, updatedAt: nowTimestamp,
  };
  const queueItem = await projectQueue({
    firestore, uid, applicationPackage: next, nowTimestamp, nowMs: now(),
  });
  queueItem.rejectionReason = reason || 'not_interested';
  await persistPackage(
    firestore, uid, next,
    { rejectedAt: nowTimestamp, rejectionReason: reason || 'not_interested' }, queueItem,
    current.revision, current.status,
  );
  await firestore.doc(`users/${uid}/interactions/${jobId}`).set({
    jobId,
    passedAt: nowTimestamp,
    recommendationRejectedAt: nowTimestamp,
    recommendationRejectionReason: reason || 'other',
    lastActionAt: nowTimestamp,
  }, { merge: true });
  return { packageId: jobId, rejected: true };
};

module.exports = {
  createApproveApplicationPackageHandler,
  createPrepareApplicationPackageHandler,
  createRegenerateApplicationPackageSectionHandler,
  createRejectApplicationPackageHandler,
  createUpdateApplicationPackageContentHandler,
  approvePackageValue,
  loadPackage,
  persistPackage,
  projectQueue,
};
