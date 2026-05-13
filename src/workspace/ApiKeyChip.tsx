import { requestApiKeyModal, useApiKey } from '@/llm/api-key';

export function ApiKeyChip(): JSX.Element {
  const apiKey = useApiKey();
  const present = apiKey !== null;
  return (
    <button
      type="button"
      data-testid="api-key-chip"
      data-state={present ? 'present' : 'absent'}
      aria-label={
        present
          ? 'Anthropic API key is set. Click to re-enter or clear.'
          : 'Anthropic API key is not set. Click to enter one.'
      }
      onClick={() => requestApiKeyModal()}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        present
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          present ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      <span>API key {present ? 'set' : 'missing'}</span>
    </button>
  );
}
