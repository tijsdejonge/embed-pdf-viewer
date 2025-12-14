import { inject } from '@angular/core';
import { CapabilityService, PluginService } from '@embedpdf/core/angular';
import { RenderPlugin } from '../../lib/render-plugin';

export const useRenderPlugin = () => {
  const pluginService = inject(PluginService);
  return pluginService.getPlugin<RenderPlugin>(RenderPlugin.id);
};

export const useRenderCapability = () => {
  const capabilityService = inject(CapabilityService);
  return capabilityService.getCapability<RenderPlugin>(RenderPlugin.id);
};
