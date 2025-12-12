import { Component, Input, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { hasAutoMountElements, type PluginBatchRegistration, type IPlugin } from '@embedpdf/core';
import { NestedWrapperComponent } from './nested-wrapper.component';

interface Elements {
  utilities: any[];
  wrappers: any[];
}

@Component({
  selector: 'embed-pdf-auto-mount',
  standalone: true,
  imports: [CommonModule, NestedWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (elements().wrappers.length > 0) {
      <embed-pdf-nested-wrapper [wrappers]="elements().wrappers">
        <ng-content />
      </embed-pdf-nested-wrapper>
    } @else {
      <ng-content />
    }

    @for (utility of elements().utilities; track $index) {
      <ng-container *ngComponentOutlet="utility" />
    }
  `,
})
export class AutoMountComponent implements OnInit {
  @Input({ required: true }) plugins!: PluginBatchRegistration<IPlugin<any>, any>[];

  protected elements = signal<Elements>({ utilities: [], wrappers: [] });

  ngOnInit() {
    const utilities: any[] = [];
    const wrappers: any[] = [];

    for (const reg of this.plugins) {
      const pkg = reg.package;
      if (hasAutoMountElements(pkg)) {
        const elements = pkg.autoMountElements() || [];

        for (const element of elements) {
          if (element.type === 'utility') {
            utilities.push(element.component);
          } else if (element.type === 'wrapper') {
            wrappers.push(element.component);
          }
        }
      }
    }

    this.elements.set({ utilities, wrappers });
  }
}
