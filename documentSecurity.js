'use strict';
const { createHash, randomUUID } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { assertActive, accountFirestore, withActiveAccount } = require('./shared/accountLifecycle');
const { validatePdf, MAX_PDF_BYTES } = require('./shared/pdfValidation');

const sourcePath = (uid, path) => {
  if (typeof path !== 'string' || !(path === `users/${uid}/cv.pdf`
    || new RegExp(`^users/${uid}/(cv|attachments)/[A-Za-z0-9-]+\\.pdf$`).test(path))) {
    throw new HttpsError('permission-denied', 'DOCUMENT_PATH_INVALID');
  }
  return path;
};
const exactDocument = async (bucket, path) => {
  const [metadata] = await bucket.file(path).getMetadata();
  if (metadata.contentType !== 'application/pdf' || !/^\d+$/.test(metadata.generation)
    || Number(metadata.size) <= 0 || Number(metadata.size) > MAX_PDF_BYTES) {
    throw new HttpsError('invalid-argument', 'PDF_SIZE_INVALID');
  }
  const file = bucket.file(path, { generation: metadata.generation });
  const [bytes] = await file.download({ validation: 'crc32c' });
  if (bytes.length !== Number(metadata.size)) throw new HttpsError('invalid-argument', 'DOCUMENT_CHANGED');
  return { bytes, generation: metadata.generation, file };
};
const createValidateUploadedDocumentHandler = withActiveAccount(({ firestore, bucket }) => async (request) => {
  const path = sourcePath(request.auth.uid, request.data?.storagePath);
  const document = await exactDocument(bucket, path);
  const result = await validatePdf(document.bytes);
  const key = createHash('sha256').update(path + ':' + document.generation).digest('hex');
  await firestore.doc(`users/${request.auth.uid}/documentValidations/${key}`).set({
    ...result, storagePath: path, storageGeneration: document.generation,
    validatedAtMs: Date.now(), scanStatus: 'pending',
  });
  return { valid: true, ...result, storageGeneration: document.generation };
});

// Called by trusted backend only. No client-provided scan flags are accepted.
const createDocumentSnapshot = async ({ firestore, bucket, uid, path, kind = 'resume',
  fileName, scanner, retentionDays, now = Date.now }) => {
  await assertActive(firestore, uid);
  sourcePath(uid, path);
  if (!['resume', 'transcript', 'portfolio', 'certificate', 'cover_letter'].includes(kind)
    || typeof fileName !== 'string' || !/^[^\\/\x00-\x1f<>]{1,115}\.pdf$/i.test(fileName)) {
    throw new HttpsError('invalid-argument', 'DOCUMENT_METADATA_INVALID');
  }
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 90) {
    throw new HttpsError('failed-precondition', 'DOCUMENT_RETENTION_REQUIRED');
  }
  if (typeof scanner !== 'function') throw new HttpsError('failed-precondition', 'DOCUMENT_SCAN_UNAVAILABLE');
  const document = await exactDocument(bucket, path);
  const validation = await validatePdf(document.bytes);
  const scan = await scanner(Buffer.from(document.bytes), validation.sha256);
  if (scan?.status !== 'clean' || scan.sha256 !== validation.sha256
    || typeof scan.engine !== 'string' || !scan.engine) {
    throw new HttpsError('failed-precondition', 'DOCUMENT_SCAN_NOT_CLEAN');
  }
  await assertActive(firestore, uid);
  const id = randomUUID();
  const storagePath = `users/${uid}/emailApplicationSnapshots/${id}.pdf`;
  const createdAtMs = now();
  const object = bucket.file(storagePath);
  // Reserve intent BEFORE Storage creation. Crash cleanup has a durable target.
  const db = accountFirestore(firestore, uid);
  const intent = db.doc(`users/${uid}/documentSnapshots/${id}`);
  await intent.create({ storagePath, state: 'creating', createdAtMs,
    expiresAtMs: createdAtMs + retentionDays * 86400000 });
  await object.save(document.bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 },
    metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store',
      metadata: { snapshot: 'true', expiresAtMs: String(createdAtMs + retentionDays * 86400000) } } });
  const [metadata] = await object.getMetadata();
  const snapshot = { id, ownerUid: uid, kind, fileName, ...validation, storagePath,
    storageGeneration: metadata.generation, capturedAtMs: createdAtMs, scanStatus: 'clean',
    scanEngine: scan.engine, expiresAtMs: createdAtMs + retentionDays * 86400000, state: 'ready' };
  try { await intent.set(snapshot); } catch (error) {
    await bucket.file(storagePath, { generation: metadata.generation }).delete({ ignoreNotFound: true });
    throw error;
  }
  return snapshot;
};

// Finalizers are at-least-once. Delete only the event's exact generation.
const createDocumentFinalizer = ({ firestore, bucket }) => async (event) => {
  const { name, generation } = event.data || {};
  const match = /^users\/([A-Za-z0-9_-]{1,128})\//.exec(name || '');
  if (!match || !/^\d+$/.test(generation)) return;
  const file = bucket.file(name, { generation });
  try { await assertActive(firestore, match[1]); } catch (error) {
    if (error.message !== 'ACCOUNT_UNAVAILABLE') throw error;
    await file.delete({ ignoreNotFound: true }); return;
  }
  if (!/^users\/[^/]+\/(cv\/|attachments\/|cv\.pdf$)/.test(name)) return;
  try {
    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) > MAX_PDF_BYTES) throw new HttpsError('invalid-argument', 'PDF_SIZE_INVALID');
    const [bytes] = await file.download({ validation: 'crc32c' });
    await validatePdf(bytes);
  } catch (error) {
    if (error.code !== 'invalid-argument') throw error;
    await file.delete({ ignoreNotFound: true }); return;
  }
  // Recheck after the slow parser, not just before it.
  try { await assertActive(firestore, match[1]); } catch (error) {
    if (error.message !== 'ACCOUNT_UNAVAILABLE') throw error;
    await file.delete({ ignoreNotFound: true });
  }
};
const createDocumentCleanup = ({ firestore, bucket, now = Date.now }) => async () => {
  const cursor = firestore.doc('maintenance/documentCleanup');
  const previous = await cursor.get();
  const [files, next] = await bucket.getFiles({ prefix: 'users/', maxResults: 100,
    autoPaginate: false, ...(previous.data()?.pageToken ? { pageToken: previous.data().pageToken } : {}) });
  for (const object of files) {
    const match = /^users\/([A-Za-z0-9_-]{1,128})\/(cv\.pdf|(?:cv|attachments|emailApplicationSnapshots)\/[A-Za-z0-9-]+\.pdf)$/.exec(object.name);
    if (!match) continue;
    const uid = match[1];
    const [metadata] = await object.getMetadata();
    if (!/^\d+$/.test(metadata.generation)) continue;
    let remove = false;
    try { await assertActive(firestore, uid); } catch (error) {
      if (error.message !== 'ACCOUNT_UNAVAILABLE') throw error;
      remove = true;
    }
    const created = Date.parse(metadata.timeCreated);
    if (!remove && object.name.includes('/emailApplicationSnapshots/')) {
      const record = await firestore.doc(`users/${uid}/documentSnapshots/${object.name.split('/').pop().slice(0, -4)}`).get();
      remove = (record.exists && Number(record.data().expiresAtMs) <= now())
        || (!record.exists && Number.isFinite(created) && now() - created > 86400000);
    } else if (!remove && Number.isFinite(created) && now() - created > 8 * 86400000) {
      const profile = (await firestore.doc(`users/${uid}`).get()).data();
      const paths = [profile?.cv?.storagePath,
        ...(Array.isArray(profile?.supportingDocuments) ? profile.supportingDocuments.map((item) => item.storagePath) : [])];
      if (profile?.cv && !profile.cv.storagePath) paths.push(`users/${uid}/cv.pdf`);
      remove = !paths.includes(object.name);
    }
    if (remove) await bucket.file(object.name, { generation: metadata.generation }).delete({ ignoreNotFound: true });
  }
  await cursor.set({ pageToken: next?.pageToken || null, updatedAtMs: now() });
};
module.exports = { createValidateUploadedDocumentHandler, createDocumentSnapshot, createDocumentFinalizer,
  createDocumentCleanup, sourcePath };
