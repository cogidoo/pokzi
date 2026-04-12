import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PokemonArtworkCard from './PokemonArtworkCard.svelte';

describe('PokemonArtworkCard', () => {
  it('renders the artwork when an image is available', () => {
    render(PokemonArtworkCard, {
      displayName: 'Pikachu',
      image: 'https://img/pikachu-art.png',
    });

    expect(screen.getByAltText('Pikachu')).toBeInTheDocument();
  });

  it('shows a fallback message when no image is available', () => {
    render(PokemonArtworkCard, {
      displayName: 'Mew',
      image: null,
    });

    expect(screen.getByText('Kein Bild')).toBeVisible();
  });
});
