import { Injectable, signal, effect, computed } from '@angular/core';
import type { BasePlugin } from '@embedpdf/core';
import { RegistryService } from './registry.service';

export interface PluginState<T extends BasePlugin> {
  plugin: T | null;
  isLoading: boolean;
  ready: Promise<void>;
}

@Injectable()
export class PluginService {
  private registryService = new RegistryService();

  getPlugin<T extends BasePlugin>(pluginId: T['id']) {
    const plugin = signal<T | null>(null);
    const isLoading = signal(true);
    const ready = signal<Promise<void>>(new Promise(() => {}));

    const load = () => {
      const registry = this.registryService.registry;
      if (!registry) return;

      const p = registry.getPlugin<T>(pluginId);
      if (!p) throw new Error(`Plugin ${pluginId} not found`);

      plugin.set(p);
      isLoading.set(false);
      ready.set(p.ready?.() ?? Promise.resolve());
    };

    // Load immediately
    load();

    return {
      plugin: plugin.asReadonly(),
      isLoading: isLoading.asReadonly(),
      ready: computed(() => ready()),
    };
  }
}
