const { validateAiRequest } = require('../../functions/ai/validation');
const { reserveQuota, releaseQuota } = require('../../functions/ai/quota');
const { buildProviderBody, parseProviderResponse } = require('../../functions/ai/features');
const {
  auditJob,
  prepareImportedJob,
} = require('../../functions/shared/jobPipeline');

const sampleJob = {
  id: 'job-1', title: 'Estágio Dev', company: 'Empresa', type: 'Remoto',
  contractType: 'Estágio', location: 'Brasil', area: 'Tecnologia',
  description: 'React', salary: '', skills: ['React'], requiredSkills: ['TypeScript'],
  differentials: [], benefits: [],
};

const fakeFirestore = () => {
  const docs = new Map();
  return {
    doc: (path) => ({ path }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
      set: (ref, data, options) => docs.set(
        ref.path,
        options?.merge ? { ...(docs.get(ref.path) || {}), ...data } : data,
      ),
    }),
  };
};

describe('AI validators and atomic quotas', () => {
  test('rejects arbitrary model and oversized provider controls', () => {
    const request = {
      feature: 'job_summary',
      payload: { job: sampleJob, regenerate: false },
      schemaVersion: '1',
    };
    expect(validateAiRequest(request).feature).toBe('job_summary');
    expect(() => validateAiRequest({ ...request, model: 'arbitrary' })).toThrow();
    expect(() => validateAiRequest({
      ...request,
      payload: { ...request.payload, max_tokens: 999999 },
    })).toThrow();
  });

  test('blocks concurrent use and allows a new reservation after release', async () => {
    const firestore = fakeFirestore();
    let now = 1_000_000;
    const args = {
      firestore, uid: 'alice', feature: 'job_summary', payload: { regenerate: false },
      quota: { minute: 3, day: 10, regenerations: 1 }, now: () => now,
    };
    const reservation = await reserveQuota(args);
    await expect(reserveQuota({ ...args, payload: { regenerate: true } })).rejects.toThrow();
    await releaseQuota({ firestore, reservation, now: () => now });
    now += 9_000;
    await expect(reserveQuota({ ...args, payload: { regenerate: true } })).resolves.toBeDefined();
  });

  test('keeps interests separate from declared skills in match prompts', () => {
    const body = buildProviderBody('match_explanation', {
      job: sampleJob,
      profile: {
        course: '', university: '', area: '', opportunityType: '',
        preferredCity: '', preferredLocation: '', preferredModes: [],
        skills: ['Excel'], interests: ['Música'], cvUploaded: false,
      },
      regenerate: false,
    });
    const prompt = body.messages[0].content;
    expect(prompt).toContain('Skills declaradas: Excel');
    expect(prompt).toContain('Interesses: Música');
    expect(prompt).not.toContain('Skills: Excel, Música');
  });

  test('sanitizes nested CV response objects and rejects unsafe links', () => {
    const result = parseProviderResponse('cv_parse', {
      content: [{
        type: 'tool_use',
        name: 'extract_cv',
        input: {
          area: 'Área inventada',
          semester: 99,
          experiences: [
            { company: 'Empresa', role: 'Estagiária', description: 'x'.repeat(900), secret: 'drop' },
            { company: '', role: 'Inválido' },
          ],
          links: [
            { type: 'linkedin', url: 'https://linkedin.com/in/teste', secret: 'drop' },
            { type: 'other', url: 'javascript:alert(1)' },
          ],
        },
      }],
    });
    expect(result).not.toHaveProperty('area');
    expect(result).not.toHaveProperty('semester');
    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0]).not.toHaveProperty('secret');
    expect(result.experiences[0].description).toHaveLength(600);
    expect(result.links).toEqual([{ type: 'linkedin', url: 'https://linkedin.com/in/teste' }]);
  });
});

describe('job sanitization and legacy import', () => {
  test('keeps invalid jobs inactive and does not invent absent fields', () => {
    const prepared = prepareImportedJob({
      title: 'Vaga',
      applyUrl: 'javascript:alert(1)',
    });
    expect(prepared.status).toBe('draft');
    expect(prepared.isActive).toBe(false);
    expect(prepared).not.toHaveProperty('salaryMin');
    expect(prepared).not.toHaveProperty('company');
    expect(auditJob(prepared).issues.some((issue) => issue.code === 'invalid_apply_url')).toBe(true);
  });
});
