import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-maps-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTabsModule, MatIconModule, TranslateModule],
  template: `
    <div class="maps-layout">
      <h2>{{ 'maps.title' | translate }}</h2>
      <nav mat-tab-nav-bar [tabPanel]="tabPanel">
        <a mat-tab-link routerLink="threats" routerLinkActive #t1="routerLinkActive" [active]="t1.isActive">
          <mat-icon>gps_fixed</mat-icon>&nbsp;{{ 'maps.threatMap' | translate }}
        </a>
        <a mat-tab-link routerLink="alerts" routerLinkActive #t2="routerLinkActive" [active]="t2.isActive">
          <mat-icon>warning</mat-icon>&nbsp;{{ 'maps.alertMap' | translate }}
        </a>
        <a mat-tab-link routerLink="timeline" routerLinkActive #t3="routerLinkActive" [active]="t3.isActive">
          <mat-icon>timeline</mat-icon>&nbsp;{{ 'maps.timelineMap' | translate }}
        </a>
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <router-outlet />
      </mat-tab-nav-panel>
    </div>
  `,
  styles: [`
    .maps-layout { padding: 0; }
    h2 { margin: 0 0 16px; }
    nav { margin-bottom: 16px; }
  `]
})
export class MapsLayoutComponent {}
