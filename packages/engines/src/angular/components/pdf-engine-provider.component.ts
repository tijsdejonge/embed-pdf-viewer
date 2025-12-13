import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PdfEngineService, PdfiumEngineOptions } from '../services/pdf-engine.service';
import type { PdfEngine } from '@embedpdf/models';

@Component({
  selector: 'pdf-engine-provider',
  template: '<ng-content></ng-content>',
  providers: [PdfEngineService],
})
export class PdfEngineProviderComponent implements OnInit, OnDestroy {
  @Input() wasmUrl?: string;
  @Input() worker?: boolean = true;
  @Input() logger?: any;

  private subscription?: Subscription;

  public engine$: Observable<PdfEngine | null>;
  public isLoading$: Observable<boolean>;
  public error$: Observable<Error | null>;
  public state$: Observable<{ engine: PdfEngine | null; isLoading: boolean; error: Error | null }>;

  constructor(private pdfEngineService: PdfEngineService) {
    this.engine$ = this.pdfEngineService.engine$;
    this.isLoading$ = this.pdfEngineService.isLoading$;
    this.error$ = this.pdfEngineService.error$;

    this.state$ = combineLatest([this.engine$, this.isLoading$, this.error$]).pipe(
      map(([engine, isLoading, error]) => ({ engine, isLoading, error })),
    );
  }

  ngOnInit(): void {
    const options: PdfiumEngineOptions = {
      wasmUrl: this.wasmUrl,
      worker: this.worker,
      logger: this.logger,
    };

    this.pdfEngineService.initializeEngine(options);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
