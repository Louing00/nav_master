import { describe, expect, it } from 'vitest';
import { classifyHealthStatus } from './health-check.service';

describe('health status classification', () => {
  it('treats redirects and successful responses as healthy', () => {
    expect(classifyHealthStatus(200, 42)).toEqual({
      healthStatus: 'healthy',
      healthLatencyMs: 42,
      healthError: null,
    });
    expect(classifyHealthStatus(302, 18).healthStatus).toBe('healthy');
  });

  it('distinguishes access restrictions from downtime', () => {
    expect(classifyHealthStatus(403, 25)).toEqual({
      healthStatus: 'restricted',
      healthLatencyMs: 25,
      healthError: 'HTTP 403',
    });
    expect(classifyHealthStatus(429, 25).healthStatus).toBe('restricted');
  });

  it('treats other HTTP errors as unhealthy', () => {
    expect(classifyHealthStatus(500, 31)).toEqual({
      healthStatus: 'unhealthy',
      healthLatencyMs: 31,
      healthError: 'HTTP 500',
    });
  });
});
