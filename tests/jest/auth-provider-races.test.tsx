import React, { useContext } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { AuthContext, AuthProvider } from '../../src/providers/AuthProvider';

const mockAuth: { currentUser: User | null } = { currentUser: null };
let mockAuthChanged: (user: User | null) => void;
const mockSnapshots = new Map<string, (snapshot: unknown) => void>();
const mockGetDoc = jest.fn();
jest.mock('../../src/services/firebase', () => ({ get auth() { return mockAuth; }, db: {} }));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: typeof mockAuthChanged) => { mockAuthChanged = listener; return jest.fn(); },
  reload: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  onSnapshot: (path: string, receive: (snapshot: unknown) => void) => { mockSnapshots.set(path, receive); return jest.fn(); },
}));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('../../src/utils/analytics', () => ({ identify: jest.fn(), reset: jest.fn(), setUserProperties: jest.fn(), track: jest.fn() }));

const signIn = (uid: string) => {
  const user = { uid, emailVerified: true } as User;
  act(() => { mockAuth.currentUser = user; mockAuthChanged(user); });
  act(() => mockSnapshots.get(`users/${uid}`)?.({ exists: () => true, data: () => ({ uid, name: uid }) }));
};
const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => { mockAuth.currentUser = null; mockSnapshots.clear(); mockGetDoc.mockReset(); });

test('atualizar o perfil mantém o estado inicial carregado para não desmontar o cadastro', async () => {
  const { result } = renderHook(() => useContext(AuthContext)!, { wrapper });
  signIn('a');
  let resolve!: (snapshot: unknown) => void;
  mockGetDoc.mockReturnValue(new Promise((done) => { resolve = done; }));
  let pending!: Promise<void>;
  await act(async () => { pending = result.current.refreshProfile(); await Promise.resolve(); });
  expect(result.current.profileLoading).toBe(false);
  expect(result.current.onboardingState).toBe('needs_onboarding');
  await act(async () => {
    resolve({ exists: () => true, data: () => ({ uid: 'a', name: 'Atualizado' }) });
    await pending;
  });
  expect(result.current.profile?.name).toBe('Atualizado');
});

test('erro tardio ao atualizar A não bloqueia nem substitui o perfil de B', async () => {
  const { result } = renderHook(() => useContext(AuthContext)!, { wrapper });
  signIn('a');
  let reject!: (error: Error) => void;
  mockGetDoc.mockReturnValue(new Promise((_done, fail) => { reject = fail; }));
  let pending!: Promise<void>;
  await act(async () => { pending = result.current.refreshProfile(); await Promise.resolve(); });
  signIn('b');
  await act(async () => { reject(new Error('read failed')); await pending; });
  expect(result.current.profile?.uid).toBe('b');
  expect(result.current.profileError).toBeNull();
});

test('falha de rede preserva perfil já carregado e avisa somente o chamador', async () => {
  const { result } = renderHook(() => useContext(AuthContext)!, { wrapper });
  signIn('a');
  mockGetDoc.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'unavailable' }));
  await act(async () => { await expect(result.current.refreshProfile()).rejects.toThrow('PROFILE_REFRESH_FAILED'); });
  expect(result.current.profile?.uid).toBe('a');
  expect(result.current.profileError).toBeNull();
  expect(result.current.profileLoading).toBe(false);
});

test('falha de permissão não é mascarada por um perfil já carregado', async () => {
  const { result } = renderHook(() => useContext(AuthContext)!, { wrapper });
  signIn('a');
  mockGetDoc.mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'permission-denied' }));
  await act(async () => { await expect(result.current.refreshProfile()).rejects.toThrow('PROFILE_REFRESH_FAILED'); });
  expect(result.current.profileError).not.toBeNull();
});
