// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomeHeader from './HomeHeader';

function renderHeader() {
  render(
    <MemoryRouter>
      <HomeHeader
        settings={{ site_title: 'AtlasGate' }}
        dark={false}
        allFilteredCollapsed={false}
        keyword=""
        categories={[]}
        activeCategoryId={null}
        counts={{ total: 2, healthy: 2, restricted: 0, unhealthy: 0 }}
        searchInputRef={createRef<HTMLInputElement>()}
        onToggleDark={vi.fn()}
        onToggleAllCategories={vi.fn()}
        onKeywordChange={vi.fn()}
        onCategorySelect={vi.fn()}
        onFocusHealthIssue={vi.fn()}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('HomeHeader mobile menu', () => {
  it('stays open for internal clicks and closes after an outside pointer', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: '更多操作' }));
    expect(screen.getByText('紧凑显示全部分类')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText('紧凑显示全部分类'));
    expect(screen.getByText('紧凑显示全部分类')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByPlaceholderText('搜索系统、描述或标签'));
    expect(screen.queryByText('紧凑显示全部分类')).not.toBeInTheDocument();
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: '更多操作' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('紧凑显示全部分类')).not.toBeInTheDocument();
  });

  it('treats the theme control as outside the menu', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: '更多操作' }));
    fireEvent.pointerDown(screen.getAllByRole('button', { name: '切换主题' })[1]);

    expect(screen.queryByText('紧凑显示全部分类')).not.toBeInTheDocument();
  });
});
