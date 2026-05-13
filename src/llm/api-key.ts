import { useSyncExternalStore } from 'react';

export const API_KEY_STORAGE_KEY = 'mbse-workbench:anthropic-api-key';

const CHANGE_EVENT = 'mbse-workbench:api-key-change';

function defaultStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

export function readApiKey(storage: Storage | null = defaultStorage()): string | null {
  if (!storage) return null;
  const raw = storage.getItem(API_KEY_STORAGE_KEY);
  if (raw === null || raw === '') return null;
  return raw;
}

export function writeApiKey(
  key: string,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return;
  storage.setItem(API_KEY_STORAGE_KEY, key);
  notify();
}

export function clearApiKey(storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  storage.removeItem(API_KEY_STORAGE_KEY);
  notify();
}

function notify(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useApiKey(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readApiKey(),
    () => null,
  );
}

const OPEN_MODAL_EVENT = 'mbse-workbench:open-api-key-modal';

export function requestApiKeyModal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_MODAL_EVENT));
}

export function subscribeApiKeyModal(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(OPEN_MODAL_EVENT, callback);
  return () => window.removeEventListener(OPEN_MODAL_EVENT, callback);
}
