import { Injectable, computed, inject } from '@angular/core';
import type { BasePlugin } from '@embedpdf/core';
import { PluginService } from './plugin.service';

export interface CapabilityState<C> {
  provides: C | null;
  isLoading: boolean;
  ready: Promise<void>;
}

/**
 * Access the public capability exposed by a plugin.
 *
 * @example
 * const capabilityService = inject(CapabilityService);
 * const zoom = capabilityService.getCapability<ZoomPlugin>(ZoomPlugin.id);
 * zoom.provides()?.zoomIn();
 */
@Injectable()
export class CapabilityService {
  private pluginService = inject(PluginService);

  getCapability<T extends BasePlugin>(pluginId: T['id']) {
    const { plugin, isLoading, ready } = this.pluginService.getPlugin<T>(pluginId);

    const provides = computed(() => {
      const p = plugin();
      if (!p) return null;
      if (!p.provides) {
        throw new Error(`Plugin ${pluginId} does not implement provides()`);
      }
      return p.provides() as ReturnType<NonNullable<T['provides']>>;
    });

    return {
      provides,
      isLoading,
      ready,
    };
  }
}
