// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AppCard from './AppCard';
import type { NavApp } from '../types/app';

const app: NavApp = {
  id: 1,
  name: '邻渡',
  url: 'https://lindu.example.com',
  description: '局域网文件传输与近场协作系统，面向快速投递、设备互传和临时共享。',
  icon: '⇆',
  iconUrl: null,
  resolvedIconUrl: null,
  tags: ['文件传输'],
  openInNewTab: true,
  healthStatus: 'unknown',
};

describe('AppCard', () => {
  it('shows the site description through the card tooltip contract', () => {
    render(<AppCard app={app} />);

    const card = screen.getByRole('link', { name: /邻渡/ });
    expect(card).toHaveAttribute('data-tooltip', app.description);
    expect(card).toHaveAttribute('data-tooltip-variant', 'description');
  });

  it('keeps the description tooltip available in compact mode', () => {
    render(<AppCard app={app} compact />);

    const card = screen.getByRole('link', { name: /邻渡/ });
    expect(card).toHaveAttribute('data-tooltip', app.description);
    expect(card).toHaveAttribute('data-tooltip-variant', 'description');
  });

  it('lets mobile users expand the description without opening the link', async () => {
    const user = userEvent.setup();
    const description = app.description ?? '';
    render(<AppCard app={app} compact />);

    const button = screen.getByRole('button', { name: '查看简介' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(button.getAttribute('aria-controls') || '')).toHaveTextContent(description);
  });
});
