import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { I18nService } from './core/services/i18n.service';
import { ExperienceService } from './core/services/experience.service';
import { LevelBadgeComponent } from './shared/components/level-badge.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatToolbarModule, MatSidenavModule,
    MatListModule, MatIconModule, MatButtonModule, MatMenuModule,
    TranslateModule, LevelBadgeComponent
  ],
  template: `
    @if (auth.isLoggedIn()) {
      <mat-sidenav-container class="shell">
        <mat-sidenav mode="side" opened class="sidenav">
          <div class="sidenav-header">
            <h3>AU Sentinel</h3>
          </div>
          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span>{{ 'nav.dashboard' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/news" routerLinkActive="active">
              <mat-icon matListItemIcon>article</mat-icon>
              <span>{{ 'nav.news' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/bulletins" routerLinkActive="active">
              <mat-icon matListItemIcon>campaign</mat-icon>
              <span>{{ 'nav.bulletins' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/alerts" routerLinkActive="active">
              <mat-icon matListItemIcon>notifications</mat-icon>
              <span>{{ 'nav.alerts' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/bookmarks" routerLinkActive="active">
              <mat-icon matListItemIcon>bookmark</mat-icon>
              <span>{{ 'bookmarks.title' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/leaderboard" routerLinkActive="active">
              <mat-icon matListItemIcon>leaderboard</mat-icon>
              <span>{{ 'nav.leaderboard' | translate }}</span>
            </a>
            @if (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
              <a mat-list-item routerLink="/alerts/rules" routerLinkActive="active">
                <mat-icon matListItemIcon>rule</mat-icon>
                <span>{{ 'nav.alertRules' | translate }}</span>
              </a>
            }
            @if (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
              <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
                <mat-icon matListItemIcon>group</mat-icon>
                <span>{{ 'nav.users' | translate }}</span>
              </a>
            }
            @if (auth.isAUAdmin()) {
              <a mat-list-item routerLink="/admin/sources" routerLinkActive="active">
                <mat-icon matListItemIcon>source</mat-icon>
                <span>{{ 'nav.sources' | translate }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content>
          <mat-toolbar color="primary">
            <span>AU Sentinel</span>
            <span class="spacer"></span>
            <span>{{ auth.user()?.fullName }}</span>
            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <button mat-menu-item disabled>
                <mat-icon>person</mat-icon>
                <span>{{ auth.user()?.username }}</span>
              </button>
              <button mat-menu-item disabled>
                <mat-icon>flag</mat-icon>
                <span>{{ auth.user()?.countryName }}</span>
              </button>
              @if (myExperience()) {
                <div class="menu-level-badge">
                  <app-level-badge
                    [level]="myExperience()!.level"
                    [levelName]="myExperience()!.levelName"
                    [totalXp]="myExperience()!.totalXp"
                    [showXp]="true"
                    size="small"
                  />
                </div>
              }
              <button mat-menu-item routerLink="/profile">
                <mat-icon>account_box</mat-icon>
                <span>{{ 'nav.profile' | translate }}</span>
              </button>
              <button mat-menu-item (click)="toggleLanguage()">
                <mat-icon>translate</mat-icon>
                <span>{{ getCurrentLanguageLabel() }}</span>
              </button>
              <button mat-menu-item (click)="auth.logout()">
                <mat-icon>logout</mat-icon>
                <span>{{ 'auth.logout' | translate }}</span>
              </button>
            </mat-menu>
          </mat-toolbar>
          <div class="page-container">
            <router-outlet />
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .shell { height: 100vh; }
    .sidenav { width: 240px; }
    .sidenav-header { padding: 16px; text-align: center; }
    .sidenav-header h3 { margin: 0; font-weight: 500; }
    .active { background: rgba(0,0,0,0.04); }
    .menu-level-badge {
      padding: 12px 16px;
      display: flex;
      justify-content: center;
      background: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      margin: 4px 0;
    }
  `]
})
export class AppComponent {
  myExperience = this.experienceService.myExperience;

  constructor(
    public auth: AuthService,
    public i18n: I18nService,
    private experienceService: ExperienceService
  ) {
    // Load user experience on init if logged in
    if (this.auth.isLoggedIn()) {
      this.experienceService.getMyExperience().subscribe();
    }
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  getCurrentLanguageLabel(): string {
    return this.i18n.getCurrentLanguage() === 'en' ? 'العربية' : 'English';
  }
}

