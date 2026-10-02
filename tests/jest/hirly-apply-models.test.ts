import { Timestamp } from 'firebase/firestore';
import {
  applicationQueuePriorityRank,
  HIRLY_APPLY_SCHEMA_VERSION,
  hydrateStoredApplicationPackage,
  mapLegacyApplicationPlanToPackage,
  mapPendingConfirmationToExternalSession,
  mapUserProfileToCandidateJobPreferences,
  toStoredApplicationPackage,
  validateApplicationAnswer,
  validateApplicationPackage,
  validateApplicationQueueItem,
  validateCandidateJobPreferences,
  validateExternalApplicationSession,
  type ApplicationAnswer,
  type ApplicationPackage,
  type ApplicationQueueItem,
  type CandidateJobPreferences,
  type ExternalApplicationSession,
} from '../../src/features/apply/domain';
import type { ApplicationPlan } from '../../src/services/applicationPlan';
import type { PendingApplicationConfirmation } from '../../src/services/applicationFlowState';
import type { UserProfile } from '../../src/types';

const now = Timestamp.fromMillis(1_000);

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'candidate-1',
  name: 'Pessoa Candidata',
  email: 'candidate@example.test',
  opportunityType: 'Internship',
  opportunityTypes: ['Internship', 'FirstJob'],
  area: 'Tech & Engenharia',
  areaId: 'technology_engineering',
  interests: [],
  skills: ['React'],
  course: '',
  university: '',
  preferredModes: ['Remoto', 'Híbrido'],
  preferredMinSalary: 1_800,
  preferredCity: 'Recife',
  preferredState: 'PE',
  cvExtracted: { desiredRoles: ['Pessoa desenvolvedora frontend'] },
  createdAt: Timestamp.fromMillis(0),
  ...overrides,
});

const source = {
  type: 'candidate_profile' as const,
  referenceId: 'skills',
  label: 'Competências aprovadas no perfil',
};

const answer = (overrides: Partial<ApplicationAnswer> = {}): ApplicationAnswer => ({
  id: 'answer-1',
  packageId: 'package-1',
  question: 'Por que você quer esta vaga?',
  answer: 'Quero aplicar meus conhecimentos de React em um time com acompanhamento.',
  sources: [source],
  confidence: 'high',
  generated: true,
  reused: false,
  reviewed: false,
  approved: false,
  sensitive: false,
  updatedAt: now,
  ...overrides,
});

const applicationPackage = (
  overrides: Partial<ApplicationPackage> = {},
): ApplicationPackage => ({
  id: 'package-1',
  jobId: 'job-1',
  candidateId: 'candidate-1',
  status: 'package_ready',
  matchScore: 82,
  jobSummary: {
    content: 'Estágio em desenvolvimento frontend.',
    sources: [{ type: 'job_description', referenceId: 'job-1', label: 'Descrição da vaga' }],
    confidence: 'high',
    generated: true,
    sensitive: false,
    reviewStatus: 'reviewed',
    updatedAt: now,
  },
  matchedRequirements: [],
  missingRequirements: [],
  risks: [],
  recommendedResumeId: 'resume-1',
  adaptedResume: null,
  pitch: null,
  coverLetter: null,
  answers: [answer()],
  pendingInformation: [],
  warnings: [],
  createdAt: now,
  updatedAt: now,
  generatorVersion: 'apply-generator-v1',
  confidence: 'high',
  revision: 1,
  approvedRevision: null,
  approvedAt: null,
  schemaVersion: HIRLY_APPLY_SCHEMA_VERSION,
  ...overrides,
});

const queueItem = (overrides: Partial<ApplicationQueueItem> = {}): ApplicationQueueItem => ({
  id: 'queue-1',
  packageId: 'package-1',
  jobId: 'job-1',
  candidateId: 'candidate-1',
  priority: 'high',
  priorityRank: 3,
  status: 'prepared',
  estimatedCompletionMinutes: 8,
  pendingCount: 0,
  candidateDecision: 'pending',
  rejectionReason: null,
  expiresAt: null,
  approvedAt: null,
  submittedAt: null,
  createdAt: now,
  updatedAt: now,
  schemaVersion: HIRLY_APPLY_SCHEMA_VERSION,
  ...overrides,
});

const session = (
  overrides: Partial<ExternalApplicationSession> = {},
): ExternalApplicationSession => ({
  id: 'session-1',
  candidateId: 'candidate-1',
  jobId: 'job-1',
  externalUrl: 'https://jobs.example.test/apply',
  packageId: 'package-1',
  resumeId: 'resume-1',
  resumeStoragePath: 'users/candidate-1/cv/resume.pdf',
  startedAt: now,
  completedAt: null,
  status: 'in_progress',
  copiedAnswers: [],
  pendingFields: [],
  userConfirmation: 'pending',
  errors: [],
  createdAt: now,
  updatedAt: now,
  schemaVersion: HIRLY_APPLY_SCHEMA_VERSION,
  ...overrides,
});

describe('CandidateJobPreferences', () => {
  test('mapeia o perfil legado sem alterar ou inventar preferências novas', () => {
    const mapped = mapUserProfileToCandidateJobPreferences(profile(), now);
    expect(mapped).toMatchObject({
      candidateId: 'candidate-1',
      targetRoles: ['Pessoa desenvolvedora frontend'],
      areaIds: ['technology_engineering'],
      workModeIds: ['remote', 'hybrid'],
      minimumSalary: 1_800,
      minimumMatchScore: 55,
      maximumDailyRecommendations: 5,
    });
    expect(mapped.preferredCompanies).toEqual([]);
    expect(mapped.blockedCompanies).toEqual([]);
    expect(mapped.hardRequirements).toEqual([]);
  });

  test('aceita contrato completo e normaliza listas duplicadas', () => {
    const input: CandidateJobPreferences = {
      ...mapUserProfileToCandidateJobPreferences(profile(), now),
      targetRoles: ['Frontend', 'Frontend'],
    };
    const result = validateCandidateJobPreferences(input, 'candidate-1');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.targetRoles).toEqual(['Frontend']);
  });

  test('rejeita outro proprietário, limites e empresa preferida também bloqueada', () => {
    const base = mapUserProfileToCandidateJobPreferences(profile(), now);
    const result = validateCandidateJobPreferences({
      ...base,
      candidateId: 'attacker',
      minimumMatchScore: 101,
      preferredCompanies: [{ name: 'Empresa', domain: 'empresa.test' }],
      blockedCompanies: [{ name: 'Empresa', domain: 'empresa.test' }],
      unexpected: true,
    }, 'candidate-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((item) => item.code)).toEqual(expect.arrayContaining([
        'unknown_field', 'invariant', 'out_of_range',
      ]));
    }
  });
});

describe('ApplicationAnswer e ApplicationPackage', () => {
  test('exige proveniência e revisão antes da aprovação de resposta', () => {
    const result = validateApplicationAnswer(answer({
      sources: [],
      approved: true,
      reviewed: false,
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((item) => item.path)).toEqual(expect.arrayContaining([
        'answer.sources', 'answer.approved',
      ]));
    }
  });

  test('valida pacote pronto e separa respostas para persistência parcial', () => {
    const current = applicationPackage();
    expect(validateApplicationPackage(current, 'candidate-1').success).toBe(true);

    const stored = toStoredApplicationPackage(current);
    expect(stored.package.answerIds).toEqual(['answer-1']);
    expect('answers' in stored.package).toBe(false);
    expect(hydrateStoredApplicationPackage(stored.package, stored.answers)).toEqual(current);
  });

  test('impede pacote aprovado com revisão divergente ou bloqueio', () => {
    const result = validateApplicationPackage(applicationPackage({
      status: 'package_approved',
      approvedRevision: 1,
      approvedAt: now,
      revision: 2,
      answers: [answer({ reviewed: true, approved: true })],
      pendingInformation: [{
        id: 'salary', label: 'Confirmar salário', reason: 'Dado sensível', sensitive: true, blocking: true,
      }],
    }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((item) => item.code === 'invariant')).toBe(true);
  });

  test('aceita pacote aprovado somente com revisão atual e conteúdo aprovado', () => {
    const current = applicationPackage();
    const result = validateApplicationPackage({
      ...current,
      status: 'package_approved',
      jobSummary: current.jobSummary ? { ...current.jobSummary, reviewStatus: 'approved' } : null,
      answers: [answer({ reviewed: true, approved: true })],
      approvedRevision: 1,
      approvedAt: now,
    });
    expect(result.success).toBe(true);
  });

  test('converte plano antigo sempre como pacote incompleto e não aprovado', () => {
    const legacyPlan: ApplicationPlan = {
      jobId: 'job-1',
      summary: 'Plano antigo',
      readinessScore: 100,
      steps: [{
        id: 'apply', type: 'apply', title: 'Aplicar', reason: 'Abrir site', estimatedMinutes: 1,
        priority: 'high', status: 'done', cta: 'Aplicar',
      }],
    };
    const mapped = mapLegacyApplicationPlanToPackage(legacyPlan, {
      packageId: 'package-1', candidateId: 'candidate-1', jobId: 'job-1', matchScore: 80, now,
    });
    expect(mapped.status).toBe('package_needs_information');
    expect(mapped.approvedAt).toBeNull();
    expect(mapped.pendingInformation.some((item) => item.blocking)).toBe(true);
    expect(mapped.warnings[0].code).toBe('legacy_application_plan');
  });
});

describe('ApplicationQueueItem', () => {
  test('mantém ranking determinístico e aceita item preparado', () => {
    expect(applicationQueuePriorityRank('urgent')).toBe(4);
    expect(validateApplicationQueueItem(queueItem(), 'candidate-1').success).toBe(true);
  });

  test('rejeita prioridade divergente e envio sem timestamp', () => {
    const result = validateApplicationQueueItem(queueItem({
      status: 'submitted',
      priorityRank: 1,
      submittedAt: null,
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((item) => item.path)).toEqual(expect.arrayContaining([
        'priorityRank', 'submittedAt',
      ]));
    }
  });
});

describe('ExternalApplicationSession', () => {
  test('valida URL e exige confirmação explícita para conclusão', () => {
    expect(validateExternalApplicationSession(session(), 'candidate-1').success).toBe(true);
    const invalid = validateExternalApplicationSession(session({
      externalUrl: 'https://user:password@jobs.example.test/apply',
      status: 'completed',
      completedAt: now,
      userConfirmation: 'pending',
    }));
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.issues.map((item) => item.path)).toEqual(expect.arrayContaining([
        'externalUrl', 'userConfirmation',
      ]));
    }
  });

  test('rejeita sessão assistida em HTTP por conter dados profissionais', () => {
    const result = validateExternalApplicationSession(session({
      externalUrl: 'http://jobs.example.test/apply',
    }), 'candidate-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((item) => item.path === 'externalUrl')).toBe(true);
  });

  test('rejeita caminho de currículo pertencente a outro usuário', () => {
    const result = validateExternalApplicationSession(session({
      resumeStoragePath: 'users/other-candidate/cv/resume.pdf',
    }), 'candidate-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((item) => item.path === 'resumeStoragePath')).toBe(true);
    }
  });

  test('converte confirmação pendente local sem presumir envio', () => {
    const pending: PendingApplicationConfirmation = {
      job: {
        jobId: 'job-1',
        title: 'Estágio',
        company: 'Empresa',
        location: 'Remoto',
        applyUrl: 'https://jobs.example.test/apply',
      },
      applicationSource: 'job_detail',
      openedAt: 500,
    };
    const mapped = mapPendingConfirmationToExternalSession(pending, {
      sessionId: 'session-1', candidateId: 'candidate-1', packageId: 'package-1', now,
    });
    expect(mapped.status).toBe('awaiting_confirmation');
    expect(mapped.userConfirmation).toBe('pending');
    expect(mapped.completedAt).toBeNull();
    expect(mapped.startedAt.toMillis()).toBe(500);
  });
});
