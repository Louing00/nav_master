// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppIcon from './AppIcon';

describe('AppIcon', () => {
  it('prefers the manual icon URL', () => {
    const { container } = render(
      <AppIcon
        app={{
          name: 'Example',
          icon: 'EX',
          iconUrl: 'https://example.com/manual.png',
          resolvedIconUrl: 'https://example.com/automatic.png',
        }}
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/manual.png',
    );
  });

  it('falls back from a broken manual URL to the manual text icon', () => {
    const { container } = render(
      <AppIcon
        app={{
          name: 'Example',
          icon: 'EX',
          iconUrl: 'https://example.com/broken.png',
          resolvedIconUrl: 'https://example.com/automatic.png',
        }}
      />,
    );

    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByText('EX')).toBeInTheDocument();
  });

  it('uses the resolved icon when there is no manual icon', () => {
    const { container } = render(
      <AppIcon
        app={{
          name: 'Example',
          icon: '',
          iconUrl: '',
          resolvedIconUrl: 'https://example.com/automatic.png',
        }}
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/automatic.png',
    );
  });
});
