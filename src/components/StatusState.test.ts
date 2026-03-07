import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import StatusState from './StatusState.svelte';

describe('StatusState', () => {
  it('renders title and message', () => {
    render(StatusState, { title: 'Laden', message: 'Bitte warten' });

    expect(screen.getByRole('heading', { name: 'Laden' })).toBeInTheDocument();
    expect(screen.getByText('Bitte warten')).toBeInTheDocument();
  });

  it('renders action button and handles click', async () => {
    const onAction = vi.fn();
    render(StatusState, {
      title: 'Fehler',
      message: 'Bitte noch einmal versuchen',
      actionLabel: 'Erneut versuchen',
      onAction,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('hides action button when action props are missing', () => {
    render(StatusState, { title: 'Info', message: 'Keine Aktion verfügbar' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
