import { act, renderHook } from '@testing-library/react-native';
import { useFeedInteractions } from '../../src/hooks/useFeedInteractions';

type Snapshot = { docs: { id: string; data: () => Record<string, unknown> }[]; forEach: (visit: (doc: Snapshot['docs'][number]) => void) => void };
const mockListeners = new Map<string, (value: Snapshot) => void>();
const mockStops: jest.Mock[] = [];
let mockUid = 'candidate-a';

jest.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: mockUid } }) }));
jest.mock('../../src/services/firebase', () => ({ db: {} }));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  onSnapshot: (path: string, receive: (value: Snapshot) => void) => {
    mockListeners.set(path, receive);
    const stop = jest.fn();
    mockStops.push(stop);
    return stop;
  },
}));

const emit = (name: string, records: Record<string, Record<string, unknown>>, uid = mockUid) => {
  const docs = Object.entries(records).map(([id, data]) => ({ id, data: () => data }));
  act(() => mockListeners.get(`users/${uid}/${name}`)?.({ docs, forEach: (visit) => docs.forEach(visit) }));
};

beforeEach(() => { mockListeners.clear(); mockStops.length = 0; mockUid = 'candidate-a'; });

test('remover curtida e confirmação atualiza o feed sem reiniciar a sessão', () => {
  const { result } = renderHook(useFeedInteractions);
  emit('interactions', { vaga: { likedAt: {}, appliedAt: {} } });
  emit('likes', { vaga: {} });
  emit('applications', { vaga: {} });
  expect(result.current.loading).toBe(false);
  expect(result.current.likedIds.has('vaga')).toBe(true);
  expect(result.current.appliedIds.has('vaga')).toBe(true);

  emit('interactions', { vaga: { lastActionAt: {} } });
  emit('likes', {});
  emit('applications', {});
  expect(result.current.likedIds.has('vaga')).toBe(false);
  expect(result.current.appliedIds.has('vaga')).toBe(false);
});

test('snapshots tardios da conta anterior não reaparecem após trocar de conta', () => {
  const { result, rerender } = renderHook(useFeedInteractions);
  mockUid = 'candidate-b';
  rerender({});
  emit('interactions', {});
  emit('likes', {});
  emit('applications', {});
  emit('likes', { privada: {} }, 'candidate-a');
  expect(result.current.likedIds.size).toBe(0);
  expect(mockStops.slice(0, 3).every((stop) => stop.mock.calls.length === 1)).toBe(true);
});
