import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommandPaletteStub } from '@/workspace/CommandPaletteStub';

describe('CommandPaletteStub', () => {
  it('renders the dialog with the disabled search input and a close button', () => {
    render(<CommandPaletteStub onClose={() => {}} />);
    const dialog = screen.getByTestId('command-palette-stub');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByTestId('command-palette-stub-input');
    expect(input).toBeDisabled();
    expect(screen.getByTestId('command-palette-stub-close')).toBeInTheDocument();
  });

  it('invokes onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    render(<CommandPaletteStub onClose={onClose} />);
    fireEvent.click(screen.getByTestId('command-palette-stub-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<CommandPaletteStub onClose={onClose} />);
    fireEvent.click(screen.getByTestId('command-palette-stub'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
