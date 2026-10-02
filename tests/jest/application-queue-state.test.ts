import { Timestamp } from 'firebase/firestore';
import {
  optimisticallyDeferQueueItem,
  queueLoadFailed,
  queueLoadSucceeded,
  restoreQueueItem,
  type ApplicationQueueItem,
  type ApplicationQueueLoadState,
} from '../../src/features/apply/domain';

const NOW = Timestamp.fromMillis(1_800_000_000_000);
const item = (overrides: Partial<ApplicationQueueItem> = {}): ApplicationQueueItem => ({
  id: 'job-1', packageId: 'job-1', jobId: 'job-1', candidateId: 'alice',
  priority: 'high', priorityRank: 3, status: 'prepared', estimatedCompletionMinutes: 7,
  pendingCount: 0, candidateDecision: 'pending', rejectionReason: null,
  expiresAt: Timestamp.fromMillis(NOW.toMillis() + 86_400_000), approvedAt: null,
  submittedAt: null, createdAt: NOW, updatedAt: NOW, schemaVersion: '2026-07-31',
  ...overrides,
});

const state = (overrides: Partial<ApplicationQueueLoadState> = {}): ApplicationQueueLoadState => ({
  items: [item()], loading: false, offline: false, error: null, ...overrides,
});

describe('application queue offline state', () => {
  it('preserva a última fila válida quando o usuário fica offline', () => {
    const next = queueLoadFailed(state(), 'Sem conexão');
    expect(next.items).toHaveLength(1);
    expect(next.offline).toBe(true);
    expect(next.error).toBe('Sem conexão');
  });

  it('identifica leitura do cache sem descartar os itens', () => {
    const next = queueLoadSucceeded(state({ loading: true }), [item()], true);
    expect(next.offline).toBe(true);
    expect(next.items[0].jobId).toBe('job-1');
  });

  it('desfaz atualização otimista quando a sincronização falha', () => {
    const previous = item();
    const optimistic = optimisticallyDeferQueueItem([previous], 'job-1', NOW);
    expect(optimistic[0].status).toBe('deferred');
    expect(restoreQueueItem(optimistic, previous)[0].status).toBe('prepared');
  });
});
