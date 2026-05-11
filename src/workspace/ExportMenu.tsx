import { useCallback, useEffect, useRef, useState } from 'react';

export interface ExportMenuProps {
  readonly disabled: boolean;
  readonly onExportPng: () => void;
  readonly onExportSvg: () => void;
}

export function ExportMenu({
  disabled,
  onExportPng,
  onExportSvg,
}: ExportMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        data-testid="toolbar-export"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export
        <span aria-hidden="true" className="text-[10px]">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Export diagram"
          data-testid="toolbar-export-menu"
          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border border-border bg-card text-xs shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            data-testid="toolbar-export-png"
            onClick={() => {
              close();
              onExportPng();
            }}
            className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
          >
            Export PNG
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="toolbar-export-svg"
            onClick={() => {
              close();
              onExportSvg();
            }}
            className="block w-full px-3 py-2 text-left text-foreground transition hover:bg-accent"
          >
            Export SVG
          </button>
        </div>
      ) : null}
    </div>
  );
}
