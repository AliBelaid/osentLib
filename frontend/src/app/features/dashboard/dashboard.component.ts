import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { NewsService } from '../../core/services/news.service';
import { AlertService } from '../../core/services/alert.service';
import { NewsArticleDto, TrendResult, AlertDto } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatChipsModule,
    MatIconModule, MatButtonModule, ThreatBadgeComponent, TranslateModule
  ],
  template: `
    <h2>{{ 'dashboard.title' | translate }}</h2>

    <div class="dashboard-grid">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.activeAlerts' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="stat-number">{{ activeAlerts.length }}</div>
          @for (alert of activeAlerts.slice(0, 5); track alert.id) {
            <div class="alert-item">
              <app-threat-badge [level]="alert.severity" />
              <span>{{ alert.title }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.topCategories' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-chip-set>
            @for (cat of trends?.topCategories?.slice(0, 8); track cat.key) {
              <mat-chip>{{ cat.key }} ({{ cat.count }})</mat-chip>
            }
          </mat-chip-set>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.threatDistribution' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @for (t of trends?.threatDistribution; track t.level) {
            <div class="threat-row">
              <app-threat-badge [level]="t.level" />
              <span>Level {{ t.level }}: {{ t.count }} articles</span>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>

    <h3>{{ 'dashboard.importantNews' | translate }}</h3>
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
            <p>{{ article.summary }}</p>
            <div>
              <app-threat-badge [level]="article.threatLevel" />
              @for (tag of article.countryTags; track tag) {
                <mat-chip>{{ tag }}</mat-chip>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .news-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 16px; }
    .stat-number { font-size: 48px; font-weight: 300; text-align: center; margin: 16px 0; }
    .alert-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .threat-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  `]
})
export class DashboardComponent implements OnInit {
  importantNews: NewsArticleDto[] = [];
  trends: TrendResult | null = null;
  activeAlerts: AlertDto[] = [];

  constructor(private newsService: NewsService, private alertService: AlertService) {}

  ngOnInit() {
    this.newsService.getImportant(6).subscribe(data => this.importantNews = data);
    this.newsService.getTrends('24h').subscribe(data => this.trends = data);
    this.alertService.listAlerts(true).subscribe(data => this.activeAlerts = data);
  }
}
