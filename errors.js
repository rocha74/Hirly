class AiPolicyError extends Error {
  constructor(code, publicCode) {
    super(publicCode);
    this.name = 'AiPolicyError';
    this.code = code;
    this.publicCode = publicCode;
  }
}

const invalidRequest = () => new AiPolicyError('invalid-argument', 'AI_INVALID_REQUEST');
const featureDisabled = () => new AiPolicyError('failed-precondition', 'AI_FEATURE_DISABLED');
const limitReached = () => new AiPolicyError('resource-exhausted', 'AI_LIMIT_REACHED');
const temporarilyUnavailable = () => new AiPolicyError('unavailable', 'AI_TEMPORARILY_UNAVAILABLE');

module.exports = {
  AiPolicyError,
  featureDisabled,
  invalidRequest,
  limitReached,
  temporarilyUnavailable,
};
