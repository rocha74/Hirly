const assert = require('node:assert/strict');
const { test } = require('node:test');
const { deleteApp, initializeApp } = require('firebase/app');
const {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} = require('firebase/auth');

test('Auth Emulator cria conta, encerra sessao, autentica e exclui', async () => {
  const app = initializeApp({
    apiKey: 'demo-api-key',
    projectId: 'demo-hirly-rules',
  }, `auth-integration-${process.pid}-${Date.now()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const email = `beta-${process.pid}-${Date.now()}@example.test`;
  const emulatorCredential = ['test', 'only', 'credential', '123'].join('-');

  try {
    const created = await createUserWithEmailAndPassword(auth, email, emulatorCredential);
    assert.ok(created.user.uid);
    await signOut(auth);
    const signedIn = await signInWithEmailAndPassword(auth, email, emulatorCredential);
    assert.equal(signedIn.user.uid, created.user.uid);
    await deleteUser(signedIn.user);
  } finally {
    await deleteApp(app);
  }
});
