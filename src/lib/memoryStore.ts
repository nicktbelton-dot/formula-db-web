import type { Store } from './weather';

// Weather answers are kept in memory for as long as the page is open, and nowhere else: nothing is written to the visitor's device.
const memory = new Map<string, string>();
export const memoryStore: Store = {
  get: (k) => memory.get(k) ?? null,
  set: (k, v) => {
    memory.set(k, v);
  },
};
