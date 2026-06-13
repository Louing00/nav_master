import type { NavApp } from '../../types/app';

export type AppFormState = {
  name: string;
  url: string;
  description: string;
  icon: string;
  iconUrl: string;
  categoryId?: number;
  tags: string;
  sortOrder: number;
  visible: boolean;
  openInNewTab: boolean;
  healthEnabled: boolean;
};

export function createBlankAppForm(categoryId?: number): AppFormState {
  return {
    name: '',
    url: '',
    description: '',
    icon: '',
    iconUrl: '',
    categoryId,
    tags: '',
    sortOrder: 0,
    visible: true,
    openInNewTab: true,
    healthEnabled: true,
  };
}

export function createAppEditForm(app: NavApp): {
  form: AppFormState;
  autoDescription: string | null;
} {
  const autoDescription = app.description?.trim() ? null : app.resolvedDescription?.trim() || null;
  return {
    autoDescription,
    form: {
      name: app.name,
      url: app.url,
      description: app.description?.trim() || autoDescription || '',
      icon: app.icon || '',
      iconUrl: app.iconUrl || '',
      categoryId: app.categoryId || undefined,
      tags: app.tags.join(', '),
      sortOrder: app.sortOrder || 0,
      visible: app.visible ?? true,
      openInNewTab: app.openInNewTab,
      healthEnabled: app.healthEnabled ?? true,
    },
  };
}

export function isAutomaticDescription(form: AppFormState, autoDescription: string | null) {
  return Boolean(autoDescription && form.description === autoDescription);
}

export function nextAppSortOrder(apps: NavApp[], categoryId?: number) {
  let maximum = 0;
  for (const app of apps) {
    const sameCategory = categoryId ? app.categoryId === categoryId : !app.categoryId;
    if (sameCategory) {
      maximum = Math.max(maximum, app.sortOrder || 0);
    }
  }
  return maximum + 10;
}

export function buildAppPayload(
  form: AppFormState,
  options: {
    apps: NavApp[];
    editing?: NavApp | null;
    autoDescription?: string | null;
  },
) {
  const categoryId = form.categoryId ? Number(form.categoryId) : undefined;
  const categoryChanged = options.editing
    ? (options.editing.categoryId || undefined) !== categoryId
    : false;

  return {
    ...form,
    name: form.name.trim(),
    description: isAutomaticDescription(form, options.autoDescription || null)
      ? ''
      : form.description.trim(),
    iconUrl: form.iconUrl.trim() || null,
    categoryId,
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    sortOrder:
      options.editing && !categoryChanged
        ? Number(form.sortOrder || 0)
        : nextAppSortOrder(options.apps, categoryId),
  };
}
