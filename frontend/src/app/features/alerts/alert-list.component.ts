import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AlertService } from '../../core/services/alert.service';
import { AlertDto } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, ThreatBadgeComponent
  ],
  template: `
    <h2>Alerts</h2>

    @for (alert of alerts; track alert.id) {
      <mat-card [class.acknowledged]="!alert.isActive" class="alert-card">
        <mat-card-header>
          <mat-card-title>{{ alert.title }}</mat-card-title>
          <mat-card-subtitle>{{ alert.createdAt | date:'medium' }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>{{ alert.message }}</p>
          <div class="meta">
            <app-threat-badge [level]="alert.severity" />
            <mat-chip>{{ alert.countryCode }}</mat-chip>
            @if (alert.acknowledgedAt) {
              <span class="ack">Acknowledged {{ alert.acknowledgedAt | date:'medium' }}</span>
            }
          </div>
        </mat-card-content>
        <mat-card-actions>
          @if (alert.isActive) {
            <button mat-button color="primary" (click)="acknowledge(alert)">
              <mat-icon>check</mat-icon> Acknowledge
            </button>
          }
          @if (alert.articleId) {
            <a mat-button [routerLink]="['/news', alert.articleId]">View Article</a>
          }
        </mat-card-actions>
      </mat-card>
    }

    @if (alerts.length === 0) {
      <mat-card><mat-card-content>No alerts found.</mat-card-content></mat-card>
    }
  `,
  styles: [`
    h2 { color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .alert-card { margin-bottom: 12px; }
    .alert-card ::ng-deep .mat-mdc-card-title { color: var(--text-primary) !important; font-size: 16px; }
    .alert-card ::ng-deep .mat-mdc-card-subtitle { color: var(--text-secondary) !important; }
    .alert-card p { color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
    .acknowledged { opacity: 0.6; }
    .meta { display: flex; gap: 8px; align-items: center; }
    .ack { color: #00e676; font-size: 0.9em; }
    mat-card-actions a, mat-card-actions button { color: #667eea !important; }
  `]
})
export class AlertListComponent implements OnInit {
  alerts: AlertDto[] = [];

  constructor(private alertService: AlertService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.alertService.listAlerts().subscribe(data => this.alerts = data);
  }

  acknowledge(alert: AlertDto) {
    this.alertService.acknowledge(alert.id).subscribe(() => this.load());
  }
}
