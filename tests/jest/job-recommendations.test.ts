import { Timestamp } from 'firebase/firestore';
import {
  generateDailyRecommendations,
  removeDuplicateRecommendationJobs,
} from '../../src/features/discovery/domain';
import { mapUserProfileToCandidateJobPreferences } from '../../src/features/apply/domain';
import type { CandidateJobPreferences } from '../../src/features/apply/domain';
import type { Job, UserProfile } from '../../src/types';

const NOW = Date.UTC(2026, 6, 31, 12);
const timestamp = (value: number) => Timestamp.fromMillis(value);

const profile = (patch: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'candidate-1',
  name: 'Ana',
  email: 'ana@example.com',
  opportunityType: 'Internship',
  opportunityTypes: ['Internship'],
  area: 'Tech & Engenharia',
  areaId: 'technology_engineering',
  interests: ['Desenvolvimento'],
  skills: ['React', 'JavaScript', 'Git'],
  course: 'Sistemas de Informação',
  university: 'Universidade',
  preferredModes: ['Remoto'],
  preferredModeIds: ['remote'],
  preferredLocation: 'Remoto',
  preferredLocationId: 'remote',
  preferredMinSalary: 1500,
  onboardingCompleted: true,
  createdAt: timestamp(NOW - 100 * 86_400_000),
  ...patch,
});

const job = (id: string, patch: Partial<Job> = {}): Job => ({
  id,
  title: 'Estágio em Desenvolvimento Frontend',
  company: `Empresa ${id}`,
  applyUrl: `https://jobs.example.com/${id}`,
  sourceUrl: `https://jobs.example.com/${id}`,
  location: 'Remoto',
  type: 'Remoto',
  workMode: 'Remoto',
  workModeId: 'remote',
  contractType: 'Estágio',
  contractTypeId: 'internship',
  salary: 'R$ 2.000 - R$ 2.500',
  salaryMin: 2000,
  salaryMax: 2500,
  salaryDisclosed: true,
  description: 'Atuação em produto digital com React, JavaScript, testes e colaboração com o time.',
  skills: ['React', 'JavaScript'],
  requiredSkills: ['React', 'Git'],
  differentials: ['TypeScript'],
  benefits: ['Vale refeição'],
  area: 'Tech & Engenharia',
  areaId: 'technology_engineering',
  gradientColors: ['#000000', '#ffffff'],
  status: 'live',
  isActive: true,
  verificationStatus: 'verified',
  curationStatus: 'approved',
  qualityScore: 95,
  lastVerifiedAt: timestamp(NOW - 86_400_000),
  createdAt: timestamp(NOW - 2 * 86_400_000),
  expiresAt: timestamp(NOW + 10 * 86_400_000),
  ...patch,
});

const preferences = (
  candidateProfile = profile(),
  patch: Partial<CandidateJobPreferences> = {},
): CandidateJobPreferences => ({
  ...mapUserProfileToCandidateJobPreferences(candidateProfile, timestamp(NOW)),
  targetRoles: ['Desenvolvedor Frontend'],
  minimumMatchScore: 50,
  maximumDailyRecommendations: 5,
  ...patch,
});

const generate = (
  jobs: Job[],
  options: Partial<Parameters<typeof generateDailyRecommendations>[0]> = {},
) => generateDailyRecommendations({
  candidateId: 'candidate-1',
  date: '2026-07-31',
  jobs,
  profile: profile(),
  preferences: preferences(),
  now: NOW,
  ...options,
});

describe('descoberta e triagem diária', () => {
  test('remove duplicatas por URL normalizada e conteúdo estável', async () => {
    const original = job('original', {
      applyUrl: 'https://jobs.example.com/apply?utm_source=hirly',
      sourceUrl: 'https://jobs.example.com/opening/123?utm_campaign=x',
      qualityScore: 90,
    });
    const duplicate = job('duplicate', {
      applyUrl: 'https://jobs.example.com/apply',
      sourceUrl: 'https://jobs.example.com/opening/123',
      qualityScore: 95,
    });
    const deduplicated = removeDuplicateRecommendationJobs([original, duplicate]);
    expect(deduplicated.removed).toBe(1);
    expect(deduplicated.jobs.map((item) => item.id)).toEqual(['duplicate']);

    const result = await generate([original, duplicate]);
    expect(result.diagnostics.filteredCounts.duplicate).toBe(1);
    expect(result.recommendations).toHaveLength(1);
  });

  test('elimina vaga incompatível com requisito eliminatório', async () => {
    const result = await generate([job('onsite', { type: 'Presencial', workMode: 'Presencial', workModeId: 'onsite' })], {
      preferences: preferences(profile(), {
        hardRequirements: [{
          id: 'remote-only',
          type: 'work_mode',
          label: 'Somente remoto',
          acceptedValues: ['remote'],
          enabled: true,
        }],
      }),
    });
    expect(result.recommendations).toHaveLength(0);
    expect(result.diagnostics.filteredCounts.eliminatory_requirement).toBe(1);
  });

  test('remove vagas expiradas mesmo que ainda estejam marcadas como ativas', async () => {
    const result = await generate([job('expired', { expiresAt: timestamp(NOW - 1) })]);
    expect(result.recommendations).toHaveLength(0);
    expect(result.diagnostics.filteredCounts.expired_or_unavailable).toBe(1);
  });

  test('remove empresas bloqueadas por nome ou domínio', async () => {
    const blocked = job('blocked', { company: 'Empresa Bloqueada', companyDomain: 'blocked.example' });
    const result = await generate([blocked], {
      preferences: preferences(profile(), {
        blockedCompanies: [{ name: 'Empresa Bloqueada', domain: 'blocked.example' }],
      }),
    });
    expect(result.recommendations).toHaveLength(0);
    expect(result.diagnostics.filteredCounts.blocked_company).toBe(1);
  });

  test('respeita score mínimo e não preenche a fila com baixa compatibilidade', async () => {
    const unrelated = job('unrelated', {
      title: 'Assistente Jurídico',
      area: 'Jurídico',
      areaId: 'legal_compliance',
      type: 'Presencial',
      workMode: 'Presencial',
      workModeId: 'onsite',
      contractType: 'CLT',
      contractTypeId: 'employment',
      skills: ['Direito'],
      requiredSkills: ['OAB'],
      location: 'Manaus, AM',
    });
    const result = await generate([unrelated], {
      preferences: preferences(profile(), { minimumMatchScore: 80 }),
    });
    expect(result.recommendations).toHaveLength(0);
    expect(result.diagnostics.filteredCounts.below_minimum_score).toBe(1);
  });

  test('funciona com preferências incompletas usando os dados disponíveis', async () => {
    const result = await generate([job('fallback')], {
      preferences: preferences(profile(), {
        targetRoles: [], areaIds: [], workModeIds: [], locationIds: [],
        contractTypeIds: [], minimumMatchScore: 0, maximumDailyRecommendations: 3,
      }),
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.diagnostics.incompletePreferenceFields).toEqual(
      expect.arrayContaining(['targetRoles', 'areaIds', 'workModeIds', 'locationIds']),
    );
  });

  test('falha da IA preserva score, ordem e explicação determinística', async () => {
    const result = await generate([job('ai-fallback')], {
      explanationProvider: async () => { throw new Error('AI_OFFLINE'); },
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].explanationSource).toBe('ai_fallback');
    expect(result.recommendations[0].reason).toBeTruthy();
    expect(result.diagnostics.aiFallbackCount).toBe(1);
  });

  test('retorna resultado vazio e observável quando não há vagas', async () => {
    const result = await generate([]);
    expect(result.recommendations).toEqual([]);
    expect(result.diagnostics).toMatchObject({
      sourceJobCount: 0,
      evaluatedJobCount: 0,
      selectedJobCount: 0,
    });
  });

  test('limita a fila e mantém resultado idêntico para a mesma entrada', async () => {
    const jobs = [job('one'), job('two'), job('three')];
    const customPreferences = preferences(profile(), { maximumDailyRecommendations: 2 });
    const first = await generate(jobs, { preferences: customPreferences });
    const second = await generate(jobs, { preferences: customPreferences });
    expect(first.recommendations).toHaveLength(2);
    expect(second).toEqual(first);
  });

  test('exclui vagas já recusadas e já candidatas', async () => {
    const result = await generate([job('rejected'), job('applied')], {
      rejectedJobIds: new Set(['rejected']),
      appliedJobIds: new Set(['applied']),
    });
    expect(result.recommendations).toHaveLength(0);
    expect(result.diagnostics.filteredCounts.already_rejected).toBe(1);
    expect(result.diagnostics.filteredCounts.already_applied).toBe(1);
  });
});
