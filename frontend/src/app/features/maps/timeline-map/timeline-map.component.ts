import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AfricaMapBaseComponent } from '../../../shared/components/africa-map-base.component';
import { StatsService } from '../../../core/services/stats.service';
import { TimelineBucketDto } from '../../../core/models';

@Component({
  selector: 'app-timeline-map',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatSliderModule, MatSelectModule,
    MatFormFieldModule, FormsModule, TranslateModule, AfricaMapBaseComponent
  ],
  template: `
    <div class="timeline-map">
      <app-africa-map-base
        [countryData]="currentCountryData"
        [maxValue]="maxValue"
      />
      <div class="timeline-controls">
        <button mat-icon-button (click)="togglePlay()">
          <mat-icon>{{ isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>
        <mat-slider class="timeline-slider" [min]="0" [max]="dates.length - 1" [step]="1" discrete>
          <input matSliderThumb [(ngModel)]="currentIndex" (input)="onSliderChange()">
        </mat-slider>
        <span class="date-label">{{ currentDateLabel }}</span>
        <mat-form-field appearance="outline" class="speed-select">
          <mat-label>{{ 'maps.speed' | translate }}</mat-label>
          <mat-select [(value)]="speed">
            <mat-option [value]="1">1x</mat-option>
            <mat-option [value]="2">2x</mat-option>
            <mat-option [value]="5">5x</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>
  `,
  styles: [`
    .timeline-map { display: flex; flex-direction: column; gap: 12px; }
    .timeline-controls {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; background: var(--bg-card); border-radius: 8px;
      border: 1px solid var(--border-default);
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .timeline-slider { flex: 1; }
    .date-label { font-size: 14px; font-weight: 500; min-width: 90px; text-align: center; }
    .speed-select { width: 80px; }
    .date-label { color: var(--text-primary); }
  `]
})
export class TimelineMapComponent implements OnInit, OnDestroy {
  allBuckets: TimelineBucketDto[] = [];
  dates: string[] = [];
  currentIndex = 0;
  currentCountryData = new Map<string, number>();
  maxValue = 5;
  isPlaying = false;
  speed = 1;
  currentDateLabel = '';
  private playInterval: any;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.stopPlay();
  }

  loadData(): void {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    this.statsService.getTimeline(from.toISOString(), new Date().toISOString()).subscribe(data => {
      this.allBuckets = data;
      const dateSet = new Set<string>();
      data.forEach(b => dateSet.add(b.date.split('T')[0]));
      this.dates = Array.from(dateSet).sort();
      if (this.dates.length > 0) {
        this.currentIndex = this.dates.length - 1;
        this.updateMap();
      }
    });
  }

  onSliderChange(): void {
    this.updateMap();
  }

  updateMap(): void {
    if (this.dates.length === 0) return;
    const date = this.dates[this.currentIndex];
    this.currentDateLabel = date;
    const map = new Map<string, number>();
    let max = 1;
    this.allBuckets
      .filter(b => b.date.startsWith(date))
      .forEach(b => {
        const val = b.alertCount + b.articleCount;
        map.set(b.countryCode, val);
        if (val > max) max = val;
      });
    this.currentCountryData = map;
    this.maxValue = max;
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }

  private startPlay(): void {
    this.isPlaying = true;
    if (this.currentIndex >= this.dates.length - 1) {
      this.currentIndex = 0;
    }
    this.playInterval = setInterval(() => {
      if (this.currentIndex < this.dates.length - 1) {
        this.currentIndex++;
        this.updateMap();
      } else {
        this.stopPlay();
      }
    }, 1000 / this.speed);
  }

  private stopPlay(): void {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
}
