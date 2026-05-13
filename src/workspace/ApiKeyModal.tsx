import { useEffect, useRef, useState } from 'react';

import { clearApiKey, writeApiKey } from '@/llm/api-key';

export interface ApiKeyModalProps {
  readonly onClose: () => void;
}

export function ApiKeyModal({ onClose }: ApiKeyModalProps): JSX.Element {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = 'api-key-modal-heading';
  const descId = 'api-key-modal-description';

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed === '') return;
    writeApiKey(trimmed);
    onClose();
  };

  const clear = () => {
    clearApiKey();
    onClose();
  };

  return (
    <div
      role="presentation"
      data-testid="api-key-modal-backdrop"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descId}
        data-testid="api-key-modal"
        className="w-[28rem] max-w-[90vw] rounded-lg border border-border bg-background p-5 shadow-xl"
      >
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          Anthropic API key
        </h2>
        <p id={descId} className="mt-1 text-xs text-muted-foreground">
          Required to use chat. Stored only in this browser tab (sessionStorage)
          and cleared when the tab closes. It is never logged or sent anywhere
          but Anthropic.
        </p>
        <label htmlFor="api-key-input" className="sr-only">
          API key
        </label>
        <input
          ref={inputRef}
          id="api-key-input"
          data-testid="api-key-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="sk-ant-..."
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="api-key-clear"
            onClick={clear}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Clear
          </button>
          <button
            type="button"
            data-testid="api-key-cancel"
            onClick={onClose}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="api-key-save"
            onClick={submit}
            disabled={value.trim() === ''}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
