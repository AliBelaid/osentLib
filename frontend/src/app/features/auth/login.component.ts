import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { DarkModeToggleComponent } from '../../shared/components/dark-mode-toggle.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule, DarkModeToggleComponent, LanguageSelectorComponent
  ],
  template: `
    <div class="login-page">
      <!-- Background grid animation -->
      <div class="grid-bg"></div>
      <div class="scan-line"></div>

      <!-- Top bar -->
      <div class="login-topbar">
        <a routerLink="/welcome" class="back-link">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <span class="spacer"></span>
        <app-language-selector />
        <app-dark-mode-toggle />
      </div>

      <!-- Login card -->
      <div class="login-center">
        <div class="login-card">
          <!-- Shield / Logo -->
          <div class="logo-area">
            <div class="shield-icon">
              <mat-icon>shield</mat-icon>
            </div>
            <h1 class="logo-title">AU SENTINEL</h1>
            <p class="logo-subtitle">SECURE ACCESS PORTAL</p>
            <div class="status-line">
              <span class="status-dot"></span>
              <span class="status-text">SYSTEM ONLINE</span>
            </div>
          </div>

          <!-- Form -->
          <form (ngSubmit)="onLogin()" class="login-form">
            <div class="field-group">
              <label class="field-label">
                <mat-icon>person_outline</mat-icon>
                {{ 'auth.username' | translate }}
              </label>
              <mat-form-field appearance="outline" class="full-width">
                <input matInput [(ngModel)]="username" name="username" required
                       placeholder="Enter your username" autocomplete="username">
              </mat-form-field>
            </div>

            <div class="field-group">
              <label class="field-label">
                <mat-icon>lock_outline</mat-icon>
                {{ 'auth.password' | translate }}
              </label>
              <mat-form-field appearance="outline" class="full-width">
                <input matInput [type]="showPassword ? 'text' : 'password'"
                       [(ngModel)]="password" name="password" required
                       placeholder="Enter your password" autocomplete="current-password">
                <button mat-icon-button matSuffix (click)="showPassword = !showPassword" type="button">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
            </div>

            @if (error) {
              <div class="error-box">
                <mat-icon>error_outline</mat-icon>
                <span>{{ 'auth.loginError' | translate }}</span>
              </div>
            }

            <button mat-raised-button type="submit" class="login-btn" [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>login</mat-icon>
                <span>{{ 'auth.loginButton' | translate }}</span>
              }
            </button>
          </form>

          <!-- Footer info -->
          <div class="login-footer">
            <div class="footer-line">
              <mat-icon>security</mat-icon>
              <span>256-bit TLS Encrypted Connection</span>
            </div>
            <div class="footer-line">
              <mat-icon>verified_user</mat-icon>
              <span>African Union Authorized Personnel Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: #0a0e17;
      position: relative;
      overflow: hidden;
      color: #c0c8d8;
    }

    /* Animated grid background */
    .grid-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image:
        linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      z-index: 0;
    }

    /* Scanning line */
    .scan-line {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.4), transparent);
      animation: scan 4s linear infinite;
      z-index: 1;
    }
    @keyframes scan {
      0% { top: 0; }
      100% { top: 100%; }
    }

    .login-topbar {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      padding: 12px 24px;
    }
    .back-link {
      color: #5a6a8a;
      text-decoration: none;
      display: flex;
      align-items: center;
      &:hover { color: #00ff88; }
    }
    .spacer { flex: 1; }

    .login-center {
      position: relative;
      z-index: 10;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
    }

    .login-card {
      width: 420px;
      max-width: 90vw;
      background: rgba(12, 18, 30, 0.95);
      border: 1px solid rgba(0, 255, 136, 0.15);
      border-radius: 8px;
      padding: 40px 32px;
      box-shadow: 0 0 40px rgba(0, 255, 136, 0.05), 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    /* Logo area */
    .logo-area {
      text-align: center;
      margin-bottom: 32px;
    }
    .shield-icon {
      width: 64px; height: 64px;
      margin: 0 auto 12px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.15));
      border: 2px solid rgba(0,255,136,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 32px;
        width: 32px; height: 32px;
        color: #00ff88;
      }
    }
    .logo-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #e8edf5;
      margin: 8px 0 4px;
    }
    .logo-subtitle {
      font-size: 11px;
      letter-spacing: 3px;
      color: #5a6a8a;
      text-transform: uppercase;
      margin: 0;
    }
    .status-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 12px;
      font-size: 11px;
      color: #00ff88;
      letter-spacing: 1px;
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #00ff88;
      box-shadow: 0 0 8px #00ff88;
      animation: blink 2s ease-in-out infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* Form */
    .login-form { margin-bottom: 24px; }

    .field-group { margin-bottom: 4px; }
    .field-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #5a6a8a;
      margin-bottom: 4px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .full-width { width: 100%; }

    :host ::ng-deep {
      .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__leading,
      .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__trailing,
      .mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline__notch {
        border-color: rgba(0, 255, 136, 0.2) !important;
      }
      .mat-mdc-form-field .mdc-text-field--outlined:hover .mdc-notched-outline__leading,
      .mat-mdc-form-field .mdc-text-field--outlined:hover .mdc-notched-outline__trailing,
      .mat-mdc-form-field .mdc-text-field--outlined:hover .mdc-notched-outline__notch {
        border-color: rgba(0, 255, 136, 0.4) !important;
      }
      .mat-mdc-form-field .mdc-text-field--outlined.mdc-text-field--focused .mdc-notched-outline__leading,
      .mat-mdc-form-field .mdc-text-field--outlined.mdc-text-field--focused .mdc-notched-outline__trailing,
      .mat-mdc-form-field .mdc-text-field--outlined.mdc-text-field--focused .mdc-notched-outline__notch {
        border-color: #00ff88 !important;
      }
      .mat-mdc-input-element {
        color: #e0e8f0 !important;
        caret-color: #00ff88;
      }
      .mdc-text-field--filled { background-color: rgba(0,0,0,0.3) !important; }
      .mat-mdc-form-field-subscript-wrapper { display: none; }
    }

    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(211, 47, 47, 0.12);
      border: 1px solid rgba(211, 47, 47, 0.3);
      border-radius: 4px;
      color: #ef5350;
      font-size: 13px;
      margin-bottom: 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .login-btn {
      width: 100%;
      height: 44px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      background: linear-gradient(135deg, #00cc6a, #00aa55) !important;
      color: #0a0e17 !important;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      mat-icon { font-size: 20px; }
      &:hover { background: linear-gradient(135deg, #00dd77, #00bb66) !important; }
      &:disabled { background: #333 !important; color: #666 !important; }
    }

    /* Footer */
    .login-footer {
      border-top: 1px solid rgba(0, 255, 136, 0.08);
      padding-top: 16px;
    }
    .footer-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #3a4a6a;
      margin-bottom: 6px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: #2a3a5a; }
    }
  `]
})
export class LoginComponent {
  username = 'admin';
  password = 'Admin123!';
  error = '';
  loading = false;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.error = '';
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.error = 'error';
        this.loading = false;
      }
    });
  }
}
