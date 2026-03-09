import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PokemonAttackList from './PokemonAttackList.svelte';

describe('PokemonAttackList', () => {
  it('renders all attacks with type and compact damage value', () => {
    render(PokemonAttackList, {
      attacks: [
        {
          name: 'Donnerschock',
          typeName: 'Elektro',
          damage: '40',
          description: 'Trifft das Ziel mit einem kurzen Elektroschock.',
        },
        {
          name: 'Ruckzuckhieb',
          typeName: 'Normal',
          damage: '30',
          description: 'Ein schneller Vorstoß, der oft zuerst trifft.',
        },
      ],
    });

    expect(screen.getByRole('list', { name: 'Alle Angriffe' })).toBeInTheDocument();
    expect(screen.getByText('Donnerschock')).toBeVisible();
    expect(screen.getByText('Elektro')).toBeVisible();
    expect(screen.getByText('40')).toBeVisible();
    expect(screen.getByText('Trifft das Ziel mit einem kurzen Elektroschock.')).toBeVisible();
    expect(screen.getByText('Ruckzuckhieb')).toBeVisible();
    expect(screen.getByText('30')).toBeVisible();
    expect(screen.getByText('Ein schneller Vorstoß, der oft zuerst trifft.')).toBeVisible();
  });

  it('hides the damage chip when no official damage is available', () => {
    render(PokemonAttackList, {
      attacks: [
        {
          name: 'Heuler',
          typeName: 'Normal',
          damage: null,
          description: 'Senkt den Angriffswert des Gegners.',
        },
      ],
    });

    expect(screen.getByText('Heuler')).toBeVisible();
    expect(screen.queryByText('Kein Schaden')).not.toBeInTheDocument();
  });

  it('shows an empty-state message when no attacks exist', () => {
    render(PokemonAttackList, { attacks: [] });

    expect(screen.getByText('Für dieses Pokemon sind keine Angriffe verfügbar.')).toBeVisible();
  });
});
