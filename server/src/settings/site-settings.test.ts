import { describe, expect, it } from 'vitest';
import {
  iconAutoResolveOnChangeEnabled,
  normalizeSiteSetting,
  parseHealthIntervalMinutes,
  settingEnabled,
  settingsRowsToMap,
} from './site-settings';

describe('site settings policy', () => {
  it('preserves the legacy icon mode fallback', () => {
    expect(iconAutoResolveOnChangeEnabled({ icon_resolve_mode: 'server_only' })).toBe(false);
    expect(iconAutoResolveOnChangeEnabled({ icon_resolve_mode: 'auto' })).toBe(true);
    expect(
      iconAutoResolveOnChangeEnabled({
        icon_resolve_mode: 'server_only',
        icon_auto_resolve_on_change: 'true',
      }),
    ).toBe(true);
  });

  it('normalizes boolean and interval settings', () => {
    expect(normalizeSiteSetting('home_quick_sort_enabled', true)).toBe('true');
    expect(normalizeSiteSetting('home_quick_sort_enabled', 'false')).toBe('false');
    expect(parseHealthIntervalMinutes('0')).toBe(1);
    expect(parseHealthIntervalMinutes('2000')).toBe(1440);
    expect(parseHealthIntervalMinutes('invalid')).toBe(30);
  });

  it('uses explicit defaults for missing boolean settings', () => {
    expect(settingEnabled(undefined)).toBe(false);
    expect(settingEnabled(undefined, true)).toBe(true);
  });

  it('converts database rows into a string map', () => {
    expect(
      settingsRowsToMap([
        { key: 'theme', value: 'auto' },
        { key: 'footer_text', value: null },
      ]),
    ).toEqual({ theme: 'auto', footer_text: '' });
  });
});
