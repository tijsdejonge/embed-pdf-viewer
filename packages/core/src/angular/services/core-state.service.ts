import { Injectable, effect, inject, signal } from '@angular/core';
import { arePropsEqual, type CoreState } from '@embedpdf/core';
import { RegistryService } from './registry.service';

@Injectable()
export class CoreStateService {
  private registryService = inject(RegistryService);

  core = signal<CoreState | undefined>(undefined);

  constructor() {
    effect(
      (onCleanup) => {
        const registry = this.registryService.registrySignal();
        if (!registry) {
          this.core.set(undefined);
          return;
        }

        const store = registry.getStore();
        this.core.set(store.getState().core);

        const unsubscribe = store.subscribe((action, newSt, oldSt) => {
          if (store.isCoreAction(action) && !arePropsEqual(newSt.core, oldSt.core)) {
            this.core.set(newSt.core);
          }
        });

        onCleanup(() => unsubscribe());
      },
      { allowSignalWrites: true },
    );
  }
}
