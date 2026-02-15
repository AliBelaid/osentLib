import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatMenuModule, MatIconModule],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="langMenu">
      <mat-icon>translate</mat-icon>
    </button>
    <mat-menu #langMenu="matMenu">
      <button mat-menu-item (click)="i18n.setLanguage('en')" [class.active-lang]="i18n.currentLanguage() === 'en'">
        <span>English</span>
      </button>
      <button mat-menu-item (click)="i18n.setLanguage('ar')" [class.active-lang]="i18n.currentLanguage() === 'ar'">
        <span>العربية</span>
      </button>
      <button mat-menu-item (click)="i18n.setLanguage('fr')" [class.active-lang]="i18n.currentLanguage() === 'fr'">
        <span>Fran\u00e7ais</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .active-lang { background: rgba(63, 81, 181, 0.12) !important; font-weight: 500; }
  `]
})
export class LanguageSelectorComponent {
  constructor(public i18n: I18nService) {}
}
