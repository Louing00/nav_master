export type AdminCategory = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  visible: boolean;
  _count?: {
    apps: number;
  };
};
