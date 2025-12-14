import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EmbedPdfComponent } from '@embedpdf/core/angular';
import { createRenderPlugin } from '@embedpdf/plugin-render/angular';
import { PdfEngineService } from '@embedpdf/engines/angular';

import type { PluginBatchRegistration, IPlugin } from '@embedpdf/core';
import type { PdfEngine } from '@embedpdf/models';

@Component({
  selector: 'app-pdf-renderer',
  templateUrl: './pdf-renderer.component.html',
  // styleUrl: './pdf-renderer.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    EmbedPdfComponent,
  ],
})
export class PdfRendererComponent implements OnInit {
  private engineService = inject(PdfEngineService);

  // Sample PDF URL - replace with your own
  protected pdfUrl = signal(
    'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
  );

  // Engine state
  protected engine = signal<PdfEngine | null>(null);
  protected engineLoading = signal(true);
  protected engineError = signal<Error | null>(null);

  // Register plugins
  protected plugins: PluginBatchRegistration<IPlugin<any>, any>[] = [createRenderPlugin()];

  async ngOnInit() {
    try {
      await this.engineService.initializeEngine();
      this.engine.set(this.engineService.engine);
      this.engineLoading.set(false);
    } catch (err) {
      this.engineError.set(err as Error);
      this.engineLoading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const url = URL.createObjectURL(file);
      this.pdfUrl.set(url);
    }
  }
}
