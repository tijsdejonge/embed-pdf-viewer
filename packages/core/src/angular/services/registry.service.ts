import { Injectable, inject } from '@angular/core';
import { PDF_CONTEXT } from '../context';

@Injectable()
export class RegistryService {
  private ctx = inject(PDF_CONTEXT, { optional: true });

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
