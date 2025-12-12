import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'embed-pdf-nested-wrapper',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngComponentOutlet="wrappers[0]">
      @if (wrappers.length > 1) {
        <embed-pdf-nested-wrapper [wrappers]="wrappers.slice(1)">
          <ng-content />
        </embed-pdf-nested-wrapper>
      } @else {
        <ng-content />
      }
    </ng-container>
  `,
})
export class NestedWrapperComponent {
  @Input({ required: true }) wrappers!: any[];
}
