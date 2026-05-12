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
};

export type NavCategory = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  apps: NavApp[];
};
