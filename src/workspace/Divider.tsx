import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type DividerSide = 'left' | 'right';

export interface DividerProps {
  readonly side: DividerSide;
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly controlsId: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly label: string;
  onChange(px: number): void;
}

const STEP_PX = 16;

export function Divider(props: DividerProps): JSX.Element {
  const { side, containerRef, controlsId, value, min, max, label, onChange } =
    props;
  const [dragging, setDragging] = useState(false);
  const lastValueRef = useRef(value);
  lastValueRef.current = value;

  const computeWidth = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return lastValueRef.current;
      const rect = container.getBoundingClientRect();
      return side === 'left' ? clientX - rect.left : rect.right - clientX;
    },
    [containerRef, side],
  );

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent): void {
      onChange(computeWidth(e.clientX));
    }

    function onUp(): void {
      setDragging(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, computeWidth, onChange]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = side === 'left' ? -STEP_PX : STEP_PX;
    else if (e.key === 'ArrowRight') delta = side === 'left' ? STEP_PX : -STEP_PX;
    else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
      return;
    }
    if (delta === 0) return;
    e.preventDefault();
    onChange(lastValueRef.current + delta);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-controls={controlsId}
      aria-label={label}
      tabIndex={0}
      data-testid={`divider-${side}`}
      data-dragging={dragging ? 'true' : 'false'}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
      }}
      onKeyDown={onKeyDown}
      className={`relative w-1.5 shrink-0 cursor-col-resize bg-border transition hover:bg-primary/30 focus:outline-none focus-visible:bg-primary/40 ${
        dragging ? 'bg-primary/40' : ''
      }`}
    />
  );
}
