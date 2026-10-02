const { HttpsError } = require('firebase-functions/v2/https');
const { AiPolicyError, temporarilyUnavailable } = require('./errors');
const { buildProviderBody, getFeatureConfig, parseProviderResponse } = require('./features');
const { releaseQuota, reserveQuota } = require('./quota');
const { validateAiRequest } = require('./validation');
const { validatePdf } = require('../shared/pdfValidation');

const API_URL = 'https://api.anthropic.com/v1/messages';
const INPUT_USD_PER_MILLION = 3;
const OUTPUT_USD_PER_MILLION = 15;
const CV_AI_CONSENT_VERSION = '2026-08-03';
const CV_AI_PROVIDER = 'Anthropic';

const parseEnabledFeatures = (value) => new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean));
const cost = (input, output) => Number(((input * INPUT_USD_PER_MILLION + output * OUTPUT_USD_PER_MILLION) / 1_000_000).toFixed(8));

const requireCurrentCvAiConsent = async (firestore, uid) => {
  const snapshot = await firestore.doc(`users/${uid}`).get();
  const profile = snapshot.exists ? snapshot.data() : null;
  if (!profile
    || profile.cvAiConsentGranted !== true
    || profile.cvAiConsentVersion !== CV_AI_CONSENT_VERSION
    || profile.cvAiConsentProvider !== CV_AI_PROVIDER) {
    throw new AiPolicyError('permission-denied', 'AI_CV_CONSENT_REQUIRED');
  }
};

const createAiFeatureHandler = ({ firestore, logger, apiKey, enabledFeatures,
  fetchImpl = fetch, now = Date.now, requireAppCheck = false, providerTimeoutMs = 20_000 }) => async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'AI_LOGIN_REQUIRED');
  if (requireAppCheck && !request.app) throw new HttpsError('failed-precondition', 'AI_APP_CHECK_REQUIRED');
  const uid = request.auth.uid;
  const startedAt = now();
  let feature = 'unknown'; let config; let reservation; let category = 'unknown';
  let inputTokens = 0; let outputTokens = 0;
  try {
    const validated = validateAiRequest(request.data);
    feature = validated.feature;
    config = getFeatureConfig(feature);
    if (!parseEnabledFeatures(enabledFeatures()).has(feature)) {
      throw new AiPolicyError('failed-precondition', 'AI_FEATURE_DISABLED');
    }
    if (feature === 'cv_parse') {
      await requireCurrentCvAiConsent(firestore, uid);
      await validatePdf(Buffer.from(validated.payload.documentBase64, 'base64'));
    }
    const resolvedApiKey = String(apiKey() || '').trim();
    if (!resolvedApiKey) {
      category = 'configuration';
      throw temporarilyUnavailable();
    }
    reservation = await reserveQuota({ firestore, uid, feature, payload: validated.payload,
      quota: config.quota, now });
    const controller = new AbortController();
    let timeout;
    const providerRequest = (async () => {
      const response = await fetchImpl(API_URL, {
        method: 'POST', headers: { 'x-api-key': resolvedApiKey, 'anthropic-version': '2023-06-01',
          'content-type': 'application/json' },
        body: JSON.stringify(buildProviderBody(feature, validated.payload)),
        signal: controller.signal,
      });
      if (!response.ok) {
        category = response.status === 429 ? 'provider_limit' : response.status >= 500 ? 'provider_unavailable' : 'provider_rejected';
        throw response.status === 429
          ? new AiPolicyError('resource-exhausted', 'AI_LIMIT_REACHED')
          : temporarilyUnavailable();
      }
      // A chegada dos headers não conclui a resposta. O mesmo prazo cobre a
      // leitura do corpo para que um stream interrompido não retenha a callable.
      return await response.json();
    })().catch((error) => {
      if (error instanceof AiPolicyError) throw error;
      if (category !== 'provider_timeout') category = 'provider_unavailable';
      throw temporarilyUnavailable();
    });
    const providerTimeout = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        category = 'provider_timeout';
        controller.abort();
        reject(temporarilyUnavailable());
      }, Math.max(1, Number(providerTimeoutMs) || 20_000));
    });
    let json;
    try {
      json = await Promise.race([providerRequest, providerTimeout]);
    } finally {
      clearTimeout(timeout);
    }
    inputTokens = Number(json?.usage?.input_tokens) || 0;
    outputTokens = Number(json?.usage?.output_tokens) || 0;
    const data = parseProviderResponse(feature, json);
    category = 'success';
    return { data, schemaVersion: validated.schemaVersion };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof AiPolicyError) {
      category = category === 'unknown' ? error.publicCode.toLowerCase() : category;
      throw new HttpsError(error.code, error.publicCode);
    }
    category = 'internal';
    throw new HttpsError('unavailable', 'AI_TEMPORARILY_UNAVAILABLE');
  } finally {
    await releaseQuota({ firestore, reservation, now }).catch(() => logger.warn('ai quota release failed', { feature }));
    const event = { uid, feature, occurredAtMs: now(), model: config?.model || null,
      inputTokens, outputTokens, durationMs: Math.max(0, now() - startedAt),
      success: category === 'success', errorCategory: category === 'success' ? null : category,
      estimatedCostUsd: cost(inputTokens, outputTokens) };
    await firestore.collection('aiEvents').add(event).catch(() => logger.warn('ai audit write failed', { feature }));
    logger.info('ai feature completed', {
      feature: event.feature,
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      durationMs: event.durationMs,
      success: event.success,
      errorCategory: event.errorCategory,
      estimatedCostUsd: event.estimatedCostUsd,
    });
  }
};

module.exports = {
  createAiFeatureHandler,
  parseEnabledFeatures,
  requireCurrentCvAiConsent,
  CV_AI_CONSENT_VERSION,
  CV_AI_PROVIDER,
};
