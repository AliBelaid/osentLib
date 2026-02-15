import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-dark-mode-toggle',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <button mat-icon-button (click)="theme.toggle()" [matTooltip]="theme.isDark() ? 'Light Mode' : 'Dark Mode'">
      <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `
})
export class DarkModeToggleComponent {
  constructor(public theme: ThemeService) {}
}
