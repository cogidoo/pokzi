<script lang="ts">
  /*
   * Reusable status panel for idle, loading, empty, and error feedback.
   * Optionally renders a single recovery action button.
   */

  /**
   * Props for rendering a status message block.
   */
  interface Props {
    title: string;
    message: string;
    actionLabel?: string | null;
    onAction?: (() => void) | null;
    tone?: 'neutral' | 'info' | 'warning' | 'error';
  }

  let { title, message, actionLabel = null, onAction = null, tone = 'neutral' }: Props = $props();
</script>

<section class={`state state--${tone}`} role="status" aria-live="polite">
  <h2 class="state__title">{title}</h2>
  <p class="state__message">{message}</p>
  {#if actionLabel && onAction}
    <button class="state__action" type="button" onclick={onAction}>{actionLabel}</button>
  {/if}
</section>
