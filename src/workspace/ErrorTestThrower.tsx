declare global {
  interface Window {
    __WORKSPACE_FORCE_ERROR__?: string;
  }
}

/**
 * Test-only hook: when `window.__WORKSPACE_FORCE_ERROR__` matches the given
 * boundaryId, throws on render so the enclosing <ErrorBoundary> can be
 * exercised by Playwright. The flag is unset by default and is never written
 * by production code, so this component is a no-op outside tests.
 */
export function ErrorTestThrower({ boundaryId }: { readonly boundaryId: string }): null {
  if (typeof window !== 'undefined' && window.__WORKSPACE_FORCE_ERROR__ === boundaryId) {
    throw new Error(`forced error in ${boundaryId}`);
  }
  return null;
}
