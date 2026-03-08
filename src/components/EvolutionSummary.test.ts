import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EvolutionSummary from './EvolutionSummary.svelte';

describe('EvolutionSummary', () => {
  it('renders stage shell and forwards selectable tiles', async () => {
    const onSelect = vi.fn();
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: 'https://img/pichu.png' },
          { id: 25, displayName: 'Pikachu', image: 'https://img/pikachu.png' },
        ],
        branchGroups: [],
      },
      currentPokemonId: 25,
      onSelect,
    });

    expect(screen.getByRole('heading', { name: 'Entwicklung' })).toBeInTheDocument();
    expect(screen.getByText('Aktuelle Stufe: Phase 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Entwicklungsstufen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phase 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phase 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Pichu wechseln' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zu Pikachu wechseln' })).not.toBeInTheDocument();
    expect(screen.getByText('Keine Phase-2-Entwicklung')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Zu Pichu wechseln' }));
    expect(onSelect).toHaveBeenCalledWith(172);
  });

  it('renders grouped phase-2 origins for branching evolutions', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [{ id: 133, displayName: 'Evoli', image: null }],
        branchGroups: [
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null },
              { id: 700, displayName: 'Feelinara', image: null },
            ],
          },
          {
            originId: 133,
            items: [
              { id: 135, displayName: 'Blitza', image: null },
              { id: 471, displayName: 'Glaziola', image: null },
            ],
          },
        ],
      },
      currentPokemonId: 133,
      onSelect: vi.fn(),
    });

    expect(screen.getByText('Von Aquana')).toBeInTheDocument();
    expect(screen.getByText('Von Blitza')).toBeInTheDocument();
  });

  it('handles empty shared path with phase-2-only groups', async () => {
    const onSelect = vi.fn();
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [],
        branchGroups: [
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null },
              { id: 700, displayName: 'Feelinara', image: null },
            ],
          },
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null },
              { id: 471, displayName: 'Glaziola', image: null },
            ],
          },
        ],
      },
      currentPokemonId: 700,
      onSelect,
    });

    expect(screen.queryByText('Von Aquana')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zu Aquana wechseln' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Zu Glaziola wechseln' }));
    expect(onSelect).toHaveBeenCalledWith(471);
  });

  it('deduplicates repeated phase-1 roots when shared path has one entry', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [{ id: 133, displayName: 'Evoli', image: null }],
        branchGroups: [
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null },
              { id: 700, displayName: 'Feelinara', image: null },
            ],
          },
          {
            originId: 133,
            items: [
              { id: 134, displayName: 'Aquana', image: null },
              { id: 471, displayName: 'Glaziola', image: null },
            ],
          },
        ],
      },
      currentPokemonId: 133,
      onSelect: vi.fn(),
    });

    expect(screen.getAllByRole('button', { name: 'Zu Aquana wechseln' })).toHaveLength(1);
  });

  it('uses direct shared-path phase-2 mapping when shared path has three entries', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 2',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: null },
          { id: 25, displayName: 'Pikachu', image: null },
          { id: 26, displayName: 'Raichu', image: null },
        ],
        branchGroups: [],
      },
      currentPokemonId: 26,
      onSelect: vi.fn(),
    });

    expect(screen.queryByText('Von Pikachu')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zu Raichu wechseln' })).not.toBeInTheDocument();
  });

  it('uses branch-group first items as phase-2 options when shared path has two entries', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Phase 1',
        sharedPath: [
          { id: 172, displayName: 'Pichu', image: null },
          { id: 25, displayName: 'Pikachu', image: null },
        ],
        branchGroups: [
          {
            originId: 25,
            items: [{ id: 26, displayName: 'Raichu', image: null }],
          },
          {
            originId: 25,
            items: [{ id: 181, displayName: 'Ampharos', image: null }],
          },
        ],
      },
      currentPokemonId: 25,
      onSelect: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Zu Raichu wechseln' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Ampharos wechseln' })).toBeInTheDocument();
  });

  it('ignores branch groups that do not contain a phase-2 item', () => {
    render(EvolutionSummary, {
      evolution: {
        stage: 'Basis',
        sharedPath: [],
        branchGroups: [
          {
            originId: 133,
            items: [{ id: 134, displayName: 'Aquana', image: null }],
          },
          {
            originId: 133,
            items: [
              { id: 135, displayName: 'Blitza', image: null },
              { id: 471, displayName: 'Glaziola', image: null },
            ],
          },
        ],
      },
      currentPokemonId: 133,
      onSelect: vi.fn(),
    });

    expect(screen.queryByRole('button', { name: 'Zu Aquana wechseln' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zu Glaziola wechseln' })).toBeInTheDocument();
  });
});
