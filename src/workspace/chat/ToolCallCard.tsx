import { useState } from 'react';
import type { LLMToolResultBlock, LLMToolUseBlock } from '@/llm/types';

interface ToolUseCardProps {
  readonly block: LLMToolUseBlock;
}

export function ToolUseCard({ block }: ToolUseCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid="tool-use-card"
      data-tool-name={block.name}
      className="my-1 rounded border border-border bg-muted/50 text-xs"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="font-mono font-medium">{block.name}</span>
        <span className="ml-auto text-muted-foreground/60">tool call</span>
      </button>
      {expanded && (
        <pre
          data-testid="tool-use-input"
          className="overflow-x-auto border-t border-border px-2 py-1 font-mono text-[11px] text-foreground"
        >
          {JSON.stringify(block.input, null, 2)}
        </pre>
      )}
    </div>
  );
}

interface ToolResultCardProps {
  readonly block: LLMToolResultBlock;
}

export function ToolResultCard({ block }: ToolResultCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isError = block.is_error === true;

  return (
    <div
      data-testid="tool-result-card"
      data-tool-use-id={block.tool_use_id}
      data-is-error={isError ? 'true' : undefined}
      className={`my-1 rounded border text-xs ${
        isError
          ? 'border-destructive/40 bg-destructive/10'
          : 'border-border bg-muted/30'
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className={isError ? 'text-destructive' : 'text-muted-foreground'}>
          {isError ? 'tool error' : 'tool result'}
        </span>
      </button>
      {expanded && (
        <pre
          data-testid="tool-result-content"
          className="overflow-x-auto border-t border-border px-2 py-1 font-mono text-[11px] text-foreground"
        >
          {block.content}
        </pre>
      )}
    </div>
  );
}
