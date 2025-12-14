import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ignore, PdfErrorCode } from '@embedpdf/models';

import { useRenderCapability, useRenderPlugin } from '../hooks';

@Component({
  selector: 'embed-render-layer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img
      *ngIf="imageUrl()"
      [src]="imageUrl()"
      [style.width]="'100%'"
      [style.height]="'100%'"
      (load)="handleImageLoad()"
    />
  `,
})
export class RenderLayerComponent implements OnInit, OnDestroy {
  @Input() pageIndex!: number;
  /**
   * The scale factor for rendering the page.
   */
  @Input() scale?: number;
  @Input() dpr?: number;

  imageUrl = signal<string | null>(null);
  refreshTick = signal(0);

  private urlRef: string | null = null;
  private hasLoaded = false;
  private cleanupFunctions: Array<() => void> = [];

  // Computed signals for reactive values
  actualScale = computed(() => this.scale ?? 1);
  actualDpr = computed(() => this.dpr ?? window.devicePixelRatio);

  renderProvides: any;
  renderPlugin: any;

  constructor(private cdr: ChangeDetectorRef) {
    const { provides: renderProvides } = useRenderCapability();
    const { plugin: renderPlugin } = useRenderPlugin();

    this.renderProvides = renderProvides;
    this.renderPlugin = renderPlugin;

    // Listen for external page refresh events
    effect((onCleanup) => {
      const plugin = this.renderPlugin;
      if (!plugin) return;

      const unsubscribe = plugin.onRefreshPages((pages: number[]) => {
        if (pages.includes(this.pageIndex)) {
          this.refreshTick.update((v) => v + 1);
        }
      });

      onCleanup(unsubscribe);
    });

    // Render page when dependencies change
    effect((onCleanup) => {
      // Capture reactive dependencies
      const pageIndex = this.pageIndex;
      const scale = this.actualScale();
      const dpr = this.actualDpr();
      const tick = this.refreshTick();
      const capability = this.renderProvides;

      if (!capability) return;

      // Revoke old URL before creating new one (if it's been loaded)
      if (this.urlRef && this.hasLoaded) {
        URL.revokeObjectURL(this.urlRef);
        this.urlRef = null;
        this.hasLoaded = false;
      }

      const task = capability.renderPage({
        pageIndex,
        options: {
          scaleFactor: scale,
          dpr,
        },
      });

      task.wait((blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.urlRef = objectUrl;
        this.imageUrl.set(objectUrl);
        this.hasLoaded = false;
        this.cdr.detectChanges();
      }, ignore);

      onCleanup(() => {
        if (this.urlRef) {
          // Only revoke if image has loaded
          if (this.hasLoaded) {
            URL.revokeObjectURL(this.urlRef);
            this.urlRef = null;
            this.hasLoaded = false;
          }
        } else {
          // Task still in progress, abort it
          task.abort({
            code: PdfErrorCode.Cancelled,
            message: 'canceled render task',
          });
        }
      });
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.urlRef) {
      URL.revokeObjectURL(this.urlRef);
      this.urlRef = null;
    }

    // Execute all cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }

  handleImageLoad(): void {
    this.hasLoaded = true;
  }
}
