// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { AdminCategory } from '../../types/category';
import AppEditorFields from './AppEditorFields';
import { createBlankAppForm } from './appEditor';

const categories: AdminCategory[] = [
  {
    id: 2,
    name: '常用平台',
    sortOrder: 10,
    visible: true,
  },
];

function EditorHarness() {
  const [form, setForm] = useState(() => createBlankAppForm());

  return (
    <>
      <AppEditorFields
        form={form}
        setForm={setForm}
        categories={categories}
        descriptionIsAuto={false}
        onDescriptionChange={(description) =>
          setForm((current) => ({ ...current, description }))
        }
        preview={{
          data: null,
          loading: false,
          error: '',
          validUrl: false,
          refresh: () => undefined,
        }}
      />
      <output data-testid="form-state">{JSON.stringify(form)}</output>
    </>
  );
}

describe('AppEditorFields', () => {
  it('updates shared form fields and switches without page-specific handlers', async () => {
    const user = userEvent.setup();
    render(<EditorHarness />);

    await user.type(screen.getByLabelText('访问地址'), 'https://example.com');
    await user.type(screen.getByLabelText('系统名称'), 'Example');
    await user.type(screen.getByLabelText('描述'), 'Manual description');
    await user.selectOptions(screen.getByLabelText('分类'), '2');
    await user.click(screen.getByLabelText('前台显示'));

    const state = JSON.parse(screen.getByTestId('form-state').textContent || '{}');
    expect(state).toMatchObject({
      url: 'https://example.com',
      name: 'Example',
      description: 'Manual description',
      categoryId: 2,
      visible: false,
    });
  });
});
