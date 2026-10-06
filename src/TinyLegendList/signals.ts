import { useCallback, useSyncExternalStore } from 'react';

/**
 * Legend List: `ListenerTypeValueMap`, which has many more names.
 *
 * The values the list publishes to its components, by name:
 * - `totalSize`: height of the content view, the sum of all item sizes.
 * - `numContainers`: how many containers exist.
 * - `containerItemKey${id}`: key of the item a container shows.
 * - `containerItemIndex${id}`: index of that item in `data`.
 * - `containerItemData${id}`: the item itself, `data[index]`.
 * - `containerPosition${id}`: offset of that container from the content top.
 */
export interface SignalValues {
  totalSize: number;
  numContainers: number;
  [name: `containerItemKey${number}`]: string;
  [name: `containerItemIndex${number}`]: number;
  [name: `containerItemData${number}`]: unknown;
  [name: `containerPosition${number}`]: number;
}

/** Legend List: `ListenerType`. */
export type SignalName = keyof SignalValues;

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
  private values = new Map<SignalName, SignalValues[SignalName] | undefined>();
  private listeners = new Map<SignalName, Set<Listener>>();

  /** Reads a value without subscribing to it. */
  peek<N extends SignalName>(name: N): SignalValues[N] | undefined {
    return this.values.get(name) as SignalValues[N] | undefined;
  }

  /** Writes a value and notifies its subscribers if it changed. */
  set<N extends SignalName>(name: N, value: SignalValues[N] | undefined) {
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
export function useSignal<N extends SignalName>(
  store: SignalStore,
  name: N
): SignalValues[N] | undefined {
  const subscribe = useCallback(
    (listener: Listener) => store.subscribe(name, listener),
    [store, name]
  );
  return useSyncExternalStore(subscribe, () => store.peek(name));
}
