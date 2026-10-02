const buildExpoConfig = require('../../app.config');
const baseConfig = require('../../app.json').expo;

const FIREBASE_ENV = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'public-test-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'hirly-staging.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'hirly-staging-test',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'hirly-staging-test.firebasestorage.app',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:staging',
};

const MANAGED_ENV_KEYS = ['EXPO_PUBLIC_APP_ENV', ...Object.keys(FIREBASE_ENV)];
const originalEnvironment = Object.fromEntries(
  MANAGED_ENV_KEYS.map((key) => [key, process.env[key]]),
);

const restoreEnvironment = () => {
  MANAGED_ENV_KEYS.forEach((key) => {
    const originalValue = originalEnvironment[key];
    if (originalValue === undefined) delete process.env[key];
    else process.env[key] = originalValue;
  });
};

describe('Expo build environment isolation', () => {
  beforeEach(() => MANAGED_ENV_KEYS.forEach((key) => { delete process.env[key]; }));
  afterAll(restoreEnvironment);

  test('uses isolated native identifiers in development', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    const config = buildExpoConfig({ config: baseConfig });

    expect(config.name).toBe('Hirly Dev');
    expect(config.scheme).toBe('hirly-dev');
    expect(config.ios.bundleIdentifier).toBe('com.hirly.app.dev');
    expect(config.android.package).toBe('com.hirly.app.dev');
    expect(config.ios.associatedDomains).toEqual([]);
    expect(config.android.intentFilters).toEqual([]);
    expect(config.newArchEnabled).toBe(true);
  });

  test('blocks staging without a complete Firebase project', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    expect(() => buildExpoConfig({ config: baseConfig })).toThrow(
      'FIREBASE_PUBLIC_CONFIG_REQUIRED',
    );
  });

  test('blocks staging pointed at the development Firebase project', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    Object.assign(process.env, FIREBASE_ENV, {
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'job-swipe-o678qx',
    });
    expect(() => buildExpoConfig({ config: baseConfig })).toThrow(
      'NON_DEVELOPMENT_BUILD_USES_DEVELOPMENT_FIREBASE',
    );
  });

  test('accepts an isolated staging project', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    Object.assign(process.env, FIREBASE_ENV);
    const config = buildExpoConfig({ config: baseConfig });

    expect(config.name).toBe('Hirly Staging');
    expect(config.scheme).toBe('hirly-staging');
    expect(config.ios.bundleIdentifier).toBe('com.hirly.app.staging');
    expect(config.android.package).toBe('com.hirly.app.staging');
    expect(config.ios.associatedDomains).toEqual([]);
    expect(config.android.intentFilters).toEqual([]);
  });

  test('reserves public job links for production', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    Object.assign(process.env, FIREBASE_ENV);
    const config = buildExpoConfig({ config: baseConfig });
    expect(config.ios.associatedDomains).toEqual(baseConfig.ios.associatedDomains);
    expect(config.android.intentFilters).toEqual(baseConfig.android.intentFilters);
  });

  test.each(['constructor', 'toString', '__proto__'])('rejects invalid environment %s', (value) => {
    process.env.EXPO_PUBLIC_APP_ENV = value;
    expect(() => buildExpoConfig({ config: baseConfig })).toThrow('INVALID_HIRLY_ENVIRONMENT');
  });
});
