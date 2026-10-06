import { useCallback, useSyncExternalStore } from 'react';

/**
 * Legend List: `ListenerType`, which has many more names.
 *
 * Names of the values the list publishes to its components:
 * - `totalSize`: height of the content view, the sum of all item sizes.
 * - `numContainers`: how many containers exist.
 * - `containerItemIndex${id}`: index of the item a container shows.
 * - `containerPosition${id}`: offset of that container from the content top.
 */
export type SignalName =
  | 'totalSize'
  | 'numContainers'
  | `containerItemIndex${number}`
  | `containerPosition${number}`;

type Listener = () => void;

/**
 * Legend List: the `values` and `listeners` of `StateContext`, used through
 * free functions: `peek` is `peek$`, `set` is `set$`, `subscribe` is `listen$`.
 *
 * A tiny store of named values. Each component subscribes only to the values
 * it shows, so moving one container re-renders that container and nothing
 * else. The list component itself subscribes to nothing and never re-renders
 * while scrolling.
 */
export class SignalStore {
  private values = new Map<SignalName, number | undefined>();
  private listeners = new Map<SignalName, Set<Listener>>();

  /** Reads a value without subscribing to it. */
  peek(name: SignalName): number | undefined {
    return this.values.get(name);
  }

  /** Writes a value and notifies its subscribers if it changed. */
  set(name: SignalName, value: number | undefined) {
    if (this.values.get(name) === value) {
      return;
    }
    this.values.set(name, value);
    this.listeners.get(name)?.forEach((listener) => listener());
  }

  /** Calls `listener` whenever the value changes; returns an unsubscribe. */
  subscribe(name: SignalName, listener: Listener): () => void {
    let listeners = this.listeners.get(name);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(name, listeners);
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
}

/**
 * Legend List: `useArr$`, which reads several values at once.
 *
 * Reads a value and re-renders the component whenever it changes.
 */
export function useSignal(
  store: SignalStore,
  name: SignalName
): number | undefined {
  const subscribe = useCallback(
    (listener: Listener) => store.subscribe(name, listener),
    [store, name]
  );
  return useSyncExternalStore(subscribe, () => store.peek(name));
}
