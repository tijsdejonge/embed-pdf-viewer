import { Injectable, signal, OnDestroy } from '@angular/core';
import { arePropsEqual, type CoreState } from '@embedpdf/core';
import { RegistryService } from './registry.service';

@Injectable()
export class CoreStateService implements OnDestroy {
  private registryService = new RegistryService();
  private unsubscribe?: () => void;

  core = signal<CoreState | undefined>(undefined);

  constructor() {
    this.initialize();
  }

  private initialize() {
    const registry = this.registryService.registry;
    if (!registry) return;

    const store = registry.getStore();
    this.core.set(store.getState().core);

    this.unsubscribe = store.subscribe((action, newSt, oldSt) => {
      if (store.isCoreAction(action) && !arePropsEqual(newSt.core, oldSt.core)) {
        this.core.set(newSt.core);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }
}
