import { Timestamp } from 'firebase/firestore';
import {
  GenericFormAdapter,
  externalDestinationLabel,
  selectExternalApplicationAdapter,
} from '../../src/features/apply/external';
import {
  validateExternalApplicationSession,
  type ExternalApplicationSession,
} from '../../src/features/apply/domain';

const now = Timestamp.fromMillis(1_800_000_000_000);
const session: ExternalApplicationSession = {
  id: 'job-1:1', candidateId: 'alice', jobId: 'job-1',
  externalUrl: 'https://boards.greenhouse.io/acme/jobs/1', packageId: 'job-1',
  resumeId: 'resume-1', startedAt: now, completedAt: null, status: 'created',
  copiedAnswers: [], pendingFields: [], userConfirmation: 'pending', errors: [],
  adapterId: 'generic_form', adapterMode: 'manual_assist',
  preparedFields: [{
    id: 'email', label: 'E-mail', value: 'candidate@example.com',
    source: 'candidate_profile', sensitive: true, confirmed: true,
  }],
  completedFieldIds: [],
  checklist: [{ id: 'open_external_site', label: 'Abrir site', completed: false, required: true }],
  failureReason: null,
  failureDetail: null,
  jobSnapshot: {
    title: 'Estágio', company: 'Acme', location: 'Remoto',
    applyUrl: 'https://boards.greenhouse.io/acme/jobs/1',
  },
  packageRevision: 1,
  lastOpenedAt: null,
  createdAt: now, updatedAt: now, schemaVersion: '2026-07-31',
};

describe('ExternalApplicationAdapter', () => {
  it('mostra claramente o domínio de destino', () => {
    expect(externalDestinationLabel('https://www.jobs.example.com/vaga/1')).toBe('jobs.example.com');
    expect(externalDestinationLabel('url inválida')).toBe('site da empresa');
  });

  it('valida a sessão persistida com os campos novos', () => {
    expect(validateExternalApplicationSession(session, 'alice').success).toBe(true);
  });

  it('usa fallback genérico inclusive para ATS ainda sem integração', () => {
    const adapter = selectExternalApplicationAdapter(session.externalUrl);
    expect(adapter).toBeInstanceOf(GenericFormAdapter);
    expect(adapter.id).toBe('generic_form');
  });

  it('não promete autofill, CAPTCHA ou envio final', () => {
    const plan = new GenericFormAdapter().createPlan(session);
    expect(plan.mode).toBe('manual_assist');
    expect(plan.canAutofill).toBe(false);
    expect(plan.fields).toEqual(session.preparedFields);
    expect(plan.fallbackMessage).toContain('prontos para copiar');
  });

  it('rejeita URL externa insegura antes de escolher estratégia', () => {
    expect(() => selectExternalApplicationAdapter('not-a-url')).toThrow();
    expect(() => selectExternalApplicationAdapter('javascript:alert(1)')).toThrow();
  });
});
