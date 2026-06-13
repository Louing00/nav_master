// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppEditor } from './useAppEditor';

const previewState = {
  data: null as { resolvedDescription: string | null } | null,
  loading: false,
  error: '',
  validUrl: true,
  refresh: vi.fn(),
};

vi.mock('../../hooks/useAppMetadataPreview', () => ({
  useAppMetadataPreview: () => previewState,
}));

describe('useAppEditor', () => {
  beforeEach(() => {
    previewState.data = null;
    previewState.refresh.mockClear();
  });

  it('does not refill a description after the user explicitly clears it', () => {
    const { result, rerender } = renderHook(() => useAppEditor(true));

    previewState.data = { resolvedDescription: '自动简介' };
    rerender();
    expect(result.current.form.description).toBe('自动简介');
    expect(result.current.descriptionIsAuto).toBe(true);

    act(() => result.current.changeDescription(''));
    rerender();

    expect(result.current.form.description).toBe('');
    expect(result.current.descriptionIsAuto).toBe(false);
  });
});
