import { Timestamp } from 'firebase/firestore';
import {
  createCompetitivenessAnalysis,
  createDailyPicks,
  createSalaryInsight,
  localDateKey,
} from '../../src/utils/careerInsights';
import type { Job, UserProfile } from '../../src/types';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'user-1',
  name: 'Pessoa Teste',
  email: 'candidate@example.test',
  opportunityType: 'Internship',
  opportunityTypes: ['Internship'],
  area: 'Tech & Engenharia',
  interests: [],
  skills: ['React', 'Excel'],
  course: '',
  university: '',
  preferredModes: ['Remoto'],
  createdAt: Timestamp.fromMillis(0),
  ...overrides,
});

const job = (id: string, overrides: Partial<Job> = {}): Job => ({
  id,
  title: 'Estágio em Produto',
  company: `Empresa ${id}`,
  applyUrl: `https://example.test/jobs/${id}`,
  location: 'Remoto',
  type: 'Remoto',
  contractType: 'Estágio',
  salary: 'Não informado',
  description: 'Vaga de entrada com acompanhamento.',
  skills: ['React'],
  requiredSkills: ['React'],
  differentials: [],
  benefits: [],
  area: 'Tech & Engenharia',
  gradientColors: ['#7482FF', '#AC7CFF'],
  createdAt: Timestamp.fromMillis(0),
  isActive: true,
  status: 'live',
  ...overrides,
});

describe('career insights determinísticos', () => {
  it('usa o dia do calendário local para a seleção diária', () => {
    const localNight = new Date(2026, 6, 14, 23, 30, 0);
    expect(localDateKey(localNight)).toBe('2026-07-14');
  });

  it('não inventa faixa quando nenhuma vaga divulga salário', () => {
    const result = createSalaryInsight(profile(), [job('a')], 100);
    expect(result.sampleSize).toBe(0);
    expect(result.suggestedMin).toBe(0);
    expect(result.suggestedMax).toBe(0);
    expect(result.cachedAt).toBe(100);
  });

  it('calcula referência salarial somente a partir da amostra disponível', () => {
    const jobs = [
      job('a', { salary: 'R$ 1.000', salaryDisclosed: true }),
      job('b', { salary: 'R$ 1.500', salaryDisclosed: true }),
      job('c', { salary: 'R$ 2.000', salaryDisclosed: true }),
    ];
    const result = createSalaryInsight(profile({ preferredMinSalary: 1300 }), jobs, 200);
    expect(result).toMatchObject({
      marketMin: 1000,
      marketMedian: 1500,
      marketMax: 2000,
      sampleSize: 3,
      suggestedMin: 1300,
    });
    expect(result.suggestedMax).toBeGreaterThanOrEqual(result.suggestedMin);
  });

  it('ordena o Pra Hoje por match, ignora inativas e limita a cinco vagas', () => {
    const jobs = [
      job('best'),
      job('inactive', { isActive: false }),
      job('weak', { area: 'Finanças & Contabilidade', skills: [], requiredSkills: ['Contabilidade'] }),
      job('2'), job('3'), job('4'), job('5'), job('6'),
    ];
    const first = createDailyPicks(profile(), jobs, '2026-07-15', 300);
    const second = createDailyPicks(profile(), jobs, '2026-07-15', 300);
    expect(first.picks).toHaveLength(5);
    expect(first.picks.map((pick) => pick.jobId)).not.toContain('inactive');
    expect(second).toEqual(first);
  });

  it('gera análise competitiva reproduzível sem IA', () => {
    const target = job('target');
    const first = createCompetitivenessAnalysis(target, profile(), 400);
    const second = createCompetitivenessAnalysis(target, profile(), 400);
    expect(first).toEqual(second);
    expect(['strong', 'borderline', 'weak']).toContain(first.verdict);
    expect(first.headline).toContain('Compatibilidade');
  });
});
