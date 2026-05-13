import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  API_KEY_STORAGE_KEY,
  clearApiKey,
  readApiKey,
  writeApiKey,
} from '../api-key';

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

describe('api-key storage helper', () => {
  let storage: Storage;
  let consoleSpies: ReadonlyArray<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    storage = makeMemoryStorage();
    consoleSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    ];
  });

  afterEach(() => {
    for (const spy of consoleSpies) spy.mockRestore();
  });

  it('round-trips a key', () => {
    expect(readApiKey(storage)).toBeNull();
    writeApiKey('sk-secret-value', storage);
    expect(readApiKey(storage)).toBe('sk-secret-value');
    clearApiKey(storage);
    expect(readApiKey(storage)).toBeNull();
  });

  it('treats empty string as absent', () => {
    storage.setItem(API_KEY_STORAGE_KEY, '');
    expect(readApiKey(storage)).toBeNull();
  });

  it('never logs the key through console.{log,info,warn,error,debug}', () => {
    writeApiKey('sk-shhh', storage);
    readApiKey(storage);
    clearApiKey(storage);
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('uses the canonical storage key', () => {
    writeApiKey('k', storage);
    expect(storage.getItem(API_KEY_STORAGE_KEY)).toBe('k');
    expect(API_KEY_STORAGE_KEY).toBe('mbse-workbench:anthropic-api-key');
  });
});
