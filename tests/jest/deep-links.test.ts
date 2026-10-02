import {
  buildJobCustomScheme,
  buildJobUrl,
  parseDeepLink,
} from '../../src/utils/deepLinks';

describe('deep link parser', () => {
  test.each([
    'hirly://v/job_123',
    'hirly-dev://v/job_123',
    'hirly-staging://v/job_123',
    'https://hirly.app/v/job_123',
    'https://www.hirly.app/v/job_123',
  ])('accepts supported route %s', (url) => {
    expect(parseDeepLink(url)).toEqual({ type: 'job', jobId: 'job_123' });
  });

  test.each([
    'https://evil.example/v/job_123',
    'hirly://profile/job_123',
    'https://hirly.app/v/../../admin',
    'https://user:password@hirly.app/v/job_123',
  ])('rejects invalid or hostile route %s', (url) => {
    expect(parseDeepLink(url)).toEqual({ type: 'invalid' });
  });

  test('builds canonical links from the ID only', () => {
    expect(buildJobUrl('job-1')).toBe('https://hirly.app/v/job-1');
    expect(buildJobCustomScheme('job-1')).toBe('hirly://v/job-1');
  });
});
