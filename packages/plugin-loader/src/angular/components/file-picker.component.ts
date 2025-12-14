import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { useLoaderCapability } from '../hooks';

@Component({
  selector: 'app-file-picker',
  template: `
    <!-- Hidden file picker -->
    <input
      #inputRef
      type="file"
      accept="application/pdf"
      style="display: none"
      (change)="onChange($event)"
    />
  `,
  standalone: true,
})
export class FilePicker implements OnInit, OnDestroy {
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  private unsubscribe: (() => void) | null = null;

  ngOnInit(): void {
    const { provides: loaderProvides } = useLoaderCapability();
    if (!loaderProvides) return;

    // Listen for "open file" requests
    this.unsubscribe = loaderProvides.onOpenFileRequest((req) => {
      if (req === 'open' && this.inputRef.nativeElement) {
        this.inputRef.nativeElement.click();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // Handle actual file selection
  async onChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    const { provides: loaderProvides } = useLoaderCapability();

    if (file && loaderProvides) {
      const arrayBuffer = await file.arrayBuffer();
      await loaderProvides.loadDocument({
        type: 'buffer',
        pdfFile: {
          id: Math.random().toString(36).substring(2, 15),
          name: file.name,
          content: arrayBuffer,
        },
      });
    }
  }
}
