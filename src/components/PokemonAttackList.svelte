<script lang="ts">
  import type { PokemonDetailedAttack } from '../types/pokemon';

  /**
   * Input contract for the full move list in the detail view.
   */
  interface PokemonAttackListProps {
    attacks: PokemonDetailedAttack[];
  }

  const { attacks }: PokemonAttackListProps = $props();
</script>

{#if attacks.length > 0}
  <ul class="attack-list" aria-label="Alle Angriffe">
    {#each attacks as attack (`${attack.name}-${attack.typeName}-${attack.damage ?? 'none'}`)}
      <li class="attack-list__item">
        <p class="attack-list__name">{attack.name}</p>
        <p class="attack-list__description">{attack.description}</p>
        <p class="attack-list__meta">
          <span class="attack-list__type">{attack.typeName}</span>
          {#if attack.damage !== null}
            <span class="attack-list__damage" aria-label={`Schaden ${attack.damage}`}
              >{attack.damage}</span
            >
          {/if}
        </p>
      </li>
    {/each}
  </ul>
{:else}
  <p class="attack-list__empty">Für dieses Pokemon sind keine Angriffe verfügbar.</p>
{/if}
