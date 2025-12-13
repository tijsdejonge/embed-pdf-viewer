import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ignore, type Logger, type PdfEngine } from '@embedpdf/models';

const defaultWasmUrl =
  'https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@__PDFIUM_VERSION__/dist/pdfium.wasm';

export interface PdfiumEngineOptions {
  wasmUrl?: string;
  worker?: boolean;
  logger?: Logger;
}

@Injectable({
  providedIn: 'root',
})
export class PdfEngineService implements OnDestroy {
  private engineSubject = new BehaviorSubject<PdfEngine | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<Error | null>(null);

  public readonly engine$: Observable<PdfEngine | null> = this.engineSubject.asObservable();
  public readonly isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  public readonly error$: Observable<Error | null> = this.errorSubject.asObservable();

  get engine(): PdfEngine | null {
    return this.engineSubject.value;
  }

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  get error(): Error | null {
    return this.errorSubject.value;
  }

  async initializeEngine(options: PdfiumEngineOptions = {}): Promise<void> {
    const { wasmUrl = defaultWasmUrl, worker = true, logger } = options;

    this.destroyEngine();
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const { createPdfiumEngine } = worker
        ? await import('@embedpdf/engines/pdfium-worker-engine')
        : await import('@embedpdf/engines/pdfium-direct-engine');

      const pdfEngine = await createPdfiumEngine(wasmUrl, logger);
      pdfEngine.initialize().wait(
        () => {
          this.isLoadingSubject.next(false);
          this.engineSubject.next(pdfEngine);
        },
        (e) => {
          this.errorSubject.next(new Error(e.reason.message));
          this.isLoadingSubject.next(false);
        },
      );
    } catch (e) {
      this.errorSubject.next(e as Error);
      this.isLoadingSubject.next(false);
    }
  }

  private destroyEngine(): void {
    const currentEngine = this.engineSubject.value;
    if (currentEngine) {
      currentEngine.closeAllDocuments?.().wait(() => {
        currentEngine.destroy?.();
        this.engineSubject.next(null);
      }, ignore);
    }
  }

  ngOnDestroy(): void {
    this.destroyEngine();
  }
}
