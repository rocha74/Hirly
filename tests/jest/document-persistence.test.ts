import { getDoc, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { deleteCV, uploadCV } from '../../src/services/cv';
import {
  deleteProfileDocument, uploadProfileDocument, type ProfileDocument,
} from '../../src/services/profileDocuments';

jest.mock('../../src/services/firebase', () => ({
  auth: { currentUser: { uid: 'alice', getIdToken: jest.fn(async () => 'test-token') } },
  db: {},
  storage: { app: { options: { storageBucket: 'configured-bucket', projectId: 'test-project' } } },
}));
jest.mock('../../src/services/monitoring', () => ({ captureException: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...parts: string[]) => parts.join('/')),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  deleteField: jest.fn(() => 'DELETE_FIELD'),
}));
jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn(), ref: jest.fn((_storage: unknown, path: string) => path),
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(), getInfoAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));

const input = { uri: 'file:///cv.pdf', fileName: 'cv.pdf', sizeBytes: 100, contentType: 'application/pdf' };
const attachment: ProfileDocument = {
  id: 'document-1', storagePath: 'users/alice/attachments/document-1.pdf', fileName: 'extra.pdf',
  uploadedAt: 1, sizeBytes: 100, contentType: 'application/pdf',
};
const cv = { storagePath: 'users/alice/cv/old.pdf' };
const snapshot = (data: Record<string, unknown>) => ({ exists: () => true, data: () => data });
const transaction = { get: jest.fn(), update: jest.fn() };
const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({ ok: true, headers: { get: () => 'https://upload.example/session' } });
  jest.mocked(FileSystem.uploadAsync).mockResolvedValue({ status: 200, headers: {}, body: '', mimeType: null });
  jest.mocked(deleteObject).mockResolvedValue(undefined);
  jest.mocked(httpsCallable).mockReturnValue((async () => ({ data: { valid: true } })) as never);
  jest.mocked(getDoc).mockResolvedValue(snapshot({ cv }) as never);
  transaction.get.mockResolvedValue(snapshot({ cv, supportingDocuments: [attachment] }));
  jest.mocked(runTransaction).mockImplementation(async (_db, operation) => operation(transaction as never));
});

afterAll(() => { global.fetch = originalFetch; });

describe('private document persistence', () => {
  it('keeps attachment metadata and reports storage deletion failure', async () => {
    jest.mocked(deleteObject).mockRejectedValue({ code: 'storage/unauthorized' });
    await expect(deleteProfileDocument(attachment)).rejects.toMatchObject({ code: 'delete' });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('retries a removed file and removes stale attachment metadata by identity', async () => {
    jest.mocked(deleteObject).mockRejectedValue({ code: 'storage/object-not-found' });
    const other = { ...attachment, id: 'document-2', storagePath: 'users/alice/attachments/document-2.pdf' };
    transaction.get.mockResolvedValue(snapshot({ supportingDocuments: [
      { ...attachment, fileName: 'renamed.pdf' }, other,
    ] }));
    await deleteProfileDocument(attachment);
    expect(transaction.update).toHaveBeenCalledWith('users/alice', { supportingDocuments: [other] });
  });

  it('reports metadata failure so deletion can be retried', async () => {
    jest.mocked(runTransaction).mockRejectedValue({ code: 'unavailable' });
    await expect(deleteProfileDocument(attachment)).rejects.toMatchObject({ code: 'delete' });
  });

  it('enforces the current attachment limit even when the screen counter is stale', async () => {
    transaction.get.mockResolvedValue(snapshot({ supportingDocuments: Array(5).fill(attachment) }));
    await expect(uploadProfileDocument(input, 0)).rejects.toMatchObject({ code: 'limit' });
    expect(transaction.update).not.toHaveBeenCalled();
    expect(deleteObject).toHaveBeenCalledTimes(1);
  });

  it('adds an attachment to the latest list read in a transaction', async () => {
    const result = await uploadProfileDocument(input, 0);
    expect(transaction.update).toHaveBeenCalledWith('users/alice', {
      supportingDocuments: [attachment, result],
    });
  });

  it('preserves a new CV uploaded on another device during deletion', async () => {
    transaction.get.mockResolvedValue(snapshot({ cv: { storagePath: 'users/alice/cv/new.pdf' } }));
    await deleteCV();
    expect(deleteObject).toHaveBeenCalledWith('users/alice/cv/old.pdf');
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it('clears CV metadata only after storage deletion succeeds', async () => {
    await deleteCV();
    expect(transaction.update).toHaveBeenCalledWith('users/alice', expect.objectContaining({ cv: null }));
    expect(jest.mocked(deleteObject).mock.invocationCallOrder[0])
      .toBeLessThan(transaction.update.mock.invocationCallOrder[0]);
  });

  it('does not allow deletion to race an upload on the same device', async () => {
    let finishUpload!: (result: FileSystem.FileSystemUploadResult) => void;
    jest.mocked(FileSystem.uploadAsync).mockImplementation(() => new Promise((resolve) => {
      finishUpload = resolve;
    }));
    const pending = uploadCV(input);
    // Advance the resolved validation, token and resumable-session requests.
    while (!finishUpload) await Promise.resolve();
    await expect(deleteCV()).rejects.toMatchObject({ code: 'upload_in_progress' });
    finishUpload({ status: 200, headers: {}, body: '', mimeType: null });
    await pending;
  });

  it('replaces the CV found at commit time, not a stale pre-upload reference', async () => {
    transaction.get.mockResolvedValue(snapshot({ cv: { storagePath: 'users/alice/cv/newer.pdf' } }));
    const result = await uploadCV(input);
    expect(deleteObject).toHaveBeenCalledWith('users/alice/cv/newer.pdf');
    expect(transaction.update).toHaveBeenCalledWith('users/alice', expect.objectContaining({ cv: result }));
  });

  it('never sends CV or attachments to an unconfigured fallback bucket', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    await expect(uploadCV(input)).rejects.toMatchObject({ code: 'permission_denied' });
    await expect(uploadProfileDocument(input, 0)).rejects.toMatchObject({ code: 'upload' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    for (const [url] of mockFetch.mock.calls) expect(url).toContain('/b/configured-bucket/');
  });

  it('accepts a PDF when the native picker omits its optional MIME type', async () => {
    await expect(uploadCV({ ...input, contentType: undefined }))
      .resolves.toMatchObject({ contentType: 'application/pdf' });
  });

  it('still rejects a non-PDF MIME type before uploading', async () => {
    await expect(uploadCV({ ...input, contentType: 'application/zip' }))
      .rejects.toMatchObject({ code: 'invalid_type' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('removes an uploaded file rejected by the server PDF validator', async () => {
    jest.mocked(httpsCallable).mockReturnValue((async () => ({ data: { valid: false } })) as never);
    await expect(uploadCV(input)).rejects.toMatchObject({ code: 'invalid_file' });
    expect(deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^users\/alice\/cv\//));
  });
});
