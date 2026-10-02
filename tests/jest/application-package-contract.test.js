const { generateApplicationPackage } = require('../../functions/shared/applicationPackage');
const { validateApplicationPackage } = require('../../src/features/apply/domain/validation');

describe('application package persistence contract', () => {
  test('backend generator produces a package accepted by the strict client validator', async () => {
    const now = 1_785_499_200_000;
    const applicationPackage = await generateApplicationPackage({
      packageId: 'job-1',
      candidateId: 'candidate-1',
      job: {
        id: 'job-1', title: 'Estágio Frontend', company: 'Acme', location: 'Remoto',
        type: 'Remoto', contractType: 'Estágio', salary: 'R$ 2.000', salaryDisclosed: true,
        requiredSkills: ['React', 'AWS'], differentials: ['TypeScript'],
      },
      profile: {
        uid: 'candidate-1', course: 'Sistemas de Informação', university: 'Universidade',
        skills: ['React'], cv: { storagePath: 'users/candidate-1/cv/resume.pdf', uploadedAt: 100 },
        cvCanonical: {
          skills: { value: ['React'], confidence: 'high' },
          experiences: { value: [], confidence: 'high' },
          education: { value: [], confidence: 'high' },
        },
      },
      professionalFacts: [], approvedAnswers: [], matchScore: 80, nowTimestamp: now,
    });

    const validation = validateApplicationPackage(applicationPackage, 'candidate-1');
    expect(validation).toEqual(expect.objectContaining({ success: true }));
  });
});
