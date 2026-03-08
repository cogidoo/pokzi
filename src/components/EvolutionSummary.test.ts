import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EvolutionSummary from './EvolutionSummary.svelte';

describe('EvolutionSummary', () => {
  it('renders staged board with active current tile and type chips', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          {
            id: 172,
            displayName: 'Pichu',
            image: 'https://img/pichu.png',
            types: [{ name: 'Elektro' }],
          },
          {
            id: 25,
            displayName: 'Pikachu',
            image: 'https://img/pikachu.png',
            types: [{ name: 'Elektro' }, { name: 'Fee' }, { name: 'Flug' }],
          },
        ],
        branchGroups: [],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('heading', { name: 'Entwicklung' })).toBeInTheDocument();
    expect(screen.getByText('Aktuelle Stufe: Phase 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Entwicklungsstufen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phase 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phase 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zu Pikachu wechseln' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Elektro').length).toBeGreaterThan(0);
    expect(screen.getByText('Fee')).toBeInTheDocument();
    expect(screen.queryByText('Flug')).not.toBeInTheDocument();
    expect(screen.getByText('Keine Phase-2-Entwicklung')).toBeInTheDocument();
  });

  it('renders phase-2 groups for branch options and calls onSelect', async () => {
    const onSelect = vi.fn();
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [{ id: 133, displayName: 'Evoli', image: null, types: [{ name: 'Normal' }] }],
        branchGroups: [
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null, types: [{ name: 'Wasser' }] },
              { id: 700, displayName: 'Feelinara', image: null, types: [{ name: 'Fee' }] },
            ],
          },
          {
            originId: 133,
            items: [
              { id: 135, displayName: 'Blitza', image: 'https://img/blitza.png', types: [] },
              { id: 471, displayName: 'Glaziola', image: null, types: [{ name: 'Eis' }] },
            ],
          },
        ],
      },
      currentPokemonId: 133,
      onSelect,
    });

    expect(screen.getByText('Von Aquana')).toBeInTheDocument();
    expect(screen.getByText('Von Blitza')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Aquana wechseln' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Blitza wechseln' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Glaziola wechseln' }));
    expect(onSelect).toHaveBeenCalledWith(134);
    expect(onSelect).toHaveBeenCalledWith(135);
    expect(onSelect).toHaveBeenCalledWith(471);
  });

  it('handles current tile inside phase-2 stage', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 2',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
          { id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' },
          {
            id: 26,
            displayName: 'Raichu',
            image: 'https://img/raichu.png',
            types: [{ name: 'Elektro' }],
          },
        ],
        branchGroups: [],
      },
      currentPokemonId: 26,
      onSelect: vi.fn(),
    });

    expect(screen.queryByRole('button', { name: 'Zu Raichu wechseln' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Raichu').length).toBeGreaterThan(0);
  });

  it('renders image and type fallbacks for current and non-current tiles', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 2',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: null },
          { id: 25, displayName: 'Pikachu', image: null, types: [] },
          { id: 26, displayName: 'Raichu', image: null },
        ],
        branchGroups: [],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Raichu wechseln' })).toBeInTheDocument();
    expect(screen.getAllByText('Kein Bild').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Pikachu Typen')).not.toBeInTheDocument();
  });

  it('renders fallback image for current tile inside phase-2 groups', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 2',
        sharedPath: [{ id: 133, displayName: 'Evoli', image: null }],
        branchGroups: [
          {
            originId: 133,
            items: [
              { id: 135, displayName: 'Blitza', image: 'https://img/blitza.png' },
              { id: 471, displayName: 'Glaziola', image: null, types: [{ name: 'Eis' }] },
            ],
          },
        ],
      },
      currentPokemonId: 471,
      onSelect: vi.fn(),
    });

    expect(screen.queryByRole('button', { name: 'Zu Glaziola wechseln' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Kein Bild').length).toBeGreaterThan(0);
  });
});
