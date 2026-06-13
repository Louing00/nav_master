export const SITE_SETTING_DEFAULTS = {
  site_title: 'AtlasGate 星渡枢航',
  site_subtitle: '个人系统、内网服务与运维入口的统一星图',
  logo: '✦',
  theme: 'auto',
  footer_text: 'Powered by AtlasGate',
  icon_resolve_mode: 'auto',
  icon_auto_resolve_on_change: 'true',
  home_quick_sort_enabled: 'false',
  health_auto_check_enabled: 'true',
  health_auto_check_interval_minutes: '30',
} as const;

export const WRITABLE_SITE_SETTING_KEYS = new Set(Object.keys(SITE_SETTING_DEFAULTS));

export const HEALTH_AUTO_CHECK_LAST_AT_KEY = 'health_auto_check_last_at';
export const DEFAULT_HEALTH_INTERVAL_MINUTES = 30;
export const MIN_HEALTH_INTERVAL_MINUTES = 1;
export const MAX_HEALTH_INTERVAL_MINUTES = 1440;

export type SettingsMap = Record<string, string>;

export function settingsRowsToMap(rows: Array<{ key: string; value: string | null }>): SettingsMap {
  return rows.reduce<SettingsMap>((settings, row) => {
    settings[row.key] = row.value || '';
    return settings;
  }, {});
}

export function normalizeSiteSetting(key: string, value: unknown): string {
  if (
    key === 'health_auto_check_enabled' ||
    key === 'home_quick_sort_enabled' ||
    key === 'icon_auto_resolve_on_change'
  ) {
    return value === true || value === 'true' ? 'true' : 'false';
  }

  if (key === 'icon_resolve_mode') {
    return ['auto', 'server_only', 'browser_first'].includes(String(value)) ? String(value) : 'auto';
  }

  if (key === 'health_auto_check_interval_minutes') {
    return String(parseHealthIntervalMinutes(value));
  }

  return String(value ?? '');
}

export function settingEnabled(value: string | null | undefined, defaultValue = false): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true';
}

export function iconAutoResolveOnChangeEnabled(settings: SettingsMap): boolean {
  if (settings.icon_auto_resolve_on_change !== undefined) {
    return settings.icon_auto_resolve_on_change !== 'false';
  }

  return settings.icon_resolve_mode !== 'server_only';
}

export function parseHealthIntervalMinutes(value: unknown): number {
  const interval = Number(value || DEFAULT_HEALTH_INTERVAL_MINUTES);
  if (!Number.isFinite(interval)) {
    return DEFAULT_HEALTH_INTERVAL_MINUTES;
  }
  return Math.min(
    Math.max(Math.round(interval), MIN_HEALTH_INTERVAL_MINUTES),
    MAX_HEALTH_INTERVAL_MINUTES,
  );
}
