const { onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { defineBoolean, defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { createDeleteMyAccountHandler, createDeletionSweep } = require('./accountDeletion');
const { createValidateUploadedDocumentHandler, createDocumentFinalizer, createDocumentCleanup } = require('./documentSecurity');
const { createAiFeatureHandler } = require('./ai/handler');
const { createReportJobHandler } = require('./jobModeration');
const { createExpireJobsHandler } = require('./jobMaintenance');
const { createResolveJobLinkHandler } = require('./jobLinks');
const { applyCallableOptions: withApplyCallableOptions } = require('./shared/callableOptions');
const { withActiveAccount } = require('./shared/accountLifecycle');
const {
  createApproveApplicationPackageHandler,
  createPrepareApplicationPackageHandler,
  createRegenerateApplicationPackageSectionHandler,
  createRejectApplicationPackageHandler,
  createUpdateApplicationPackageContentHandler,
} = require('./applicationPackages');
const {
  createBulkApproveApplicationQueueHandler,
  createBulkRemoveApplicationQueueHandler,
  createDeferApplicationQueueItemHandler,
} = require('./applicationQueue');
const {
  createCompleteExternalApplicationSessionHandler,
  createMarkExternalAnswerCopiedHandler,
  createMarkExternalApplicationSessionOpenedHandler,
  createStartExternalApplicationSessionHandler,
  createToggleExternalSessionTargetHandler,
} = require('./externalApplicationSessions');

if (getApps().length === 0) initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const AI_ENABLED_FEATURES = defineString('AI_ENABLED_FEATURES', {
  default: 'cv_parse,job_summary,match_explanation,cv_coach',
});
// O SDK atual interpreta BooleanParam como truthy dentro do middleware de callable.
// Manter literal false no piloto; ativar junto da atualizacao do firebase-functions.
const AI_ENFORCE_APP_CHECK = false;
const APPLY_ENFORCE_APP_CHECK = defineBoolean('APPLY_ENFORCE_APP_CHECK', { default: false });

const applyCallableOptions = (options) =>
  withApplyCallableOptions(options, APPLY_ENFORCE_APP_CHECK);

const firestore = getFirestore();
const STORAGE_DELETION_FENCE_VERIFIED = defineBoolean('STORAGE_DELETION_FENCE_VERIFIED', { default: false });
const deletionDependencies = { auth: getAuth(), firestore, bucket: getStorage().bucket(), logger,
  storageFenceVerified: () => STORAGE_DELETION_FENCE_VERIFIED.value() === true };
exports.sweepAccountDeletions = onSchedule({ schedule: 'every 15 minutes', region: 'us-central1',
  timeoutSeconds: 540, maxInstances: 1 }, createDeletionSweep(deletionDependencies));
exports.validateUploadedDocument = onCall(applyCallableOptions({ region: 'us-central1',
  timeoutSeconds: 30, memory: '512MiB', maxInstances: 5 }),
createValidateUploadedDocumentHandler({ firestore, bucket: getStorage().bucket() }));
exports.validateFinalizedDocument = onObjectFinalized({ region: 'us-central1',
  timeoutSeconds: 60, memory: '512MiB', retry: true },
createDocumentFinalizer({ firestore, bucket: getStorage().bucket() }));
exports.cleanupDocuments = onSchedule({ schedule: 'every 60 minutes', region: 'us-central1',
  timeoutSeconds: 300, maxInstances: 1 }, createDocumentCleanup({ firestore, bucket: getStorage().bucket() }));

exports.callAiFeature = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 90,
    memory: '512MiB',
    region: 'us-central1',
    maxInstances: 10,
    enforceAppCheck: AI_ENFORCE_APP_CHECK,
    consumeAppCheckToken: AI_ENFORCE_APP_CHECK,
  },
  withActiveAccount(createAiFeatureHandler)( {
    firestore,
    logger,
    apiKey: () => ANTHROPIC_API_KEY.value(),
    enabledFeatures: () => AI_ENABLED_FEATURES.value(),
    requireAppCheck: AI_ENFORCE_APP_CHECK,
  }),
);

const deleteMyAccountHandler = createDeleteMyAccountHandler(deletionDependencies);

exports.deleteMyAccount = onCall(
  {
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
    maxInstances: 5,
  },
  deleteMyAccountHandler,
);

exports.reportJob = onCall(
  { region: 'us-central1', maxInstances: 20 },
  withActiveAccount(createReportJobHandler)({
    firestore,
    logger,
    serverTimestamp: FieldValue.serverTimestamp,
  }),
);

exports.resolveJobLink = onCall(
  { region: 'us-central1', maxInstances: 20 },
  createResolveJobLinkHandler({ firestore, logger }),
);

exports.expireJobs = onSchedule(
  { schedule: 'every 6 hours', region: 'us-central1', timeoutSeconds: 300 },
  createExpireJobsHandler({
    firestore,
    logger,
    serverTimestamp: FieldValue.serverTimestamp,
  }),
);

const packageDependencies = {
  firestore,
  logger,
  timestampFromMillis: Timestamp.fromMillis,
};

exports.prepareApplicationPackage = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 90, memory: '512MiB', maxInstances: 10 }),
  withActiveAccount(createPrepareApplicationPackageHandler)(packageDependencies),
);

exports.regenerateApplicationPackageSection = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', maxInstances: 10 }),
  withActiveAccount(createRegenerateApplicationPackageSectionHandler)(packageDependencies),
);

exports.updateApplicationPackageContent = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createUpdateApplicationPackageContentHandler)(packageDependencies),
);

exports.approveApplicationPackage = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createApproveApplicationPackageHandler)(packageDependencies),
);

exports.rejectApplicationPackage = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createRejectApplicationPackageHandler)(packageDependencies),
);

exports.deferApplicationQueueItem = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createDeferApplicationQueueItemHandler)(packageDependencies),
);

exports.bulkApproveApplicationQueue = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', maxInstances: 10 }),
  withActiveAccount(createBulkApproveApplicationQueueHandler)(packageDependencies),
);

exports.bulkRemoveApplicationQueue = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', maxInstances: 10 }),
  withActiveAccount(createBulkRemoveApplicationQueueHandler)(packageDependencies),
);

exports.startExternalApplicationSession = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createStartExternalApplicationSessionHandler)(packageDependencies),
);

exports.markExternalApplicationSessionOpened = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createMarkExternalApplicationSessionOpenedHandler)(packageDependencies),
);

exports.markExternalAnswerCopied = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createMarkExternalAnswerCopiedHandler)(packageDependencies),
);

exports.toggleExternalSessionTarget = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createToggleExternalSessionTargetHandler)(packageDependencies),
);

exports.completeExternalApplicationSession = onCall(
  applyCallableOptions({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 20 }),
  withActiveAccount(createCompleteExternalApplicationSessionHandler)(packageDependencies),
);
