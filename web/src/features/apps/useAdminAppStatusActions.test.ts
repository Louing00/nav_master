import { describe, expect, it } from 'vitest';
import { formatHealthCheckSummary } from './useAdminAppStatusActions';

describe('health check summary', () => {
  it('reports a successful batch', () => {
    expect(
      formatHealthCheckSummary({
        healthy: 3,
        restricted: 0,
        unhealthy: 0,
        requestFailed: 0,
      }),
    ).toEqual({
      message: '检查完成：正常 3 个，受限 0 个，异常 0 个',
      kind: 'success',
    });
  });

  it('keeps access restrictions separate from failures', () => {
    expect(
      formatHealthCheckSummary({
        healthy: 2,
        restricted: 1,
        unhealthy: 0,
        requestFailed: 0,
      }).kind,
    ).toBe('info');
  });

  it('reports unhealthy and request failure counts', () => {
    expect(
      formatHealthCheckSummary({
        healthy: 1,
        restricted: 1,
        unhealthy: 2,
        requestFailed: 1,
      }),
    ).toEqual({
      message: '检查完成：正常 1 个，受限 1 个，异常 2 个，请求失败 1 个',
      kind: 'error',
    });
  });
});
