import {
  sanitizeMonitoringContext,
  sanitizeMonitoringDiagnostic,
  sanitizeMonitoringException,
} from '../../src/services/monitoringPrivacy';

describe('monitoring privacy', () => {
  test('não envia mensagem de erro que possa conter currículo ou resposta profissional', () => {
    const providerError = Object.assign(
      new Error('Falha ao processar: Ana, R$ 8.000, experiência secreta em COBOL'),
      { code: 'functions/unavailable' },
    );
    const safe = sanitizeMonitoringException(providerError);

    expect(safe.message).toBe('Application error (functions/unavailable)');
    expect(safe.message).not.toContain('Ana');
    expect(safe.message).not.toContain('8.000');
    expect(safe.message).not.toContain('COBOL');
    expect(sanitizeMonitoringDiagnostic(providerError.message)).toBe('Application error');
  });

  test('mantém apenas contexto operacional permitido e remove PII', () => {
    expect(sanitizeMonitoringContext({
      operation: 'package_generation',
      stage: 'provider',
      email: 'ana@example.com',
      answer: 'Pretensão de R$ 8.000',
    })).toEqual({ operation: 'package_generation', stage: 'provider' });
  });
});
