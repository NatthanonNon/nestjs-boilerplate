import { AsyncLocalStorage } from 'async_hooks';

type RequestContextStore = {
  requestId?: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext(store: RequestContextStore, callback: () => void) {
  storage.run(store, callback);
}

export function getRequestContext() {
  return storage.getStore();
}
