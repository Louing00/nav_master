export type FeatureIndexItem = {
  id: number;
  title: string;
  description?: string | null;
  anchor: string;
};

export type NavApp = {
  id: number;
  name: string;
  url: string;
  description?: string | null;
  icon?: string | null;
  tags: string[];
  openInNewTab: boolean;
  visible?: boolean;
  sortOrder?: number;
  categoryId?: number | null;
  hasFeatureIndex?: boolean;
  features?: FeatureIndexItem[];
};

export type NavCategory = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  apps: NavApp[];
};

export type AppDetail = NavApp & {
  category?: {
    id: number;
    name: string;
    icon?: string | null;
  } | null;
  features: FeatureIndexItem[];
};
