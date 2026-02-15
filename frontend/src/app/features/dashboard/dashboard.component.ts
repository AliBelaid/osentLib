import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';
import { NewsService } from '../../core/services/news.service';
import { AlertService } from '../../core/services/alert.service';
import { StatsService } from '../../core/services/stats.service';
import { NewsArticleDto, AlertDto, DashboardSummaryDto } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatChipsModule,
    MatIconModule, MatButtonModule, MatButtonToggleModule, MatSelectModule,
    MatFormFieldModule, MatProgressBarModule, MatTooltipModule, MatBadgeModule,
    ThreatBadgeComponent, TranslateModule
  ],
  template: `
    <!-- Filter Bar -->
    <div class="filter-bar">
      <h2 class="page-title">
        <mat-icon>dashboard</mat-icon>
        {{ 'dashboard.title' | translate }}
      </h2>
      <div class="filters">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>{{ 'dashboard.category' | translate }}</mat-label>
          <mat-select [(ngModel)]="selectedCategory" (selectionChange)="loadSummary()">
            <mat-option value="">{{ 'dashboard.allCategories' | translate }}</mat-option>
            <mat-option value="Security">Security</mat-option>
            <mat-option value="Politics">Politics</mat-option>
            <mat-option value="Health">Health</mat-option>
            <mat-option value="Environment">Environment</mat-option>
            <mat-option value="Economy">Economy</mat-option>
            <mat-option value="Technology">Technology</mat-option>
            <mat-option value="Society">Society</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>{{ 'dashboard.region' | translate }}</mat-label>
          <mat-select [(ngModel)]="selectedRegion" (selectionChange)="loadSummary()">
            <mat-option value="">{{ 'dashboard.allRegions' | translate }}</mat-option>
            <mat-option value="Northern Africa">North Africa</mat-option>
            <mat-option value="Eastern Africa">East Africa</mat-option>
            <mat-option value="Western Africa">West Africa</mat-option>
            <mat-option value="Central Africa">Central Africa</mat-option>
            <mat-option value="Southern Africa">Southern Africa</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-button-toggle-group [(ngModel)]="selectedPeriod" (change)="loadSummary()" class="period-toggle">
          <mat-button-toggle value="24h">24h</mat-button-toggle>
          <mat-button-toggle value="7d">7d</mat-button-toggle>
          <mat-button-toggle value="30d">30d</mat-button-toggle>
          <mat-button-toggle value="">All</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
    </div>

    @if (loading) {
      <mat-progress-bar mode="indeterminate" class="loading-bar"></mat-progress-bar>
    }

    @if (summary) {
      <!-- Stats Row -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <div class="stat-icon articles-icon"><mat-icon>article</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.totalArticles | number }}</div>
            <div class="stat-label">{{ 'dashboard.totalArticles' | translate }}</div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon alerts-icon"><mat-icon>notifications_active</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.activeAlerts }}</div>
            <div class="stat-label">{{ 'dashboard.activeAlerts' | translate }}</div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon sources-icon"><mat-icon>source</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.osintSources.length }}</div>
            <div class="stat-label">{{ 'dashboard.osintSources' | translate }}</div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon threat-icon"><mat-icon>warning</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.avgThreatLevel | number:'1.1-1' }}</div>
            <div class="stat-label">{{ 'dashboard.avgThreat' | translate }}</div>
          </div>
        </mat-card>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- Articles by Source -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>bar_chart</mat-icon>
              {{ 'dashboard.articlesBySource' | translate }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (src of summary.articlesBySource; track src.sourceName) {
              <div class="bar-row">
                <span class="bar-label">{{ src.sourceName }}</span>
                <div class="bar-track">
                  <div class="bar-fill source-bar" [style.width.%]="getBarWidth(src.count, maxSourceCount)">
                    <span class="bar-value">{{ src.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Top Countries -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>public</mat-icon>
              {{ 'dashboard.topCountries' | translate }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (c of summary.topCountries.slice(0, 10); track c.key) {
              <div class="bar-row">
                <span class="bar-label flag-label">
                  <span class="country-flag">{{ getFlag(c.key) }}</span>
                  {{ c.key }}
                </span>
                <div class="bar-track">
                  <div class="bar-fill country-bar" [style.width.%]="getBarWidth(c.count, maxCountryCount)">
                    <span class="bar-value">{{ c.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Second Charts Row -->
      <div class="charts-row">
        <!-- Threat Distribution -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>shield</mat-icon>
              {{ 'dashboard.threatDistribution' | translate }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (t of summary.threatDistribution; track t.level) {
              <div class="bar-row">
                <span class="bar-label">
                  <app-threat-badge [level]="t.level" />
                  {{ t.label }}
                </span>
                <div class="bar-track">
                  <div class="bar-fill" [class]="'threat-bar threat-' + t.level"
                       [style.width.%]="getBarWidth(t.count, maxThreatCount)">
                    <span class="bar-value">{{ t.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Top Categories -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>category</mat-icon>
              {{ 'dashboard.topCategories' | translate }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (cat of summary.topCategories; track cat.key) {
              <div class="bar-row">
                <span class="bar-label">
                  <mat-icon class="cat-icon">{{ getCategoryIcon(cat.key) }}</mat-icon>
                  {{ cat.key }}
                </span>
                <div class="bar-track">
                  <div class="bar-fill category-bar" [style.width.%]="getBarWidth(cat.count, maxCategoryCount)">
                    <span class="bar-value">{{ cat.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Timeline -->
      <mat-card class="timeline-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>timeline</mat-icon>
            {{ 'dashboard.recentTimeline' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="timeline-chart">
            @for (point of summary.recentTimeline; track point.date) {
              <div class="timeline-bar-wrapper" [matTooltip]="point.date + ': ' + point.count + ' articles'">
                <div class="timeline-bar" [style.height.%]="getBarWidth(point.count, maxTimelineCount)"></div>
                <span class="timeline-label">{{ formatDay(point.date) }}</span>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- OSINT Sources Info -->
      <mat-card class="sources-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>hub</mat-icon>
            {{ 'dashboard.osintSourcesInfo' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="sources-grid">
            @for (src of summary.osintSources; track src.name) {
              <div class="source-item" [class.active]="src.isActive">
                <div class="source-header">
                  <mat-icon [class]="'source-type-icon ' + src.type.toLowerCase()">
                    {{ getSourceIcon(src.type) }}
                  </mat-icon>
                  <div>
                    <div class="source-name">{{ src.name }}</div>
                    <div class="source-type">{{ src.type }}</div>
                  </div>
                  <mat-chip class="source-count">{{ src.articleCount }} articles</mat-chip>
                </div>
                <div class="source-desc">{{ src.description }}</div>
                <div class="source-url">
                  <mat-icon>link</mat-icon>
                  <a [href]="src.url" target="_blank" rel="noopener">{{ src.url }}</a>
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }

    <!-- Important News -->
    <h3 class="section-title">
      <mat-icon>local_fire_department</mat-icon>
      {{ 'dashboard.importantNews' | translate }}
    </h3>
    <div class="news-grid">
      @for (article of importantNews; track article.id) {
        <mat-card class="news-card" [routerLink]="['/news', article.id]" style="cursor:pointer">
          <mat-card-header>
            <mat-card-title>{{ article.title }}</mat-card-title>
            <mat-card-subtitle>
              {{ article.sourceName }} &middot; {{ article.publishedAt | date:'medium' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="news-summary">{{ article.summary }}</p>
            <div class="news-meta">
              <app-threat-badge [level]="article.threatLevel" />
              @for (tag of article.countryTags?.slice(0, 3); track tag) {
                <mat-chip class="country-chip">{{ getFlag(tag) }} {{ tag }}</mat-chip>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>

    <!-- Active Alerts -->
    <h3 class="section-title">
      <mat-icon>warning</mat-icon>
      {{ 'dashboard.activeAlertsList' | translate }}
    </h3>
    <div class="alerts-list">
      @for (alert of activeAlerts.slice(0, 10); track alert.id) {
        <mat-card class="alert-card" [class]="'severity-' + alert.severity">
          <div class="alert-content">
            <app-threat-badge [level]="alert.severity" />
            <div class="alert-info">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-meta">
                {{ getFlag(alert.countryCode) }} {{ alert.countryCode }} &middot;
                {{ alert.createdAt | date:'short' }}
              </div>
            </div>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; padding: 0 16px 32px; }

    .filter-bar {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; margin-bottom: 16px;
    }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 24px; font-weight: 600; margin: 0;
      color: #e0e6f0;
    }
    .page-title mat-icon { color: #667eea; }
    .filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .filter-field { width: 160px; }
    .filter-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .period-toggle { height: 40px; }

    .loading-bar { margin-bottom: 16px; }

    /* Stats Row */
    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;
    }
    .stat-card {
      display: flex; flex-direction: row; align-items: center; gap: 16px;
      padding: 20px !important;
    }
    .stat-icon {
      width: 52px; height: 52px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: #fff; }
    .articles-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
    .alerts-icon { background: linear-gradient(135deg, #f093fb, #f5576c); }
    .sources-icon { background: linear-gradient(135deg, #4facfe, #00f2fe); }
    .threat-icon { background: linear-gradient(135deg, #fa709a, #fee140); }
    .stat-value { font-size: 28px; font-weight: 700; line-height: 1.2; color: #e0e6f0; }
    .stat-label { font-size: 13px; color: #8892a4; }

    /* Charts */
    .charts-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;
    }
    .chart-card mat-card-title {
      display: flex; align-items: center; gap: 6px; font-size: 16px; color: #e0e6f0;
    }
    .chart-card mat-card-title mat-icon { color: #667eea; }
    .bar-row {
      display: flex; align-items: center; gap: 8px; margin: 6px 0;
    }
    .bar-label {
      min-width: 110px; font-size: 13px; font-weight: 500; color: #e0e6f0;
      display: flex; align-items: center; gap: 4px;
    }
    .flag-label { min-width: 80px; }
    .country-flag { font-size: 16px; }
    .bar-track {
      flex: 1; height: 24px; background: rgba(128,128,128,0.1);
      border-radius: 4px; overflow: hidden;
    }
    .bar-fill {
      height: 100%; border-radius: 4px; min-width: 24px;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px; transition: width 0.5s ease;
    }
    .bar-value { font-size: 11px; font-weight: 600; color: #fff; }
    .source-bar { background: linear-gradient(90deg, #667eea, #764ba2); }
    .country-bar { background: linear-gradient(90deg, #4facfe, #00f2fe); }
    .category-bar { background: linear-gradient(90deg, #43e97b, #38f9d7); }
    .cat-icon { font-size: 16px; width: 16px; height: 16px; }
    .threat-1 { background: linear-gradient(90deg, #a8e6cf, #88d8a8); }
    .threat-2 { background: linear-gradient(90deg, #ffd3b6, #ffaaa5); }
    .threat-3 { background: linear-gradient(90deg, #fcb045, #fd1d1d); }
    .threat-4 { background: linear-gradient(90deg, #f5576c, #f093fb); }
    .threat-5 { background: linear-gradient(90deg, #d31027, #ea384d); }

    /* Timeline */
    .timeline-card { margin-bottom: 20px; }
    .timeline-chart {
      display: flex; align-items: flex-end; gap: 8px;
      height: 120px; padding: 12px 0;
    }
    .timeline-bar-wrapper {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; height: 100%;
      justify-content: flex-end;
    }
    .timeline-bar {
      width: 100%; min-height: 4px; border-radius: 4px 4px 0 0;
      background: linear-gradient(180deg, #667eea, #764ba2);
      transition: height 0.5s ease;
    }
    .timeline-label { font-size: 10px; margin-top: 4px; color: #8892a4; }

    /* Sources Info */
    .sources-card { margin-bottom: 24px; }
    .sources-card mat-card-title {
      display: flex; align-items: center; gap: 6px; font-size: 16px; color: #e0e6f0;
    }
    .sources-card mat-card-title mat-icon { color: #667eea; }
    .sources-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px; margin-top: 8px;
    }
    .source-item {
      border: 1px solid rgba(128,128,128,0.2); border-radius: 12px;
      padding: 16px; transition: all 0.2s;
    }
    .source-item:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.15); }
    .source-item.active { border-left: 3px solid #4caf50; }
    .source-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .source-type-icon { font-size: 28px; width: 28px; height: 28px; }
    .source-type-icon.gdelt { color: #667eea; }
    .source-type-icon.allafrica { color: #ff9800; }
    .source-type-icon.reliefweb { color: #e53935; }
    .source-type-icon.who { color: #2196f3; }
    .source-type-icon.unnews { color: #00bcd4; }
    .source-name { font-weight: 600; font-size: 14px; color: #e0e6f0; }
    .source-type { font-size: 11px; color: #667eea; text-transform: uppercase; }
    .source-count { margin-left: auto !important; font-size: 12px; }
    .source-desc { font-size: 12px; color: #8892a4; line-height: 1.4; margin-bottom: 6px; }
    .source-url {
      display: flex; align-items: center; gap: 4px; font-size: 11px;
    }
    .source-url mat-icon { font-size: 14px; width: 14px; height: 14px; opacity: 0.5; }
    .source-url a { color: #667eea; text-decoration: none; word-break: break-all; }
    .source-url a:hover { text-decoration: underline; }

    /* News */
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 18px; font-weight: 600; margin: 24px 0 12px;
      color: #e0e6f0;
    }
    .section-title mat-icon { color: #667eea; }
    .news-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .news-card { transition: transform 0.2s; }
    .news-card:hover { transform: translateY(-2px); }
    .news-card ::ng-deep .mat-mdc-card-title { color: #e0e6f0 !important; font-size: 15px; }
    .news-card ::ng-deep .mat-mdc-card-subtitle { color: #8892a4 !important; }
    .news-summary {
      font-size: 13px; color: #8892a4; line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .news-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .country-chip { font-size: 11px !important; }

    /* Alerts List */
    .alerts-list { display: flex; flex-direction: column; gap: 8px; }
    .alert-card { padding: 12px 16px !important; }
    .alert-content { display: flex; align-items: center; gap: 12px; }
    .alert-info { flex: 1; }
    .alert-title { font-size: 14px; font-weight: 500; color: #e0e6f0; }
    .alert-meta { font-size: 12px; color: #8892a4; margin-top: 2px; }
    .severity-4 { border-left: 3px solid #f44336; }
    .severity-5 { border-left: 3px solid #d32f2f; background: rgba(244,67,54,0.04); }
    .severity-3 { border-left: 3px solid #ff9800; }

    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .filter-bar { flex-direction: column; align-items: stretch; }
    }
    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  summary: DashboardSummaryDto | null = null;
  importantNews: NewsArticleDto[] = [];
  activeAlerts: AlertDto[] = [];
  loading = true;

  selectedCategory = '';
  selectedRegion = '';
  selectedPeriod = '7d';

  maxSourceCount = 1;
  maxCountryCount = 1;
  maxThreatCount = 1;
  maxCategoryCount = 1;
  maxTimelineCount = 1;

  private flagMap: Record<string, string> = {
    'DZ': '\u{1F1E9}\u{1F1FF}', 'AO': '\u{1F1E6}\u{1F1F4}', 'BJ': '\u{1F1E7}\u{1F1EF}', 'BW': '\u{1F1E7}\u{1F1FC}',
    'BF': '\u{1F1E7}\u{1F1EB}', 'BI': '\u{1F1E7}\u{1F1EE}', 'CM': '\u{1F1E8}\u{1F1F2}', 'TD': '\u{1F1F9}\u{1F1E9}',
    'CD': '\u{1F1E8}\u{1F1E9}', 'CG': '\u{1F1E8}\u{1F1EC}', 'EG': '\u{1F1EA}\u{1F1EC}', 'ET': '\u{1F1EA}\u{1F1F9}',
    'GA': '\u{1F1EC}\u{1F1E6}', 'GH': '\u{1F1EC}\u{1F1ED}', 'GN': '\u{1F1EC}\u{1F1F3}', 'CI': '\u{1F1E8}\u{1F1EE}',
    'KE': '\u{1F1F0}\u{1F1EA}', 'LY': '\u{1F1F1}\u{1F1FE}', 'MG': '\u{1F1F2}\u{1F1EC}', 'ML': '\u{1F1F2}\u{1F1F1}',
    'MA': '\u{1F1F2}\u{1F1E6}', 'MZ': '\u{1F1F2}\u{1F1FF}', 'NA': '\u{1F1F3}\u{1F1E6}', 'NE': '\u{1F1F3}\u{1F1EA}',
    'NG': '\u{1F1F3}\u{1F1EC}', 'RW': '\u{1F1F7}\u{1F1FC}', 'SN': '\u{1F1F8}\u{1F1F3}', 'SO': '\u{1F1F8}\u{1F1F4}',
    'ZA': '\u{1F1FF}\u{1F1E6}', 'SS': '\u{1F1F8}\u{1F1F8}', 'SD': '\u{1F1F8}\u{1F1E9}', 'TZ': '\u{1F1F9}\u{1F1FF}',
    'TG': '\u{1F1F9}\u{1F1EC}', 'TN': '\u{1F1F9}\u{1F1F3}', 'UG': '\u{1F1FA}\u{1F1EC}', 'ZM': '\u{1F1FF}\u{1F1F2}',
    'ZW': '\u{1F1FF}\u{1F1FC}', 'ER': '\u{1F1EA}\u{1F1F7}', 'DJ': '\u{1F1E9}\u{1F1EF}', 'MW': '\u{1F1F2}\u{1F1FC}',
    'MR': '\u{1F1F2}\u{1F1F7}', 'SL': '\u{1F1F8}\u{1F1F1}', 'LR': '\u{1F1F1}\u{1F1F7}', 'CF': '\u{1F1E8}\u{1F1EB}',
  };

  constructor(
    private newsService: NewsService,
    private alertService: AlertService,
    private statsService: StatsService
  ) {}

  ngOnInit() {
    this.loadSummary();
    this.newsService.getImportant(6).subscribe(data => this.importantNews = data);
    this.alertService.listAlerts(true).subscribe(data => this.activeAlerts = data);
  }

  loadSummary() {
    this.loading = true;
    this.statsService.getDashboardSummary(
      this.selectedCategory || undefined,
      this.selectedRegion || undefined,
      this.selectedPeriod || undefined
    ).subscribe({
      next: data => {
        this.summary = data;
        this.maxSourceCount = Math.max(1, ...data.articlesBySource.map(s => s.count));
        this.maxCountryCount = Math.max(1, ...(data.topCountries?.map(c => c.count) || [1]));
        this.maxThreatCount = Math.max(1, ...(data.threatDistribution?.map(t => t.count) || [1]));
        this.maxCategoryCount = Math.max(1, ...(data.topCategories?.map(c => c.count) || [1]));
        this.maxTimelineCount = Math.max(1, ...(data.recentTimeline?.map(p => p.count) || [1]));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getBarWidth(value: number, max: number): number {
    return max > 0 ? Math.max(5, (value / max) * 100) : 5;
  }

  getFlag(code: string): string {
    return this.flagMap[code] || code;
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Security': 'security', 'Politics': 'gavel', 'Health': 'local_hospital',
      'Environment': 'eco', 'Economy': 'trending_up', 'Technology': 'computer',
      'Society': 'people'
    };
    return icons[cat] || 'label';
  }

  getSourceIcon(type: string): string {
    const icons: Record<string, string> = {
      'GDELT': 'language', 'AllAfrica': 'public', 'ReliefWeb': 'volunteer_activism',
      'WHO': 'health_and_safety', 'UNNews': 'account_balance'
    };
    return icons[type] || 'rss_feed';
  }

  formatDay(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en', { weekday: 'short' });
  }
}
