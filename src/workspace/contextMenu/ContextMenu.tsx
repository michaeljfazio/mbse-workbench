import { useCallback, useEffect, useRef, useState } from 'react';

import type { NavTarget } from './navTargets';

export interface ContextMenuProps {
  readonly x: number;
  readonly y: number;
  readonly targets: readonly NavTarget[];
  readonly onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  targets,
  onClose,
}: ContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    return () => {
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const activate = useCallback(
    (target: NavTarget) => {
      target.perform();
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, targets.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setFocusIndex(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setFocusIndex(targets.length - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = targets[focusIndex];
        if (target) activate(target);
      }
    };
    const onPointerDown = (e: PointerEvent): void => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onClose, targets, focusIndex, activate]);

  useEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]',
    );
    items?.[focusIndex]?.focus();
  }, [focusIndex]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Element navigation menu"
      data-testid="element-context-menu"
      style={{ left: x, top: y }}
      className="absolute z-30 flex w-64 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-lg"
    >
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Navigate
      </p>
      {targets.map((target, idx) => (
        <button
          key={target.id}
          role="menuitem"
          type="button"
          tabIndex={idx === focusIndex ? 0 : -1}
          data-testid={`context-menu-${target.id}`}
          onClick={() => activate(target)}
          className="flex flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
        >
          <span className="font-medium text-foreground">{target.label}</span>
          {target.description ? (
            <span className="text-xs text-foreground/75">
              {target.description}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
