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
    onFocusChange?: (focused: boolean) => void;
    onSubmit: () => void;
  }

  let {
    query = $bindable(''),
    submitDisabled = false,
    compact = false,
    onFocusChange,
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

  /**
   * Handles touch/pen interaction early so clear remains reliable during scrolling.
   *
   * @param event - Pointer down event on the clear button.
   */
  function clearQueryOnPointerDown(event: PointerEvent) {
    event.preventDefault();
    clearQuery();
  }

  /**
   * Notifies the parent when the search input focus changes.
   *
   * @param focused - Current focus state of the search input.
   */
  function updateFocusState(focused: boolean) {
    onFocusChange?.(focused);
  }
</script>

<form class={`search ${compact ? 'search--compact' : ''}`} onsubmit={submit}>
  <label class="search__label visually-hidden" for="pokemon-search">Pokemon suchen</label>
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
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        onfocus={() => {
          updateFocusState(true);
        }}
        onblur={() => {
          updateFocusState(false);
        }}
        aria-describedby={compact ? undefined : 'search-help'}
      />
      {#if query.length > 0}
        <button
          class="search__clear"
          type="button"
          onpointerdown={clearQueryOnPointerDown}
          onclick={clearQuery}
          aria-label="Suche leeren"
        >
          <svg class="search__icon search__icon--clear" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7L17 17" />
            <path d="M17 7L7 17" />
          </svg>
        </button>
      {/if}
    </div>
    <button class="search__submit" type="submit" disabled={submitDisabled}>
      <svg class="search__icon search__icon--search" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="5.5" />
        <path d="M15.5 15.5L19 19" />
      </svg>
      <span>Suchen</span>
    </button>
  </div>
  {#if !compact}
    <p id="search-help" class="search__help">
      Mindestens 2 Buchstaben eines deutschen Namens oder 1+ Ziffern für ID-Suche.
    </p>
  {/if}
</form>
