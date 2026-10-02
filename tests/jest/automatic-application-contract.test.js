const {
  APPLICATION_DELIVERY_MODES: BACKEND_DELIVERY_MODES,
  APPLICATION_SUBMISSION_STATES: BACKEND_SUBMISSION_STATES,
  createApplicationConsent,
  createApplicationSubmissionAttempt,
  createProviderApplicationForm,
  mapLegacyExternalSessionToSubmissionAttempt: mapBackendLegacySession,
  projectApplicationSubmission,
} = require('../../functions/shared/automaticApplication');
const {
  APPLICATION_DELIVERY_MODES,
  APPLICATION_SUBMISSION_STATES,
  mapLegacyExternalSessionToSubmissionAttempt,
  validateApplicationConsent,
  validateApplicationSubmissionAttempt,
  validateApplicationSubmissionProjection,
  validateProviderApplicationForm,
} = require('../../src/features/apply/domain/automaticApplication');

const timestamp = (millis) => ({ toMillis: () => millis });
const hash = (character) => character.repeat(64);

const buildAggregate = () => {
  const form = createProviderApplicationForm({
    id: 'fake:job-1:v1',
    candidateId: 'alice',
    jobId: 'job-1',
    company: 'Empresa Teste',
    destinationUrl: 'https://ats.example.com/jobs/1',
    providerId: 'fake_official',
    providerJobId: 'external-job-1',
    version: '1',
    questions: [{
      id: 'question-1',
      providerQuestionId: 'external-question-1',
      label: 'Conte sua motivação',
      type: 'long_text',
      required: true,
      sensitive: false,
      options: [],
      limits: { minLength: 10, maxLength: 1_000 },
    }],
    requiredDocuments: [{
      id: 'resume',
      providerDocumentId: 'external-resume',
      kind: 'resume',
      label: 'Currículo',
      required: true,
      acceptedMimeTypes: ['application/pdf'],
      maxFileSizeBytes: 10 * 1024 * 1024,
      maxFiles: 1,
    }],
    fetchedAt: timestamp(1_800_000_000_000),
    expiresAt: null,
  });
  const consent = createApplicationConsent({
    id: 'consent-1',
    candidateId: 'alice',
    jobId: 'job-1',
    company: form.company,
    destinationUrl: form.destinationUrl,
    providerId: form.providerId,
    providerJobId: form.providerJobId,
    mode: 'official_api',
    packageId: 'job-1',
    packageRevision: 2,
    packageFingerprint: hash('a'),
    form: { id: form.id, version: form.version, fingerprint: form.fingerprint },
    resume: {
      id: 'resume-1',
      kind: 'resume',
      storagePath: 'users/alice/cv/resume-1.pdf',
      storageGeneration: '12345',
      fileName: 'curriculo.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100_000,
      contentFingerprint: hash('b'),
      version: 1,
      capturedAt: timestamp(1_800_000_100_000),
    },
    attachments: [],
    answers: [{
      answerId: 'answer-1',
      questionId: 'question-1',
      providerQuestionId: 'external-question-1',
      valueFingerprint: hash('c'),
      answerVersion: 1,
      sensitive: false,
      reviewedAt: timestamp(1_800_000_200_000),
    }],
    payloadFingerprint: hash('d'),
    consentTextVersion: 'one_tap_v1',
    approvedAt: timestamp(1_800_000_300_000),
  });
  const attempt = createApplicationSubmissionAttempt({
    id: 'attempt-1',
    consent,
    createdAt: timestamp(1_800_000_400_000),
  });
  return { form, consent, attempt };
};

describe('automatic application JS/TS contract', () => {
  test('backend enums stay aligned with the frontend domain', () => {
    expect(BACKEND_DELIVERY_MODES).toEqual(APPLICATION_DELIVERY_MODES);
    expect(BACKEND_SUBMISSION_STATES).toEqual(APPLICATION_SUBMISSION_STATES);
  });

  test('frontend accepts backend-owned records and only receives a projection', () => {
    const { form, consent, attempt } = buildAggregate();
    expect(validateProviderApplicationForm(form, 'alice')).toEqual(
      expect.objectContaining({ success: true }),
    );
    expect(validateApplicationConsent(consent, 'alice')).toEqual(
      expect.objectContaining({ success: true }),
    );
    expect(validateApplicationSubmissionAttempt(attempt, 'alice')).toEqual(
      expect.objectContaining({ success: true }),
    );

    const projection = projectApplicationSubmission(attempt, consent);
    expect(validateApplicationSubmissionProjection(projection, 'alice')).toEqual(
      expect.objectContaining({ success: true }),
    );
    expect(projection).not.toHaveProperty('payloadFingerprint');
    expect(projection).not.toHaveProperty('answers');
    expect(projection).not.toHaveProperty('storagePath');
  });

  test('frontend rejects a projection that hides an unknown outcome', () => {
    const { consent, attempt } = buildAggregate();
    const projection = projectApplicationSubmission(attempt, consent);
    expect(validateApplicationSubmissionProjection({
      ...projection,
      state: 'unknown',
      requiresReconciliation: false,
    }, 'alice')).toEqual(expect.objectContaining({ success: false }));
  });

  test('frontend legacy mapper preserves manual confirmation without provider proof', () => {
    const completedAt = timestamp(1_800_000_500_000);
    const attempt = mapLegacyExternalSessionToSubmissionAttempt({
      id: 'legacy-session',
      candidateId: 'alice',
      jobId: 'job-legacy',
      packageId: 'job-legacy',
      packageRevision: 2,
      status: 'completed',
      userConfirmation: 'submitted',
      jobSnapshot: { company: 'Empresa Antiga' },
      startedAt: timestamp(1_800_000_000_000),
      completedAt,
      updatedAt: completedAt,
    }, timestamp(1_800_000_600_000));
    expect(attempt).toEqual(expect.objectContaining({
      mode: 'manual_assist',
      state: 'submitted',
      consentId: null,
      confirmationSource: 'candidate',
      providerReference: null,
    }));
    expect(validateApplicationSubmissionAttempt(attempt, 'alice')).toEqual(
      expect.objectContaining({ success: true }),
    );
  });

  test('frontend and backend derive the same bounded legacy attempt ID', () => {
    const sourceId = `session-${'a'.repeat(152)}`;
    const migratedAt = timestamp(1_800_000_600_000);
    const session = {
      id: sourceId,
      candidateId: 'alice',
      jobId: 'job-legacy',
      packageId: 'job-legacy',
      status: 'created',
      userConfirmation: 'pending',
      startedAt: timestamp(1_800_000_000_000),
      completedAt: null,
      updatedAt: timestamp(1_800_000_000_000),
    };
    const frontend = mapLegacyExternalSessionToSubmissionAttempt(session, migratedAt);
    const backend = mapBackendLegacySession(session, migratedAt);
    expect(frontend.id).toBe(backend.id);
    expect(frontend.id.length).toBeLessThanOrEqual(160);
  });
});
