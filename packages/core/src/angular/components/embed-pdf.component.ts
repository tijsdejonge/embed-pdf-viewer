import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginRegistry, PluginBatchRegistrations } from '@embedpdf/core';
import { Logger, PdfEngine } from '@embedpdf/models';
import { PDF_CONTEXT, PDFContextState } from '../context';
import { AutoMountComponent } from './auto-mount.component';

export type { PluginBatchRegistrations };

@Component({
  selector: 'embed-pdf',
  standalone: true,
  imports: [CommonModule, AutoMountComponent],
  providers: [
    {
      provide: PDF_CONTEXT,
      useFactory: () => {
        const component = inject(EmbedPdfComponent);
        return component.contextState;
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pluginsOk() && autoMountDomElements) {
      <embed-pdf-auto-mount [plugins]="plugins">
        <ng-content />
      </embed-pdf-auto-mount>
    } @else {
      <ng-content />
    }
  `,
})
export class EmbedPdfComponent implements OnInit, OnDestroy {
  @Input({ required: true }) engine!: PdfEngine;
  @Input() logger?: Logger;
  @Input({ required: true }) plugins!: PluginBatchRegistrations;
  @Input() onInitialized?: (registry: PluginRegistry) => Promise<void>;
  @Input() autoMountDomElements = true;

  /* reactive state */
  private registry = signal<PluginRegistry | null>(null);
  private isInit = signal(true);
  protected pluginsOk = signal(false);

  /* context state for dependency injection */
  contextState: PDFContextState = {
    get registry() {
      return this.registrySignal();
    },
    get isInitializing() {
      return this.isInitSignal();
    },
    get pluginsReady() {
      return this.pluginsOkSignal();
    },
    registrySignal: this.registry.asReadonly(),
    isInitSignal: this.isInit.asReadonly(),
    pluginsOkSignal: this.pluginsOk.asReadonly(),
  } as any;

  async ngOnInit() {
    const reg = new PluginRegistry(this.engine, { logger: this.logger });
    reg.registerPluginBatch(this.plugins);
    await reg.initialize();
    await this.onInitialized?.(reg);

    this.registry.set(reg);
    this.isInit.set(false);

    reg.pluginsReady().then(() => this.pluginsOk.set(true));
  }

  ngOnDestroy() {
    this.registry()?.destroy();
  }
}

export { EmbedPdfComponent as EmbedPDF };
