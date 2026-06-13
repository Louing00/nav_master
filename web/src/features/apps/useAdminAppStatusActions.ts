import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { checkAppHealth, refreshAppIcon } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { ToastKind } from '../../components/Toast';
import type { NavApp } from '../../types/app';

type ShowToast = (message: string, kind?: ToastKind) => void;

export type HealthCheckSummary = {
  healthy: number;
  restricted: number;
  unhealthy: number;
  requestFailed: number;
};

export function formatHealthCheckSummary(summary: HealthCheckSummary) {
  const checked = summary.healthy + summary.restricted + summary.unhealthy;
  if (checked === 0) {
    return {
      message: '健康检查全部失败',
      kind: 'error' as const,
    };
  }

  const requestFailureText = summary.requestFailed
    ? `，请求失败 ${summary.requestFailed} 个`
    : '';
  return {
    message: `检查完成：正常 ${summary.healthy} 个，受限 ${summary.restricted} 个，异常 ${summary.unhealthy} 个${requestFailureText}`,
    kind:
      summary.unhealthy > 0 || summary.requestFailed > 0
        ? ('error' as const)
        : summary.restricted > 0
          ? ('info' as const)
          : ('success' as const),
  };
}

export function useAdminAppStatusActions({
  apps,
  setApps,
  setActionError,
  showToast,
}: {
  apps: NavApp[];
  setApps: Dispatch<SetStateAction<NavApp[]>>;
  setActionError: Dispatch<SetStateAction<string>>;
  showToast: ShowToast;
}) {
  const [checkingAppIds, setCheckingAppIds] = useState<Set<number>>(new Set());
  const [refreshingIconIds, setRefreshingIconIds] = useState<Set<number>>(new Set());
  const [checkingAllHealth, setCheckingAllHealth] = useState(false);
  const [healthCheckProgress, setHealthCheckProgress] = useState<{
    checked: number;
    total: number;
  } | null>(null);

  async function runHealthCheck(app: NavApp) {
    if (app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)) {
      return;
    }

    setActionError('');
    setCheckingAppIds((current) => new Set(current).add(app.id));
    try {
      const checked = await checkAppHealth(app.id);
      setApps((current) =>
        current.map((item) => (item.id === app.id ? { ...item, ...checked } : item)),
      );
      showToast(
        checked.healthStatus === 'healthy'
          ? '健康检查正常'
          : checked.healthStatus === 'restricted'
            ? '站点可访问，但当前检查受限'
            : '健康检查异常',
        checked.healthStatus === 'healthy'
          ? 'success'
          : checked.healthStatus === 'restricted'
            ? 'info'
            : 'error',
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setCheckingAppIds((current) => {
        const next = new Set(current);
        next.delete(app.id);
        return next;
      });
    }
  }

  async function runIconRefresh(app: NavApp) {
    if (refreshingIconIds.has(app.id)) {
      return;
    }

    setActionError('');
    setRefreshingIconIds((current) => new Set(current).add(app.id));
    try {
      const refreshed = await refreshAppIcon(app.id);
      setApps((current) =>
        current.map((item) => (item.id === app.id ? { ...item, ...refreshed } : item)),
      );
      showToast(
        refreshed.resolvedIconUrl ? '图标已更新' : '未找到在线图标，已保留当前设置',
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setRefreshingIconIds((current) => {
        const next = new Set(current);
        next.delete(app.id);
        return next;
      });
    }
  }

  async function runAllHealthChecks() {
    if (checkingAllHealth || checkingAppIds.size > 0) {
      return;
    }

    const enabledApps = apps.filter((app) => app.healthEnabled !== false);
    if (enabledApps.length === 0) {
      showToast('没有启用健康检查的应用', 'info');
      return;
    }

    setActionError('');
    setCheckingAllHealth(true);
    setHealthCheckProgress({ checked: 0, total: enabledApps.length });

    const summary: HealthCheckSummary = {
      healthy: 0,
      restricted: 0,
      unhealthy: 0,
      requestFailed: 0,
    };

    try {
      for (const app of enabledApps) {
        setCheckingAppIds((current) => new Set(current).add(app.id));

        try {
          const checked = await checkAppHealth(app.id);
          setApps((current) =>
            current.map((item) => (item.id === app.id ? { ...item, ...checked } : item)),
          );

          if (checked.healthStatus === 'healthy') {
            summary.healthy += 1;
          } else if (checked.healthStatus === 'restricted') {
            summary.restricted += 1;
          } else {
            summary.unhealthy += 1;
          }
        } catch {
          summary.requestFailed += 1;
        } finally {
          setHealthCheckProgress((current) =>
            current ? { ...current, checked: current.checked + 1 } : current,
          );
          setCheckingAppIds((current) => {
            const next = new Set(current);
            next.delete(app.id);
            return next;
          });
        }
      }

      const result = formatHealthCheckSummary(summary);
      showToast(result.message, result.kind);
    } finally {
      setCheckingAllHealth(false);
      setCheckingAppIds(new Set());
      setHealthCheckProgress(null);
    }
  }

  return {
    checkingAppIds,
    refreshingIconIds,
    checkingAllHealth,
    healthCheckProgress,
    runHealthCheck,
    runIconRefresh,
    runAllHealthChecks,
  };
}
