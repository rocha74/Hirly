import {
  DEVELOPMENT_FIREBASE_PROJECT_ID,
  resolveHirlyEnvironmentName,
  resolveHirlyRuntimeEnvironment,
} from '../../src/config/runtimeEnvironment';

const stagingConfig = {
  firebaseApiKey: 'public-staging-key',
  firebaseAuthDomain: 'hirly-staging.firebaseapp.com',
  firebaseProjectId: 'hirly-staging',
  firebaseStorageBucket: 'hirly-staging.firebasestorage.app',
  firebaseMessagingSenderId: '123456789',
  firebaseAppId: '1:123456789:web:staging',
};

describe('runtime environment isolation', () => {
  test('defaults only development builds to the existing development project', () => {
    expect(resolveHirlyRuntimeEnvironment({}, true)).toEqual(expect.objectContaining({
      name: 'development',
      firebase: expect.objectContaining({ projectId: DEVELOPMENT_FIREBASE_PROJECT_ID }),
    }));
    expect(resolveHirlyEnvironmentName(undefined, false)).toBe('production');
  });

  test('requires a complete Firebase config outside development', () => {
    expect(() => resolveHirlyRuntimeEnvironment({ appEnvironment: 'staging' }, false))
      .toThrow('FIREBASE_PUBLIC_CONFIG_REQUIRED');
    expect(() => resolveHirlyRuntimeEnvironment({
      appEnvironment: 'staging',
      firebaseProjectId: 'hirly-staging',
    }, false)).toThrow('INCOMPLETE_FIREBASE_PUBLIC_CONFIG');
  });

  test('rejects development Firebase in staging or production', () => {
    expect(() => resolveHirlyRuntimeEnvironment({
      appEnvironment: 'production',
      ...stagingConfig,
      firebaseProjectId: DEVELOPMENT_FIREBASE_PROJECT_ID,
    }, false)).toThrow('NON_DEVELOPMENT_BUILD_USES_DEVELOPMENT_FIREBASE');
  });

  test('accepts an isolated and complete staging project', () => {
    expect(resolveHirlyRuntimeEnvironment({
      appEnvironment: 'staging',
      ...stagingConfig,
    }, false)).toEqual({
      name: 'staging',
      appScheme: 'hirly-staging',
      firebase: {
        apiKey: stagingConfig.firebaseApiKey,
        authDomain: stagingConfig.firebaseAuthDomain,
        projectId: stagingConfig.firebaseProjectId,
        storageBucket: stagingConfig.firebaseStorageBucket,
        messagingSenderId: stagingConfig.firebaseMessagingSenderId,
        appId: stagingConfig.firebaseAppId,
      },
    });
  });
});
