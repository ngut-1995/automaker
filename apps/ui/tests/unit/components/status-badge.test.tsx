import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  StatusBadge,
  getStatusLabel,
  getStatusOrder,
} from '../../../src/components/views/board-view/components/list-view/status-badge';
import type { FeatureStatus } from '@automaker/types';

describe('StatusBadge', () => {
  it('renders a known status from the presentation map', () => {
    render(<StatusBadge status="backlog" />);

    const badge = screen.getByTestId('status-badge-backlog');
    expect(badge).toHaveTextContent('Backlog');
    expect(badge.className).toContain('text-[var(--status-backlog)]');
  });

  it('renders a fallback label and colour for a status the presentation map does not know', () => {
    const unknown = 'archived_legacy' as FeatureStatus;

    render(<StatusBadge status={unknown} />);

    const badge = screen.getByTestId(`status-badge-${unknown}`);
    expect(badge).toHaveTextContent('archived legacy');
    expect(badge.className).toContain('text-muted-foreground');
    expect(badge.className).toContain('bg-muted/50');
    expect(getStatusLabel(unknown)).toBe('archived legacy');
    expect(getStatusOrder(unknown)).toBe(0);
  });

  it('renders an unknown pipeline status from its step id', () => {
    const status = 'pipeline_security_scan' as FeatureStatus;

    render(<StatusBadge status={status} />);

    expect(screen.getByTestId(`status-badge-${status}`)).toHaveTextContent('security scan');
  });
});
