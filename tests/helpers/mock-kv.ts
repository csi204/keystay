/**
 * Creates an in-memory KVNamespace mock for testing Cloudflare KV
 */
export function createMockKV(): KVNamespace {
  const store = new Map<string, string>();

  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: any) {
      store.set(key, typeof value === 'string' ? value : String(value));
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: any) {
      const keys = Array.from(store.keys()).map(name => ({ name }));
      return { keys, list_complete: true, cursor: '' };
    },
  } as any;
}

