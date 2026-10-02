const BUILD_VARIANTS = {
  development: {
    name: 'Hirly Dev',
    scheme: 'hirly-dev',
    iosBundleIdentifier: 'com.hirly.app.dev',
    androidPackage: 'com.hirly.app.dev',
  },
  staging: {
    name: 'Hirly Staging',
    scheme: 'hirly-staging',
    iosBundleIdentifier: 'com.hirly.app.staging',
    androidPackage: 'com.hirly.app.staging',
  },
  production: {
    name: 'Hirly',
    scheme: 'hirly',
    iosBundleIdentifier: 'com.hirly.app',
    androidPackage: 'com.hirly.app',
  },
};

const FIREBASE_PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const DEVELOPMENT_FIREBASE_PROJECT_ID = 'job-swipe-o678qx';

module.exports = ({ config }) => {
  const environment = process.env.EXPO_PUBLIC_APP_ENV?.trim() || 'development';
  if (!Object.hasOwn(BUILD_VARIANTS, environment)) throw new Error('INVALID_HIRLY_ENVIRONMENT');
  const variant = BUILD_VARIANTS[environment];

  if (environment !== 'development') {
    const missingFirebaseKeys = FIREBASE_PUBLIC_ENV_KEYS.filter(
      (key) => !process.env[key]?.trim(),
    );
    if (missingFirebaseKeys.length > 0) {
      throw new Error(`FIREBASE_PUBLIC_CONFIG_REQUIRED:${missingFirebaseKeys.join(',')}`);
    }
    if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID.trim() === DEVELOPMENT_FIREBASE_PROJECT_ID) {
      throw new Error('NON_DEVELOPMENT_BUILD_USES_DEVELOPMENT_FIREBASE');
    }
  }

  return {
    ...config,
    name: variant.name,
    scheme: variant.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: variant.iosBundleIdentifier,
      associatedDomains: environment === 'production' ? config.ios?.associatedDomains : [],
    },
    android: {
      ...config.android,
      package: variant.androidPackage,
      intentFilters: environment === 'production' ? config.android?.intentFilters : [],
    },
    extra: {
      ...config.extra,
      hirlyEnvironment: environment,
    },
  };
};
