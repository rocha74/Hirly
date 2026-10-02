import { buildReviewedCvProfilePatch } from '../../src/services/cvReview';
import type { ExtractedCV } from '../../src/services/cvParser';

const extracted: ExtractedCV = {
  name: 'Ana Lima',
  email: 'ana@example.test',
  phone: '+55 11 99999-0000',
  city: 'São Paulo',
  state: 'SP',
  course: 'Administração',
  university: 'Universidade Teste',
  area: 'Negócios & Vendas',
  skills: ['excel'],
  summary: 'Resumo privado',
  experiences: [{ company: 'Empresa', role: 'Estagiária' }],
  links: [{ type: 'linkedin', url: 'https://linkedin.com/in/teste' }],
  aiCanonical: {} as ExtractedCV['aiCanonical'],
  aiEvidence: {},
};

describe('revisão de dados extraídos do CV', () => {
  it('não persiste localização, contato ou artefatos brutos quando desmarcados', () => {
    const patch = buildReviewedCvProfilePatch(
      extracted,
      new Set(['location', 'email', 'phone', 'summary', 'experiences', 'links']),
      123,
    );
    expect(patch).not.toHaveProperty('preferredCity');
    expect(patch).not.toHaveProperty('preferredState');
    expect(patch).not.toHaveProperty('email');
    expect(patch).not.toHaveProperty('cvCanonical');
    expect(patch).not.toHaveProperty('cvEvidence');
    expect(patch.cvExtracted).toEqual({ appliedAt: 123 });
  });

  it('mantém o e-mail do login separado do contato selecionado no currículo', () => {
    const patch = buildReviewedCvProfilePatch(extracted, new Set(), 456);
    expect(patch).not.toHaveProperty('email');
    expect(patch.cvExtracted).toMatchObject({
      email: 'ana@example.test',
      phone: '+55 11 99999-0000',
      appliedAt: 456,
    });
  });
});
