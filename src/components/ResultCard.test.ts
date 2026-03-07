import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ResultCard from './ResultCard.svelte';

describe('ResultCard', () => {
  it('renders pokemon details and formatted id', () => {
    render(ResultCard, {
      pokemon: {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }, { name: 'Fee' }],
        evolutionStage: 'Phase 1',
      },
    });

    expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    expect(screen.getByText('#025')).toBeInTheDocument();
    expect(screen.getByText('Stufe')).toBeInTheDocument();
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Elektro')).toBeInTheDocument();
    expect(screen.getByText('Fee')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pikachu' })).toBeInTheDocument();
  });

  it('shows image fallback when image is missing', () => {
    render(ResultCard, {
      pokemon: {
        id: 7,
        name: 'squirtle',
        displayName: 'Schiggy',
        image: null,
        types: [{ name: 'water' }],
        evolutionStage: 'Basis',
      },
    });

    expect(screen.getByText('Kein Bild')).toBeInTheDocument();
  });

  it('renders phase-2 stage style for fully evolved pokemon', () => {
    const { container } = render(ResultCard, {
      pokemon: {
        id: 6,
        name: 'charizard',
        displayName: 'Glurak',
        image: 'https://img/charizard.png',
        types: [{ name: 'Feuer' }, { name: 'Flug' }],
        evolutionStage: 'Phase 2',
      },
    });

    const stageChip = container.querySelector('.meta-chip--stage');
    expect(stageChip).toHaveClass('meta-chip--phase-2');
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });

  it('calls onSelect with pokemon id when card is activated', async () => {
    const onSelect = vi.fn();
    render(ResultCard, {
      pokemon: {
        id: 25,
        name: 'pikachu',
        displayName: 'Pikachu',
        image: 'https://img/pikachu.png',
        types: [{ name: 'Elektro' }],
        evolutionStage: 'Phase 1',
      },
      onSelect,
    });

    await fireEvent.click(screen.getByRole('button', { name: /Pikachu/i }));
    expect(onSelect).toHaveBeenCalledWith(25);
  });
});
