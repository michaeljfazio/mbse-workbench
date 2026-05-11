import { useEffect, useMemo, useState } from 'react';

import type { ElementId, ModelElement } from '@/model';
import { useWorkspaceStore } from '../store';

function findElement(
  elements: readonly ModelElement[],
  id: ElementId | undefined,
): ModelElement | undefined {
  if (!id) return undefined;
  return elements.find((e) => e.id === id);
}

export function Inspector(): JSX.Element {
  const selectedIds = useWorkspaceStore((s) => s.selectedElementIds);
  const elements = useWorkspaceStore((s) => s.elements);
  const renameElement = useWorkspaceStore((s) => s.renameElement);
  const setElementDescription = useWorkspaceStore((s) => s.setElementDescription);

  if (selectedIds.length === 0) {
    return (
      <p
        data-testid="inspector-empty"
        className="text-muted-foreground"
      >
        Select an element to edit its properties.
      </p>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <p data-testid="inspector-multi" className="text-muted-foreground">
        {selectedIds.length} elements selected
      </p>
    );
  }

  const id = selectedIds[0]!;
  const element = findElement(elements, id);
  if (!element) {
    return (
      <p data-testid="inspector-missing" className="text-muted-foreground">
        Selected element no longer exists.
      </p>
    );
  }

  return (
    <InspectorSingle
      element={element}
      onCommitName={(name) => renameElement(element.id, name)}
      onCommitDescription={(desc) => setElementDescription(element.id, desc)}
    />
  );
}

interface InspectorSingleProps {
  readonly element: ModelElement;
  readonly onCommitName: (name: string) => void;
  readonly onCommitDescription: (description: string) => void;
}

function InspectorSingle({
  element,
  onCommitName,
  onCommitDescription,
}: InspectorSingleProps): JSX.Element {
  const [nameDraft, setNameDraft] = useState(element.name);
  const [descriptionDraft, setDescriptionDraft] = useState(
    element.documentation ?? '',
  );

  // Reset drafts when the selected element or its committed values change
  // externally (e.g. inline rename in BlockNode, undo/redo).
  useEffect(() => {
    setNameDraft(element.name);
  }, [element.id, element.name]);
  useEffect(() => {
    setDescriptionDraft(element.documentation ?? '');
  }, [element.id, element.documentation]);

  const nameId = useMemo(() => `inspector-name-${element.id}`, [element.id]);
  const descId = useMemo(() => `inspector-description-${element.id}`, [element.id]);

  const commitName = (): void => {
    const trimmed = nameDraft.trim();
    if (trimmed.length === 0) {
      setNameDraft(element.name);
      return;
    }
    if (trimmed !== element.name) {
      onCommitName(trimmed);
    }
  };

  const commitDescription = (): void => {
    if (descriptionDraft !== (element.documentation ?? '')) {
      onCommitDescription(descriptionDraft);
    }
  };

  return (
    <div
      data-testid="inspector-single"
      data-element-id={element.id}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {element.kind}
        </span>
        <span className="text-sm font-medium text-foreground">
          Properties
        </span>
      </header>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={nameId}
          className="text-xs font-medium text-muted-foreground"
        >
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={nameDraft}
          data-testid="inspector-name"
          required
          aria-required="true"
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setNameDraft(element.name);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={descId}
          className="text-xs font-medium text-muted-foreground"
        >
          Description
        </label>
        <textarea
          id={descId}
          value={descriptionDraft}
          data-testid="inspector-description"
          rows={4}
          onChange={(e) => setDescriptionDraft(e.target.value)}
          onBlur={commitDescription}
          className="resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Owner
        </span>
        <span
          data-testid="inspector-owner"
          className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
        >
          {element.ownerId ?? 'unassigned'}
        </span>
      </div>
    </div>
  );
}
