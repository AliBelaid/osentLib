import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { I18nService } from './core/services/i18n.service';
import { ExperienceService } from './core/services/experience.service';
import { IntelSignalRService } from './core/services/intel-signalr.service';
import { LevelBadgeComponent } from './shared/components/level-badge.component';
import { DarkModeToggleComponent } from './shared/components/dark-mode-toggle.component';
import { LanguageSelectorComponent } from './shared/components/language-selector.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatToolbarModule, MatSidenavModule,
    MatListModule, MatIconModule, MatButtonModule, MatMenuModule, MatSnackBarModule,
    TranslateModule, LevelBadgeComponent, DarkModeToggleComponent, LanguageSelectorComponent
  ],
  template: `
    @if (auth.isLoggedIn()) {
      <mat-sidenav-container class="shell">
        <mat-sidenav mode="side" opened class="sidenav">
          <div class="sidenav-header">
            <div class="logo-area">
              <mat-icon class="logo-icon">security</mat-icon>
              <h3>AU Sentinel</h3>
            </div>
            <div class="status-line">
              <span class="status-dot"></span>
              <span class="status-text">OSINT ACTIVE</span>
            </div>
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
            <a mat-list-item routerLink="/submit-report" routerLinkActive="active">
              <mat-icon matListItemIcon>assignment</mat-icon>
              <span>{{ 'nav.submitReport' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/intelligence" routerLinkActive="active">
              <mat-icon matListItemIcon>shield</mat-icon>
              <span>{{ 'nav.intelligence' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/maps" routerLinkActive="active">
              <mat-icon matListItemIcon>public</mat-icon>
              <span>{{ 'nav.maps' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/bookmarks" routerLinkActive="active">
              <mat-icon matListItemIcon>bookmark</mat-icon>
              <span>{{ 'bookmarks.title' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/leaderboard" routerLinkActive="active">
              <mat-icon matListItemIcon>leaderboard</mat-icon>
              <span>{{ 'nav.leaderboard' | translate }}</span>
            </a>
            <div class="nav-divider"></div>
            <div class="nav-section-label">{{ 'nav.cyberOps' | translate }}</div>
            <a mat-list-item routerLink="/cyber/threats" routerLinkActive="active">
              <mat-icon matListItemIcon>policy</mat-icon>
              <span>{{ 'nav.threatIntel' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/cyber/attack-map" routerLinkActive="active">
              <mat-icon matListItemIcon>language</mat-icon>
              <span>{{ 'nav.attackMap' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/cyber/countries" routerLinkActive="active">
              <mat-icon matListItemIcon>flag</mat-icon>
              <span>{{ 'nav.countryIntel' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/cyber/incidents" routerLinkActive="active">
              <mat-icon matListItemIcon>local_fire_department</mat-icon>
              <span>{{ 'nav.incidents' | translate }}</span>
            </a>
            <div class="nav-divider"></div>
            <div class="nav-section-label">OSINT TOOLS</div>
            <a mat-list-item routerLink="/maltego" routerLinkActive="active">
              <mat-icon matListItemIcon>hub</mat-icon>
              <span>Maltego Graph</span>
            </a>
            <a mat-list-item routerLink="/social-search" routerLinkActive="active">
              <mat-icon matListItemIcon>people_alt</mat-icon>
              <span>{{ 'nav.socialSearch' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/search/advanced" routerLinkActive="active">
              <mat-icon matListItemIcon>manage_search</mat-icon>
              <span>{{ 'nav.advancedSearch' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/search/keywords" routerLinkActive="active">
              <mat-icon matListItemIcon>key</mat-icon>
              <span>{{ 'nav.keywords' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/dns/lookup" routerLinkActive="active">
              <mat-icon matListItemIcon>dns</mat-icon>
              <span>{{ 'nav.dnsLookup' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/dns/watchlist" routerLinkActive="active">
              <mat-icon matListItemIcon>visibility</mat-icon>
              <span>{{ 'nav.domainWatch' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/osint-tools" routerLinkActive="active">
              <mat-icon matListItemIcon>biotech</mat-icon>
              <span>OSINT Framework</span>
            </a>
            @if (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
              <div class="nav-divider"></div>
              <div class="nav-section-label">ADMINISTRATION</div>
              <a mat-list-item routerLink="/alerts/rules" routerLinkActive="active">
                <mat-icon matListItemIcon>rule</mat-icon>
                <span>{{ 'nav.alertRules' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
                <mat-icon matListItemIcon>group</mat-icon>
                <span>{{ 'nav.users' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/admin/import" routerLinkActive="active">
                <mat-icon matListItemIcon>cloud_upload</mat-icon>
                <span>{{ 'nav.import' | translate }}</span>
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
          <mat-toolbar class="top-bar">
            <mat-icon class="toolbar-icon">radar</mat-icon>
            <span class="toolbar-title">AU Sentinel</span>
            <span class="toolbar-subtitle">OSINT Intelligence Platform</span>
            <span class="spacer"></span>
            <app-language-selector />
            <app-dark-mode-toggle />
            <div class="user-info">
              <span class="user-name">{{ auth.user()?.fullName }}</span>
              <span class="user-role">{{ auth.user()?.roles?.[0] }}</span>
            </div>
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="avatar-btn">
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

    /* ─── SIDENAV ─── */
    .sidenav {
      width: 260px;
      background: var(--bg-sidenav-gradient) !important;
      border-inline-end: 1px solid var(--border-default) !important;
    }

    .sidenav-header {
      padding: 20px 16px 14px;
      border-bottom: 1px solid var(--border-default);
      background: var(--bg-header);
    }
    .logo-area {
      display: flex; align-items: center; gap: 12px;
    }
    .logo-icon {
      font-size: 30px; width: 30px; height: 30px;
      background: linear-gradient(135deg, #667eea, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.4));
    }
    .sidenav-header h3 {
      margin: 0; font-weight: 700; font-size: 18px; letter-spacing: 1px;
      color: var(--text-heading);
    }
    .status-line {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; padding-inline-start: 2px;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.7);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .status-text {
      font-size: 10px; letter-spacing: 2px;
      color: #00e676; font-weight: 700;
    }

    /* ─── NAV ITEMS ─── */
    ::ng-deep .sidenav .mat-mdc-list-item {
      color: var(--text-secondary) !important;
      border-radius: 8px !important;
      margin: 2px 8px !important;
      height: 44px !important;
      transition: all 0.2s ease !important;
    }
    ::ng-deep .sidenav .mat-mdc-list-item:hover {
      background: rgba(102, 126, 234, 0.1) !important;
      color: var(--text-primary) !important;
    }
    ::ng-deep .sidenav .mat-mdc-list-item .mat-icon {
      color: #667eea !important;
      font-size: 22px !important;
      width: 22px !important;
      height: 22px !important;
      margin-inline-end: 12px !important;
    }
    ::ng-deep .sidenav .mat-mdc-list-item span {
      font-size: 13.5px !important;
      font-weight: 500 !important;
      letter-spacing: 0.3px !important;
    }

    .nav-divider {
      height: 1px; margin: 12px 16px;
      background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.15), transparent);
    }
    .nav-section-label {
      font-size: 10px; letter-spacing: 2.5px;
      color: #667eea; padding: 12px 24px 6px;
      font-weight: 700; text-transform: uppercase;
    }

    .active {
      background: rgba(102,126,234,0.12) !important;
      border-inline-start: 3px solid #667eea !important;
    }
    ::ng-deep .sidenav .active .mat-icon {
      color: #00d4ff !important;
      filter: drop-shadow(0 0 6px rgba(0, 212, 255, 0.4));
    }
    ::ng-deep .sidenav .active span {
      color: var(--text-heading) !important;
      font-weight: 600 !important;
    }

    /* ─── TOP BAR ─── */
    .top-bar {
      height: 56px;
      background: var(--bg-header-gradient) !important;
      border-bottom: 1px solid rgba(102, 126, 234, 0.1);
      color: var(--text-primary) !important;
    }
    .toolbar-icon {
      font-size: 22px; width: 22px; height: 22px;
      margin-inline-end: 8px; color: #667eea;
    }
    .toolbar-title {
      font-weight: 600; font-size: 16px; letter-spacing: 0.5px;
      color: var(--text-heading);
    }
    .toolbar-subtitle {
      font-size: 11px; color: var(--text-tertiary); margin-inline-start: 8px;
      letter-spacing: 1px; text-transform: uppercase;
    }

    .user-info {
      display: flex; flex-direction: column; align-items: flex-end;
      margin-inline-end: 8px;
    }
    .user-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .user-role { font-size: 10px; color: #667eea; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

    .avatar-btn mat-icon {
      font-size: 30px; width: 30px; height: 30px; color: #667eea;
    }

    .menu-level-badge {
      padding: 12px 16px;
      display: flex; justify-content: center;
      border-top: 1px solid var(--border-default);
      border-bottom: 1px solid var(--border-default);
      margin: 4px 0;
    }

    /* ─── PAGE CONTAINER ─── */
    ::ng-deep .mat-sidenav-content {
      background: var(--bg-page) !important;
      overflow-x: hidden !important;
    }
    .page-container {
      background: var(--bg-page);
      min-height: calc(100vh - 56px);
      overflow-x: hidden;
    }
  `]
})
export class AppComponent implements OnDestroy {
  myExperience = this.experienceService.myExperience;
  private _signalrSub?: Subscription;

  constructor(
    public auth: AuthService,
    public i18n: I18nService,
    private experienceService: ExperienceService,
    private signalR: IntelSignalRService,
    private snackBar: MatSnackBar
  ) {
    if (this.auth.isLoggedIn()) {
      this.experienceService.getMyExperience().subscribe();
      this.signalR.connect();
      this._signalrSub = this.signalR.reportSubmitted$.subscribe(evt => {
        const urgencyLabel = evt.urgency >= 4 ? '🚨 EMERGENCY' : evt.urgency >= 3 ? '⚠️ HIGH' : '📋 REPORT';
        this.snackBar.open(
          `${urgencyLabel}: ${evt.title} — ${evt.submittedBy}`,
          'View',
          { duration: 8000, panelClass: 'report-snackbar' }
        );
      });
    }
  }

  ngOnDestroy(): void {
    this._signalrSub?.unsubscribe();
    this.signalR.disconnect();
  }
}
