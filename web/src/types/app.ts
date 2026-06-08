export type NavApp = {
  id: number;
  name: string;
  resolvedName?: string | null;
  nameResolvedAt?: string | null;
  url: string;
  description?: string | null;
  resolvedDescription?: string | null;
  descriptionResolvedAt?: string | null;
  icon?: string | null;
  iconUrl?: string | null;
  resolvedIconUrl?: string | null;
  iconResolvedAt?: string | null;
  tags: string[];
  openInNewTab: boolean;
  visible?: boolean;
  sortOrder?: number;
  categoryId?: number | null;
  healthStatus?: 'unknown' | 'healthy' | 'restricted' | 'unhealthy';
  healthCheckedAt?: string | null;
  healthLatencyMs?: number | null;
  healthError?: string | null;
  healthEnabled?: boolean;
};

export type NavCategory = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  apps: NavApp[];
};
