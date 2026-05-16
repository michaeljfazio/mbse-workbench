import { useWorkspaceStore } from './store';

/**
 * Banner surfacing the most-recent command-bus rejection (e.g.
 * `LibraryViolationError` from a mutation against a read-only library
 * subtree). Mirrors the `ImportErrorBanner` pattern — there is no toast
 * primitive in the codebase, and ADR 0012 elects to reuse the existing
 * banner shape rather than introduce one. The banner is dismissable;
 * future rejections overwrite the message.
 */
export function CommandErrorBanner(): JSX.Element | null {
  const commandError = useWorkspaceStore((s) => s.commandError);
  const clearCommandError = useWorkspaceStore((s) => s.clearCommandError);
  if (!commandError) return null;
  return (
    <div
      data-testid="command-error-banner"
      role="alert"
      aria-live="assertive"
      className="flex h-8 shrink-0 items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-3 text-xs text-amber-900"
    >
      <span data-testid="command-error-banner-text">
        {commandError.message}
      </span>
      <button
        type="button"
        data-testid="command-error-banner-dismiss"
        onClick={clearCommandError}
        className="rounded border border-amber-400 bg-white px-2 py-0.5 font-medium text-amber-900 transition hover:bg-amber-100"
      >
        Dismiss
      </button>
    </div>
  );
}
