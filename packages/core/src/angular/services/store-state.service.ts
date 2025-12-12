import { Injectable, signal, OnDestroy, effect } from '@angular/core';
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
export class StoreStateService<T = CoreState> implements OnDestroy {
  private registryService = new RegistryService();
  private unsubscribe?: () => void;

  state = signal<StoreState<T> | undefined>(undefined);

  constructor() {
    this.attach();
  }

  private attach() {
    const registry = this.registryService.registry;
    if (!registry) return;

    // initial snapshot
    this.state.set(registry.getStore().getState() as StoreState<T>);

    // live updates
    this.unsubscribe = registry
      .getStore()
      .subscribe((_action, newState) => this.state.set(newState as StoreState<T>));
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }
}
