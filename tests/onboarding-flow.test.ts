import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildConsentProfilePatch,
  canCompleteRequiredOnboarding,
  getRequiredOnboardingRoute,
} from '../src/services/onboardingFlow';
import type { UserProfile } from '../src/types';
import { computeProfileCompleteness } from '../src/utils/profileCompleteness';

describe('required beta onboarding', () => {
  test('starts with consent and resumes from the first missing required step', () => {
    assert.equal(getRequiredOnboardingRoute({ hasCurrentConsent: false }), 'Consent');
    assert.equal(getRequiredOnboardingRoute({ hasCurrentConsent: true }), 'OpportunityType');
    assert.equal(getRequiredOnboardingRoute({
      hasCurrentConsent: true,
      opportunityType: 'Internship',
    }), 'Area');
    assert.equal(getRequiredOnboardingRoute({
      hasCurrentConsent: true,
      opportunityType: 'Internship',
      area: 'Tech & Engenharia',
    }), 'Preferences');
    assert.equal(getRequiredOnboardingRoute({
      hasCurrentConsent: true,
      opportunityType: 'Internship',
      area: 'Tech & Engenharia',
      preferredModes: ['Híbrido'],
      preferredCity: 'São Paulo',
      preferredState: 'SP',
    }), 'CVUpload');
  });

  test('consent patch never completes onboarding by itself', () => {
    const patch = buildConsentProfilePatch({
      locale: 'pt-BR',
      appVersion: '1.0.0',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      acceptedAt: 123,
    });
    assert.equal(patch.termsAccepted, true);
    assert.equal('onboardingCompleted' in patch, false);
  });

  test('reaches the feed without CV, education, skills, interests or salary', () => {
    assert.equal(canCompleteRequiredOnboarding({
      hasCurrentConsent: true,
      opportunityType: 'FirstJob',
      area: 'Negócios & Vendas',
      preferredModes: ['Remoto'],
      preferredCity: 'Recife',
      preferredState: 'PE',
    }), true);
  });

  test('does not complete without consent or minimum preferences', () => {
    const completeProfile = {
      opportunityType: 'Trainee',
      area: 'Dados & Analytics',
      preferredModes: ['Híbrido' as const],
      preferredCity: 'São Paulo',
      preferredState: 'SP',
    };
    assert.equal(canCompleteRequiredOnboarding({
      ...completeProfile,
      hasCurrentConsent: false,
    }), false);
    assert.equal(canCompleteRequiredOnboarding({
      ...completeProfile,
      preferredModes: [],
      hasCurrentConsent: true,
    }), false);
  });

  test('profile banner invites optional CV, skills, education and interests', () => {
    const minimalProfile = {
      opportunityType: 'FirstJob',
      area: 'Negócios & Vendas',
      preferredModes: ['Remoto'],
      preferredCity: 'Recife',
      preferredState: 'PE',
      interests: [],
      skills: [],
    } satisfies Partial<UserProfile>;
    const result = computeProfileCompleteness(minimalProfile);
    assert.equal(result.pct, 50);
    assert.deepEqual(result.missing, ['currículo', 'skills', 'educação', 'interesses']);
  });
});
