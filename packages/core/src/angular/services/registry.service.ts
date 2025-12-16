import { Injectable, computed, inject } from '@angular/core';
import { PDF_CONTEXT } from '../context';

@Injectable()
export class RegistryService {
  private ctx = inject(PDF_CONTEXT, { optional: true });

  /**
   * Reactive access to the current registry.
   *
   * Note: the injected context object in `<embed-pdf>` is backed by signals,
   * so this computed will update when the registry is recreated.
   */
  readonly registrySignal = computed(() => this.ctx?.registry ?? null);

  readonly isInitializingSignal = computed(() => this.ctx?.isInitializing ?? true);

  readonly pluginsReadySignal = computed(() => this.ctx?.pluginsReady ?? false);

  get registry() {
    if (!this.ctx) {
      throw new Error('RegistryService must be used inside <embed-pdf>');
    }
    return this.ctx.registry;
  }

  get isInitializing() {
    return this.ctx?.isInitializing ?? true;
  }

  get pluginsReady() {
    return this.ctx?.pluginsReady ?? false;
  }
}
