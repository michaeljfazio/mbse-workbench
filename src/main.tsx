import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@xyflow/react/dist/style.css';
import { createSessionUser } from './collab';
import { createInMemorySessionRepository } from './repository';
import { useWorkspaceStore } from './workspace';
import { createFixtureProvider, createMultiRoundFixtureProvider, setChatProviderOverride } from './llm';

// Expose test seams on window so Playwright e2e specs can inject a
// FixtureProvider without hitting the real Anthropic API.
// Only available in development builds (import.meta.env.DEV).
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  (window as unknown as Record<string, unknown>)['__llm'] = {
    createFixtureProvider,
    createMultiRoundFixtureProvider,
    setChatProviderOverride,
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const repository = createInMemorySessionRepository();
const user = createSessionUser();

void useWorkspaceStore.getState().bootstrap({ repository, user });

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
