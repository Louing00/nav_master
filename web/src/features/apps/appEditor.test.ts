import { describe, expect, it } from 'vitest';
import type { NavApp } from '../../types/app';
import {
  buildAppPayload,
  createAppEditForm,
  createBlankAppForm,
  isAutomaticDescription,
  nextAppSortOrder,
} from './appEditor';

const existingApp: NavApp = {
  id: 1,
  name: '',
  resolvedName: 'Example',
  url: 'https://example.com',
  description: '',
  resolvedDescription: '自动简介',
  icon: null,
  iconUrl: null,
  resolvedIconUrl: null,
  tags: ['cloud', 'admin'],
  categoryId: 2,
  sortOrder: 20,
  visible: true,
  openInNewTab: true,
  healthEnabled: true,
};

describe('app editor model', () => {
  it('creates an edit form without converting resolved description into manual content', () => {
    const state = createAppEditForm(existingApp);

    expect(state.form.description).toBe('自动简介');
    expect(state.autoDescription).toBe('自动简介');
    expect(isAutomaticDescription(state.form, state.autoDescription)).toBe(true);
  });

  it('keeps manual descriptions and tags intact', () => {
    const state = createAppEditForm({
      ...existingApp,
      description: '手动简介',
      resolvedDescription: '自动简介',
    });

    expect(state.form.description).toBe('手动简介');
    expect(state.autoDescription).toBeNull();
    expect(state.form.tags).toBe('cloud, admin');
  });

  it('builds the same payload for automatic and manual descriptions', () => {
    const automatic = createAppEditForm(existingApp);
    expect(
      buildAppPayload(automatic.form, {
        apps: [existingApp],
        editing: existingApp,
        autoDescription: automatic.autoDescription,
      }),
    ).toMatchObject({
      description: '',
      tags: ['cloud', 'admin'],
      categoryId: 2,
      sortOrder: 20,
    });

    const manual = { ...automatic.form, description: '新的手动简介' };
    expect(
      buildAppPayload(manual, {
        apps: [existingApp],
        editing: existingApp,
        autoDescription: automatic.autoDescription,
      }).description,
    ).toBe('新的手动简介');
  });

  it('assigns the next sort order when creating or changing categories', () => {
    const apps = [
      existingApp,
      { ...existingApp, id: 2, sortOrder: 40 },
      { ...existingApp, id: 3, categoryId: null, sortOrder: 30 },
    ];

    expect(nextAppSortOrder(apps, 2)).toBe(50);
    expect(nextAppSortOrder(apps)).toBe(40);
    expect(
      buildAppPayload(
        { ...createBlankAppForm(2), url: 'https://new.example.com' },
        { apps },
      ).sortOrder,
    ).toBe(50);
  });
});
