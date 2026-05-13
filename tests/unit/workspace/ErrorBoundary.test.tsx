import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ErrorBoundary } from '@/workspace/ErrorBoundary';

function Boom({ on }: { readonly on: boolean }): JSX.Element {
  if (on) throw new Error('kaboom');
  return <div data-testid="boom-child">ok</div>;
}

describe('ErrorBoundary', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs the boundary catch via console.error; silence it so the test
    // output stays clean. The boundary's own console.error is fine to silence
    // along with it.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary boundaryId="t" label="Test">
        <Boom on={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('boom-child')).toBeInTheDocument();
  });

  it('renders the fallback with the error message when a child throws', () => {
    render(
      <ErrorBoundary boundaryId="canvas" label="Diagram canvas">
        <Boom on={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-canvas')).toHaveTextContent(
      /Diagram canvas failed to render/i,
    );
    expect(screen.getByTestId('error-boundary-canvas-message')).toHaveTextContent(
      'kaboom',
    );
    expect(screen.getByTestId('error-boundary-canvas-reset')).toBeInTheDocument();
  });

  it('resets after the reset button is clicked if the child no longer throws', () => {
    function Harness(): JSX.Element {
      const [on, setOn] = useState(true);
      return (
        <div>
          <button
            type="button"
            data-testid="fix"
            onClick={() => setOn(false)}
          >
            fix
          </button>
          <ErrorBoundary boundaryId="x" label="X">
            <Boom on={on} />
          </ErrorBoundary>
        </div>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId('error-boundary-x')).toBeInTheDocument();
    // First fix the child so it stops throwing, then ask the boundary to reset.
    fireEvent.click(screen.getByTestId('fix'));
    fireEvent.click(screen.getByTestId('error-boundary-x-reset'));
    expect(screen.getByTestId('boom-child')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary-x')).not.toBeInTheDocument();
  });
});
