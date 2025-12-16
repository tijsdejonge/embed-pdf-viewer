import {
  Component,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginRegistry, PluginBatchRegistrations } from '@embedpdf/core';
import { Logger, PdfEngine } from '@embedpdf/models';
import { PDF_CONTEXT, PDFContextState } from '../context';
import { AutoMountComponent } from './auto-mount.component';
import {
  RegistryService,
  PluginService,
  CapabilityService,
  CoreStateService,
  StoreStateService,
} from '../services';

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
    RegistryService,
    PluginService,
    CapabilityService,
    CoreStateService,
    StoreStateService,
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
export class EmbedPdfComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) engine!: PdfEngine;
  @Input() logger?: Logger;
  @Input({ required: true }) plugins!: PluginBatchRegistrations;
  @Input() onInitialized?: (registry: PluginRegistry) => Promise<void>;
  @Input() autoMountDomElements = true;

  /* reactive state */
  private registry = signal<PluginRegistry | null>(null);
  private isInit = signal(true);
  protected pluginsOk = signal(false);

  private destroyed = false;
  private initSeq = 0;

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

  ngOnInit() {
    void this.recreateRegistry();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      'engine' in changes ||
      'plugins' in changes ||
      'logger' in changes ||
      'onInitialized' in changes
    ) {
      void this.recreateRegistry();
    }
  }

  private async recreateRegistry() {
    const seq = ++this.initSeq;

    this.pluginsOk.set(false);
    this.isInit.set(true);

    // Always tear down previous registry first.
    this.registry()?.destroy();
    this.registry.set(null);

    // Inputs are required, but be defensive during initialization/teardown.
    if (!this.engine || !this.plugins) {
      this.isInit.set(false);
      return;
    }

    const reg = new PluginRegistry(this.engine, { logger: this.logger });
    reg.registerPluginBatch(this.plugins);

    try {
      await reg.initialize();
      if (this.destroyed || seq !== this.initSeq) {
        reg.destroy();
        return;
      }

      await this.onInitialized?.(reg);
      if (this.destroyed || seq !== this.initSeq) {
        reg.destroy();
        return;
      }

      this.registry.set(reg);
      this.isInit.set(false);

      reg.pluginsReady().then(() => {
        if (this.destroyed || seq !== this.initSeq) return;
        this.pluginsOk.set(true);
      });
    } catch (e) {
      reg.destroy();
      if (!this.destroyed && seq === this.initSeq) {
        this.isInit.set(false);
        this.pluginsOk.set(false);
      }
      throw e;
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.initSeq++;
    this.registry()?.destroy();
    this.registry.set(null);
  }
}

export { EmbedPdfComponent as EmbedPDF };
