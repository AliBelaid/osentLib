import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, interval, switchMap } from 'rxjs';
import { AfricaMapBaseComponent } from '../../../shared/components/africa-map-base.component';
import { StatsService } from '../../../core/services/stats.service';
import { ThreatActivityDto } from '../../../core/models';

@Component({
  selector: 'app-threat-map',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatListModule, TranslateModule, AfricaMapBaseComponent],
  template: `
    <div class="threat-map-layout">
      <div class="map-area">
        <app-africa-map-base
          [countryData]="countryThreatMap"
          [maxValue]="5"
          (countryClick)="onCountryClick($event)"
        />
      </div>
      <div class="map-side-panel">
        <h3><mat-icon>gps_fixed</mat-icon> {{ 'maps.activeThreats' | translate }}</h3>
        <div class="threat-feed">
          @for (item of threats; track item.id + item.timestamp) {
            <div class="threat-feed-item">
              <span class="severity-dot" [style.background]="getSeverityColor(item.severity)"></span>
              <div>
                <div class="feed-title">{{ item.title | slice:0:80 }}</div>
                <div class="feed-meta">
                  <span class="feed-country">{{ item.sourceCountryCode }}</span>
                  <span class="feed-time">{{ item.timestamp | date:'short' }}</span>
                </div>
              </div>
            </div>
          }
          @if (threats.length === 0) {
            <p class="no-data">{{ 'maps.noData' | translate }}</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .threat-map-layout { display: flex; gap: 16px; }
    .map-area { flex: 1; min-width: 0; }
    .map-side-panel { width: 320px; flex-shrink: 0; }
    .map-side-panel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; }
    .threat-feed { max-height: calc(100vh - 280px); overflow-y: auto; }
    .threat-feed-item { display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .severity-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .feed-title { font-size: 13px; margin-bottom: 2px; }
    .feed-meta { display: flex; gap: 8px; font-size: 11px; color: #999; }
    .feed-country { font-weight: 500; }
    .no-data { color: #999; text-align: center; padding: 24px; }
    @media (max-width: 900px) {
      .threat-map-layout { flex-direction: column; }
      .map-side-panel { width: 100%; }
    }
  `]
})
export class ThreatMapComponent implements OnInit, OnDestroy {
  threats: ThreatActivityDto[] = [];
  countryThreatMap = new Map<string, number>();
  private pollSub?: Subscription;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.loadData();
    this.pollSub = interval(30000).pipe(
      switchMap(() => this.statsService.getThreatFeed(50))
    ).subscribe(data => this.processData(data));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  loadData(): void {
    this.statsService.getThreatFeed(50).subscribe(data => this.processData(data));
  }

  processData(data: ThreatActivityDto[]): void {
    this.threats = data;
    const map = new Map<string, number>();
    data.forEach(t => {
      const cur = map.get(t.targetCountryCode) ?? 0;
      map.set(t.targetCountryCode, Math.max(cur, t.severity));
    });
    this.countryThreatMap = map;
  }

  getSeverityColor(sev: number): string {
    if (sev >= 5) return '#b71c1c';
    if (sev >= 4) return '#d32f2f';
    if (sev >= 3) return '#ff9800';
    if (sev >= 2) return '#ffc107';
    return '#4caf50';
  }

  onCountryClick(code: string): void {
    // Could navigate to alert details
  }
}
