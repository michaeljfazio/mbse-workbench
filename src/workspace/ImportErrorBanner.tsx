import { useWorkspaceStore } from './store';

export function ImportErrorBanner(): JSX.Element | null {
  const importError = useWorkspaceStore((s) => s.importError);
  const clearImportError = useWorkspaceStore((s) => s.clearImportError);
  if (!importError) return null;
  return (
    <div
      data-testid="import-error-banner"
      role="alert"
      aria-live="assertive"
      className="flex h-8 shrink-0 items-center justify-between gap-3 border-b border-red-300 bg-red-50 px-3 text-xs text-red-900"
    >
      <span data-testid="import-error-banner-text">
        Import failed at line {importError.line}, column {importError.col}:{' '}
        <span className="font-semibold">{importError.message}</span>
      </span>
      <button
        type="button"
        data-testid="import-error-banner-dismiss"
        onClick={clearImportError}
        className="rounded border border-red-400 bg-white px-2 py-0.5 font-medium text-red-900 transition hover:bg-red-100"
      >
        Dismiss
      </button>
    </div>
  );
}
