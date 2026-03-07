<script lang="ts">
  /*
   * Search input component with submit and clear actions.
   * It emits the current query through the `onSubmit` callback owned by the parent.
   */

  /**
   * Props for the search bar component.
   */
  interface Props {
    query?: string;
    submitDisabled?: boolean;
    compact?: boolean;
    onSubmit: () => void;
  }

  let {
    query = $bindable(''),
    submitDisabled = false,
    compact = false,
    onSubmit,
  }: Props = $props();

  /**
   * Forwards form submit events to the parent callback.
   *
   * @param event - Submit event from the search form.
   */
  function submit(event: Event) {
    event.preventDefault();
    onSubmit();
  }

  /**
   * Clears the current query text.
   */
  function clearQuery() {
    query = '';
  }
</script>

<form class={`search ${compact ? 'search--compact' : ''}`} onsubmit={submit}>
  <label class="search__label" for="pokemon-search">Pokemon suchen</label>
  <div class="search__controls">
    <div class="search__input-wrap">
      <input
        id="pokemon-search"
        class="search__input"
        bind:value={query}
        placeholder="z. B. &quot;schiggy&quot; oder &quot;7&quot;"
        type="search"
        inputmode="search"
        enterkeyhint="search"
        autocomplete="off"
        spellcheck="false"
        aria-describedby={compact ? undefined : 'search-help'}
      />
      {#if query.length > 0}
        <button class="search__clear" type="button" onclick={clearQuery} aria-label="Suche leeren">
          Löschen
        </button>
      {/if}
    </div>
    <button class="search__submit" type="submit" disabled={submitDisabled}>Suchen</button>
  </div>
  {#if !compact}
    <p id="search-help" class="search__help">
      Mindestens 2 Buchstaben eines deutschen Namens oder 1+ Ziffern für ID-Suche.
    </p>
  {/if}
</form>
