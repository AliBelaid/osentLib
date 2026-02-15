import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { DarkModeToggleComponent } from '../../shared/components/dark-mode-toggle.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule,
    MatToolbarModule, TranslateModule, DarkModeToggleComponent, LanguageSelectorComponent
  ],
  template: `
    <div class="landing-page">
      <nav class="landing-nav">
        <div class="nav-brand">
          <mat-icon class="brand-icon">shield</mat-icon>
          <span class="brand-text">AU Sentinel</span>
        </div>
        <div class="nav-actions">
          <app-language-selector />
          <app-dark-mode-toggle />
          <a mat-raised-button color="primary" routerLink="/login">
            {{ 'landing.signIn' | translate }}
          </a>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">{{ 'landing.title' | translate }}</h1>
          <p class="hero-subtitle">{{ 'landing.subtitle' | translate }}</p>
          <p class="hero-desc">{{ 'landing.description' | translate }}</p>
          <a mat-raised-button color="accent" routerLink="/login" class="hero-cta">
            <mat-icon>login</mat-icon>
            {{ 'landing.signIn' | translate }}
          </a>
        </div>
      </section>

      <section class="features">
        <div class="features-grid">
          <mat-card class="feature-card" *ngFor="let f of features">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon" [style.color]="f.color">{{ f.icon }}</mat-icon>
              <mat-card-title>{{ f.titleKey | translate }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>{{ f.descKey | translate }}</p>
            </mat-card-content>
          </mat-card>
        </div>
      </section>

      <footer class="landing-footer">
        <p>&copy; 2024 African Union - AU Sentinel Platform</p>
      </footer>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #283593 30%, #1565c0 70%, #0d47a1 100%);
      color: #fff;
    }

    .landing-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 32px;
      background: rgba(0,0,0,0.2);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-icon { font-size: 32px; width: 32px; height: 32px; }
    .brand-text { font-size: 20px; font-weight: 600; }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hero {
      text-align: center;
      padding: 80px 24px 60px;
    }
    .hero-content { max-width: 700px; margin: 0 auto; }
    .hero-title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 16px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .hero-subtitle {
      font-size: 22px;
      opacity: 0.9;
      margin-bottom: 12px;
    }
    .hero-desc {
      font-size: 16px;
      opacity: 0.8;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .hero-cta {
      font-size: 16px;
      padding: 8px 32px;
      mat-icon { margin-right: 8px; }
    }

    .features {
      padding: 40px 24px 60px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
    }
    .feature-card {
      background: rgba(255,255,255,0.1) !important;
      backdrop-filter: blur(10px);
      color: #fff !important;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .feature-card mat-card-title {
      color: #fff !important;
      font-size: 18px !important;
    }
    .feature-card mat-card-content p {
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      line-height: 1.5;
    }
    .feature-icon {
      font-size: 36px !important;
      width: 36px !important;
      height: 36px !important;
      background: none !important;
    }

    .landing-footer {
      text-align: center;
      padding: 24px;
      opacity: 0.6;
      font-size: 13px;
    }
  `]
})
export class LandingComponent implements OnInit {
  features = [
    { icon: 'article', titleKey: 'landing.feature1Title', descKey: 'landing.feature1Desc', color: '#4fc3f7' },
    { icon: 'notifications_active', titleKey: 'landing.feature2Title', descKey: 'landing.feature2Desc', color: '#ff8a65' },
    { icon: 'dns', titleKey: 'landing.feature3Title', descKey: 'landing.feature3Desc', color: '#81c784' },
    { icon: 'public', titleKey: 'landing.feature4Title', descKey: 'landing.feature4Desc', color: '#ce93d8' }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }
}
