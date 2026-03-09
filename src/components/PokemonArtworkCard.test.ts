import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PokemonArtworkCard from './PokemonArtworkCard.svelte';

describe('PokemonArtworkCard', () => {
  it('renders artwork first and flips to the attack back side on click', async () => {
    render(PokemonArtworkCard, {
      displayName: 'Pikachu',
      image: 'https://img/pikachu-art.png',
      attacks: [
        { name: 'Donnerschock', damage: '40', typeName: 'Elektro' },
        { name: 'Ruckzuckhieb', damage: '30', typeName: 'Normal' },
      ],
    });

    const card = screen.getByRole('button', { name: 'Angriffe von Pikachu zeigen' });
    expect(screen.getByAltText('Pikachu')).toBeInTheDocument();

    await fireEvent.click(card);

    expect(screen.getByRole('button', { name: 'Pikachu-Bild zeigen' })).toBeInTheDocument();
    expect(screen.getByText('Donnerschock')).toBeVisible();
    expect(screen.getByText('40 Schaden')).toBeVisible();
    expect(screen.getByText('Elektro')).toBeVisible();
    expect(screen.getByText('Ruckzuckhieb')).toBeVisible();
  });

  it('shows a fallback message when no suitable attacks are available', async () => {
    render(PokemonArtworkCard, {
      displayName: 'Mew',
      image: null,
      attacks: [],
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Angriffe von Mew zeigen' }));

    expect(screen.getByText('Keine passenden Angriffe gefunden.')).toBeVisible();
  });

  it('flips back to the artwork when tapped a second time', async () => {
    render(PokemonArtworkCard, {
      displayName: 'Pikachu',
      image: 'https://img/pikachu-art.png',
      attacks: [{ name: 'Donnerschock', damage: '40', typeName: 'Elektro' }],
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Angriffe von Pikachu zeigen' }));
    expect(screen.getByRole('button', { name: 'Pikachu-Bild zeigen' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Pikachu-Bild zeigen' }));

    expect(screen.getByRole('button', { name: 'Angriffe von Pikachu zeigen' })).toBeInTheDocument();
  });
});
