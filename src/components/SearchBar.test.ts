import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SearchBar from './SearchBar.svelte';

describe('SearchBar', () => {
  it('calls onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn();
    const { container } = render(SearchBar, { query: '', submitDisabled: false, onSubmit });
    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Search form not found');
    }

    await fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('clears the input when Clear is clicked', async () => {
    const onSubmit = vi.fn();
    render(SearchBar, { query: 'pikachu', submitDisabled: false, onSubmit });

    const input = screen.getByLabelText('Pokemon suchen');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Search input not found');
    }
    expect(input.value).toBe('pikachu');

    await fireEvent.click(screen.getByRole('button', { name: 'Suche leeren' }));
    expect(input.value).toBe('');
  });

  it('clears the input on touch pointer-down for reliable tap interaction', async () => {
    const onSubmit = vi.fn();
    render(SearchBar, { query: 'pikachu', submitDisabled: false, onSubmit });

    const input = screen.getByLabelText('Pokemon suchen');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Search input not found');
    }

    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Suche leeren' }), {
      pointerType: 'touch',
    });
    expect(input.value).toBe('');
  });

  it('clears the input on mouse pointer-down', async () => {
    const onSubmit = vi.fn();
    render(SearchBar, { query: 'pikachu', submitDisabled: false, onSubmit });

    const input = screen.getByLabelText('Pokemon suchen');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Search input not found');
    }

    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Suche leeren' }), {
      pointerType: 'mouse',
    });
    expect(input.value).toBe('');
  });

  it('disables submit button when submitDisabled prop is true', () => {
    const onSubmit = vi.fn();
    render(SearchBar, { query: '', submitDisabled: true, onSubmit });

    expect(screen.getByRole('button', { name: 'Suchen' })).toBeDisabled();
  });

  it('does not render helper text directly under the input', () => {
    const onSubmit = vi.fn();
    render(SearchBar, { query: '', onSubmit });

    expect(screen.queryByText(/Mindestens 2 Buchstaben/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pokemon suchen')).not.toHaveAttribute('aria-describedby');
  });

  it('disables autocorrect and capitalization helpers on the search input', () => {
    const onSubmit = vi.fn();
    render(SearchBar, { query: '', onSubmit });

    expect(screen.getByLabelText('Pokemon suchen')).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByLabelText('Pokemon suchen')).toHaveAttribute('autocorrect', 'off');
    expect(screen.getByLabelText('Pokemon suchen')).toHaveAttribute('autocapitalize', 'off');
    expect(screen.getByLabelText('Pokemon suchen')).toHaveAttribute('spellcheck', 'false');
  });
});
