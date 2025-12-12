import { InjectionToken } from '@angular/core';
import type { PluginRegistry } from '@embedpdf/core';

export interface PDFContextState {
  registry: PluginRegistry | null;
  isInitializing: boolean;
  pluginsReady: boolean;
}

export const PDF_CONTEXT = new InjectionToken<PDFContextState>('PDF_CONTEXT');
