import { RenderPluginPackage } from '../lib';
import type { PluginBatchRegistration } from '@embedpdf/core';
import type { RenderPlugin, RenderPluginConfig } from '../lib';

export function createRenderPlugin(
  config?: Partial<RenderPluginConfig>,
): PluginBatchRegistration<RenderPlugin, RenderPluginConfig> {
  return {
    package: RenderPluginPackage,
    config: config || {},
  };
}
