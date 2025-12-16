import { Injectable, effect, inject, signal } from '@angular/core';
import type { CoreState, StoreState } from '@embedpdf/core';
import { RegistryService } from './registry.service';

/**
 * Reactive getter for the *entire* global store.
 * Re‑emits whenever any slice changes.
 *
 * @example
 * const storeService = inject(StoreStateService);
 * console.log(storeService.state()?.core.scale);
 */
@Injectable()
export class StoreStateService<T = CoreState> {
  private registryService = inject(RegistryService);

  state = signal<StoreState<T> | undefined>(undefined);

  constructor() {
    effect(
      (onCleanup) => {
        const registry = this.registryService.registrySignal();
        if (!registry) {
          this.state.set(undefined);
          return;
        }

        const store = registry.getStore();

        // initial snapshot
        this.state.set(store.getState() as StoreState<T>);

        // live updates
        const unsubscribe = store.subscribe((_action, newState) =>
          this.state.set(newState as StoreState<T>),
        );

        onCleanup(() => unsubscribe());
      },
      { allowSignalWrites: true },
    );
  }
}
