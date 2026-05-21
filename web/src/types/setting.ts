export type SiteSettings = {
  site_title?: string;
  site_subtitle?: string;
  logo?: string;
  theme?: string;
  footer_text?: string;
  icon_resolve_mode?: 'auto' | 'server_only' | 'browser_first' | string;
  icon_auto_resolve_on_change?: string;
  home_quick_sort_enabled?: string;
  health_auto_check_enabled?: string;
  health_auto_check_interval_minutes?: string;
  health_auto_check_last_at?: string;
};
