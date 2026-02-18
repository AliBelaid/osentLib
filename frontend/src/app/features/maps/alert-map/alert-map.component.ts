import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AfricaMapBaseComponent } from '../../../shared/components/africa-map-base.component';
import { StatsService } from '../../../core/services/stats.service';
import { AlertService } from '../../../core/services/alert.service';
import { CountryStatsDto, AlertDto } from '../../../core/models';
import { ThreatBadgeComponent } from '../../../shared/components/threat-badge.component';

@Component({
  selector: 'app-alert-map',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatButtonModule, FormsModule, TranslateModule,
    AfricaMapBaseComponent, ThreatBadgeComponent
  ],
  template: `
    <div class="alert-map-layout">
      <div class="map-area">
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="region-select">
            <mat-label>{{ 'maps.region' | translate }}</mat-label>
            <mat-select [(value)]="selectedRegion" (selectionChange)="loadData()">
              <mat-option value="">{{ 'maps.allRegions' | translate }}</mat-option>
              <mat-option value="North">North Africa</mat-option>
              <mat-option value="West">West Africa</mat-option>
              <mat-option value="East">East Africa</mat-option>
              <mat-option value="Central">Central Africa</mat-option>
              <mat-option value="South">Southern Africa</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <app-africa-map-base
          [countryData]="alertCountMap"
          [maxValue]="maxAlerts"
          (countryClick)="onCountryClick($event)"
        />
      </div>
      <div class="map-side-panel">
        @if (selectedCountry) {
          <h3><mat-icon>info</mat-icon> {{ 'maps.countryDetails' | translate }}</h3>
          <mat-card class="country-card">
            <mat-card-header>
              <mat-card-title>{{ selectedCountry.name }}</mat-card-title>
              <mat-card-subtitle>{{ selectedCountry.region }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-row">
                <span>{{ 'maps.totalAlerts' | translate }}:</span>
                <strong>{{ selectedCountry.alertCount }}</strong>
              </div>
              <div class="stat-row">
                <span>{{ 'maps.activeThreats' | translate }}:</span>
                <strong>{{ selectedCountry.activeAlertCount }}</strong>
              </div>
              <div class="stat-row">
                <span>{{ 'news.articleCount' | translate: { count: selectedCountry.articleCount } }}:</span>
                <strong>{{ selectedCountry.articleCount }}</strong>
              </div>
              <div class="stat-row">
                <span>{{ 'news.threatLevel' | translate }}:</span>
                <strong [class]="getThreatClass(selectedCountry.maxThreatLevel)">
                  {{ selectedCountry.maxThreatLevel }}/5
                </strong>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Alert List for Selected Country -->
          @if (countryAlerts.length > 0) {
            <h3 class="alerts-heading">
              <mat-icon>notifications</mat-icon>
              {{ 'maps.recentArticles' | translate }}
              <span class="alert-count-badge">{{ countryAlerts.length }}</span>
            </h3>
            <div class="alerts-list">
              @for (alert of countryAlerts; track alert.id) {
                <div class="alert-item" [class]="'severity-border-' + alert.severity"
                     [routerLink]="alert.articleId ? ['/news', alert.articleId] : null"
                     [class.clickable]="!!alert.articleId">
                  <div class="alert-header">
                    <app-threat-badge [level]="alert.severity" />
                    <span class="alert-time">{{ alert.createdAt | date:'short' }}</span>
                  </div>
                  <div class="alert-title">{{ alert.title }}</div>
                  <div class="alert-message">{{ alert.message }}</div>
                  @if (alert.articleId) {
                    <div class="alert-nav">
                      <mat-icon>open_in_new</mat-icon>
                      <span>{{ 'news.viewDetail' | translate }}</span>
                    </div>
                  }
                  @if (!alert.isActive && alert.acknowledgedAt) {
                    <div class="alert-ack">
                      <mat-icon>check_circle</mat-icon>
                      {{ 'alerts.acknowledged' | translate }}
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="no-alerts">
              <mat-icon>check_circle</mat-icon>
              <p>{{ 'alerts.noActiveAlerts' | translate }}</p>
            </div>
          }

          <!-- Navigation buttons -->
          <div class="nav-actions">
            <button mat-raised-button color="primary" routerLink="/alerts">
              <mat-icon>notifications</mat-icon>
              {{ 'alerts.title' | translate }}
            </button>
            <button mat-raised-button routerLink="/news" [queryParams]="{country: selectedCountry.countryCode}">
              <mat-icon>article</mat-icon>
              {{ 'nav.news' | translate }}
            </button>
          </div>
        } @else {
          <div class="select-prompt">
            <mat-icon>touch_app</mat-icon>
            <p>Click a country on the map to see details</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .alert-map-layout { display: flex; gap: 16px; }
    .map-area { flex: 1; min-width: 0; }
    .filter-bar { margin-bottom: 12px; }
    .region-select { width: 200px; }
    .map-side-panel {
      width: 360px; flex-shrink: 0;
      max-height: calc(100vh - 200px); overflow-y: auto;
    }
    .map-side-panel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--text-primary); }
    .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-default); }

    .alerts-heading {
      margin-top: 20px;
    }
    .alert-count-badge {
      background: #667eea; color: #fff; border-radius: 12px;
      padding: 2px 8px; font-size: 12px; font-weight: 600; margin-left: auto;
    }

    .alerts-list {
      display: flex; flex-direction: column; gap: 8px;
    }
    .alert-item {
      background: var(--bg-card); border-radius: 8px; padding: 12px;
      border-left: 3px solid #667eea;
      transition: all 0.2s;
    }
    .alert-item.clickable { cursor: pointer; }
    .alert-item.clickable:hover {
      background: rgba(102, 126, 234, 0.12);
      transform: translateX(2px);
    }
    .severity-border-1 { border-left-color: #00e676; }
    .severity-border-2 { border-left-color: #ffc107; }
    .severity-border-3 { border-left-color: #ff9100; }
    .severity-border-4 { border-left-color: #f44336; }
    .severity-border-5 { border-left-color: #ff1744; }

    .alert-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 6px;
    }
    .alert-time { font-size: 11px; color: var(--text-secondary); }
    .alert-title {
      font-size: 13px; font-weight: 600; color: var(--text-primary);
      margin-bottom: 4px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .alert-message {
      font-size: 12px; color: var(--text-secondary); line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }
    .alert-nav {
      display: flex; align-items: center; gap: 4px;
      margin-top: 8px; font-size: 12px; color: #667eea; font-weight: 500;
    }
    .alert-nav mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .alert-ack {
      display: flex; align-items: center; gap: 4px;
      margin-top: 6px; font-size: 11px; color: #00e676;
    }
    .alert-ack mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .no-alerts {
      text-align: center; padding: 24px; color: var(--text-secondary);
    }
    .no-alerts mat-icon {
      font-size: 36px; width: 36px; height: 36px; color: #00e676; margin-bottom: 8px;
    }

    .nav-actions {
      display: flex; gap: 8px; margin-top: 16px;
    }
    .nav-actions button { flex: 1; font-size: 12px; }

    .select-prompt { text-align: center; color: var(--text-secondary); padding: 40px 16px; }
    .select-prompt mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; color: #667eea; }
    @media (max-width: 900px) {
      .alert-map-layout { flex-direction: column; }
      .map-side-panel { width: 100%; max-height: none; }
    }
  `]
})
export class AlertMapComponent implements OnInit {
  allStats: CountryStatsDto[] = [];
  allAlerts: AlertDto[] = [];
  countryAlerts: AlertDto[] = [];
  alertCountMap = new Map<string, number>();
  maxAlerts = 10;
  selectedRegion = '';
  selectedCountry: CountryStatsDto | null = null;

  constructor(
    private statsService: StatsService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.alertService.listAlerts().subscribe(alerts => {
      this.allAlerts = alerts;
    });
  }

  loadData(): void {
    const region = this.selectedRegion || undefined;
    this.statsService.getCountryStats(region).subscribe(data => {
      this.allStats = data;
      const map = new Map<string, number>();
      let max = 1;
      data.forEach(c => {
        map.set(c.countryCode, c.alertCount);
        if (c.alertCount > max) max = c.alertCount;
      });
      this.alertCountMap = map;
      this.maxAlerts = max;
    });
  }

  onCountryClick(code: string): void {
    this.selectedCountry = this.allStats.find(c => c.countryCode === code) ?? null;
    this.countryAlerts = this.allAlerts
      .filter(a => a.countryCode === code)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  }

  getThreatClass(level: number): string {
    if (level >= 5) return 'threat-critical';
    if (level >= 4) return 'threat-high';
    if (level >= 3) return 'threat-elevated';
    if (level >= 2) return 'threat-moderate';
    if (level >= 1) return 'threat-low';
    return 'threat-none';
  }
}
