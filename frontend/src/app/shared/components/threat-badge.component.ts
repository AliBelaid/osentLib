import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-threat-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="'threat-badge ' + threatClass">{{ label }}</span>
  `,
  styles: [`
    .threat-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 500;
    }
    .threat-critical { background: #ffcdd2; color: #b71c1c; }
    .threat-high { background: #ffcdd2; color: #d32f2f; }
    .threat-elevated { background: #fff3e0; color: #e65100; }
    .threat-moderate { background: #fff9c4; color: #f57f17; }
    .threat-low { background: #c8e6c9; color: #2e7d32; }
    .threat-none { background: #eeeeee; color: #616161; }
  `]
})
export class ThreatBadgeComponent {
  @Input() level = 0;

  get threatClass(): string {
    switch (this.level) {
      case 5: return 'threat-critical';
      case 4: return 'threat-high';
      case 3: return 'threat-elevated';
      case 2: return 'threat-moderate';
      case 1: return 'threat-low';
      default: return 'threat-none';
    }
  }

  get label(): string {
    switch (this.level) {
      case 5: return 'CRITICAL';
      case 4: return 'HIGH';
      case 3: return 'ELEVATED';
      case 2: return 'MODERATE';
      case 1: return 'LOW';
      default: return 'NONE';
    }
  }
}
