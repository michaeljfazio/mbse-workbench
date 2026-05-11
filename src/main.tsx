import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { createSessionUser } from './collab';
import { createInMemorySessionRepository } from './repository';
import { useWorkspaceStore } from './workspace';

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
