import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { IntelReportService } from '@core/services/intel-report.service';
import { IntelSignalRService } from '@core/services/intel-signalr.service';
import { IntelReportSummaryDto } from '@core/models';

@Component({
  selector: 'app-intel-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatPaginatorModule, TranslateModule
  ],
  template: `
    <div class="intel-header">
      <div class="header-left">
        <div class="title-row">
          <span class="pulse-dot"></span>
          <h2 class="page-title">{{ 'intel.title' | translate }}</h2>
          <span class="classified-badge">INTELLIGENCE</span>
        </div>
        <p class="header-subtitle">
          <mat-icon class="subtitle-icon">shield</mat-icon>
          {{ 'intel.subtitle' | translate }} &mdash; {{ total }} {{ 'intel.records' | translate }}
        </p>
      </div>
      <div class="header-right">
        @if (canCreate) {
          <button mat-raised-button class="new-btn" routerLink="/intelligence/new">
            <mat-icon>add_circle_outline</mat-icon>
            <span>{{ 'intel.newReport' | translate }}</span>
          </button>
        }
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>{{ 'intel.filterStatus' | translate }}</mat-label>
        <mat-select [(ngModel)]="filterStatus" (selectionChange)="load()">
          <mat-option value="">{{ 'common.all' | translate }}</mat-option>
          <mat-option value="active">{{ 'intel.statusActive' | translate }}</mat-option>
          <mat-option value="closed">{{ 'intel.statusClosed' | translate }}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>{{ 'intel.filterType' | translate }}</mat-label>
        <mat-select [(ngModel)]="filterType" (selectionChange)="load()">
          <mat-option value="">{{ 'common.all' | translate }}</mat-option>
          <mat-option value="threat">{{ 'intel.typeThreat' | translate }}</mat-option>
          <mat-option value="incident">{{ 'intel.typeIncident' | translate }}</mat-option>
          <mat-option value="surveillance">{{ 'intel.typeSurveillance' | translate }}</mat-option>
          <mat-option value="report">{{ 'intel.typeReport' | translate }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon-wrap active-icon"><mat-icon>shield</mat-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ activeCount }}</span>
          <span class="stat-label">{{ 'intel.statusActive' | translate }}</span>
        </div>
        <div class="stat-bar active-bar"></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap closed-icon"><mat-icon>check_circle</mat-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ closedCount }}</span>
          <span class="stat-label">{{ 'intel.statusClosed' | translate }}</span>
        </div>
        <div class="stat-bar closed-bar"></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap total-icon"><mat-icon>summarize</mat-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ total }}</span>
          <span class="stat-label">{{ 'intel.totalReports' | translate }}</span>
        </div>
        <div class="stat-bar total-bar"></div>
      </div>
    </div>

    <!-- Report Cards -->
    @for (r of reports; track r.id; let i = $index) {
      <div class="report-card" [style.animation-delay]="(i * 80) + 'ms'" [routerLink]="['/intelligence', r.id]" style="cursor: pointer;">
        <div class="severity-strip" [ngClass]="{
          'sev-critical': r.severity >= 5,
          'sev-high': r.severity === 4,
          'sev-elevated': r.severity === 3,
          'sev-moderate': r.severity === 2,
          'sev-low': r.severity <= 1
        }"></div>
        <div class="card-body">
          <div class="card-top-row">
            <span class="status-badge" [ngClass]="{'status-active': r.status === 'active', 'status-closed': r.status === 'closed'}">
              <span class="status-dot"></span>
              {{ r.status | uppercase }}
            </span>
            <span class="type-chip">{{ r.type | uppercase }}</span>
            <span class="severity-chip" [ngClass]="{
              'sev-chip-critical': r.severity >= 5,
              'sev-chip-high': r.severity === 4,
              'sev-chip-elevated': r.severity === 3,
              'sev-chip-moderate': r.severity === 2,
              'sev-chip-low': r.severity <= 1
            }">SEV {{ r.severity }}</span>
            <span class="spacer"></span>
            @if (r.attachmentCount > 0) {
              <span class="attachment-indicator"><mat-icon>attach_file</mat-icon> {{ r.attachmentCount }}</span>
            }
            @if (r.timelineCount > 0) {
              <span class="timeline-indicator"><mat-icon>chat_bubble_outline</mat-icon> {{ r.timelineCount }}</span>
            }
          </div>
          <h3 class="card-title">{{ r.title }}</h3>
          <div class="card-meta">
            <mat-icon class="meta-icon">person_outline</mat-icon>
            <span class="meta-text">{{ r.createdByName }}</span>
            <span class="meta-sep">//</span>
            <mat-icon class="meta-icon">flag</mat-icon>
            <span class="meta-text">{{ r.countryCode }}</span>
            <span class="meta-sep">//</span>
            <mat-icon class="meta-icon">schedule</mat-icon>
            <span class="meta-text">{{ r.createdAt | date:'dd MMM yyyy, HH:mm' }}</span>
          </div>
        </div>
      </div>
    }

    @if (reports.length === 0) {
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <mat-icon class="empty-icon">shield</mat-icon>
          <div class="empty-scan-line"></div>
        </div>
        <h3 class="empty-title">{{ 'intel.noReports' | translate }}</h3>
        <p class="empty-subtitle">{{ 'intel.noReportsDesc' | translate }}</p>
      </div>
    }

    <mat-paginator
      [length]="total"
      [pageSize]="pageSize"
      [pageIndex]="page - 1"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPage($event)">
    </mat-paginator>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg-page); padding: 32px 40px; color: var(--text-secondary); font-family: 'Inter', 'Roboto', sans-serif; }

    .intel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--border-default); }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: #00e676; box-shadow: 0 0 8px rgba(0,230,118,0.6); animation: pulse-glow 2s ease-in-out infinite; }
    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 6px rgba(0,230,118,0.4); opacity: 1; } 50% { box-shadow: 0 0 18px rgba(0,230,118,0.9); opacity: 0.7; } }
    .page-title { margin: 0; font-size: 1.65rem; font-weight: 700; letter-spacing: 0.5px; background: linear-gradient(135deg, #667eea 0%, #00d4ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .classified-badge { display: inline-flex; align-items: center; padding: 3px 12px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 2px; color: #667eea; border: 1px solid rgba(102,126,234,0.4); background: rgba(102,126,234,0.08); }
    .header-subtitle { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 0.82rem; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; }
    .subtitle-icon { font-size: 16px; width: 16px; height: 16px; color: #667eea; }
    .new-btn { display: flex; align-items: center; gap: 8px; padding: 10px 24px; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 600; color: #fff; background: linear-gradient(135deg, #667eea, #764ba2); box-shadow: 0 4px 20px rgba(102,126,234,0.35); cursor: pointer; transition: all 0.25s ease; text-transform: none; }
    .new-btn:hover { box-shadow: 0 6px 28px rgba(102,126,234,0.55); transform: translateY(-1px); }
    .new-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .filters-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .filter-field { width: 200px; }

    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
    .stat-card { position: relative; display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-default); overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s; }
    .stat-card:hover { border-color: rgba(255,255,255,0.12); box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
    .stat-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; }
    .active-bar { background: linear-gradient(90deg, transparent, #00e676); }
    .closed-bar { background: linear-gradient(90deg, transparent, #78909c); }
    .total-bar { background: linear-gradient(90deg, transparent, #667eea); }
    .stat-icon-wrap { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; }
    .active-icon { background: rgba(0,230,118,0.1); color: #00e676; }
    .closed-icon { background: rgba(120,144,156,0.1); color: #78909c; }
    .total-icon { background: rgba(102,126,234,0.1); color: #667eea; }
    .stat-icon-wrap mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; }
    .stat-label { font-size: 0.78rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

    .report-card { display: flex; margin-bottom: 16px; border-radius: 12px; background: var(--bg-card-glass); border: 1px solid var(--border-default); backdrop-filter: blur(16px); overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s; animation: card-fade-in 0.45s ease-out both; }
    .report-card:hover { border-color: rgba(102,126,234,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.35); transform: translateY(-2px); }
    @keyframes card-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .severity-strip { width: 4px; flex-shrink: 0; }
    .sev-critical { background: linear-gradient(180deg, #ff1744, #d50000); }
    .sev-high { background: linear-gradient(180deg, #ff5252, #ff1744); }
    .sev-elevated { background: linear-gradient(180deg, #ffa726, #ff9100); }
    .sev-moderate { background: linear-gradient(180deg, #ffee58, #ffc107); }
    .sev-low { background: linear-gradient(180deg, #00e676, #00c853); }

    .card-body { flex: 1; padding: 22px 28px; }
    .card-top-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .spacer { flex: 1; }

    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-active { color: #00e676; background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); }
    .status-active .status-dot { background: #00e676; box-shadow: 0 0 6px rgba(0,230,118,0.7); }
    .status-closed { color: #78909c; background: rgba(120,144,156,0.1); border: 1px solid rgba(120,144,156,0.3); }
    .status-closed .status-dot { background: #78909c; }

    .type-chip { display: inline-flex; padding: 3px 12px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; color: #667eea; background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.25); }
    .severity-chip { display: inline-flex; padding: 3px 10px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; }
    .sev-chip-critical { color: #ff1744; background: rgba(255,23,68,0.1); border: 1px solid rgba(255,23,68,0.3); }
    .sev-chip-high { color: #ff5252; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.3); }
    .sev-chip-elevated { color: #ffa726; background: rgba(255,167,38,0.1); border: 1px solid rgba(255,167,38,0.3); }
    .sev-chip-moderate { color: #ffc107; background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); }
    .sev-chip-low { color: #00e676; background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); }

    .attachment-indicator, .timeline-indicator { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--text-tertiary); }
    .attachment-indicator mat-icon, .timeline-indicator mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .card-title { margin: 0 0 10px; font-size: 1.15rem; font-weight: 600; color: var(--text-primary); line-height: 1.4; }
    .card-meta { display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.76rem; color: var(--text-tertiary); }
    .meta-icon { font-size: 15px; width: 15px; height: 15px; color: var(--text-secondary); }
    .meta-text { color: var(--text-secondary); }
    .meta-sep { margin: 0 4px; color: var(--text-primary); }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 40px; text-align: center; }
    .empty-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 100px; height: 100px; border-radius: 50%; background: var(--bg-card-glass); border: 1px solid var(--border-default); margin-bottom: 28px; overflow: hidden; }
    .empty-icon { font-size: 44px; width: 44px; height: 44px; color: var(--text-primary); }
    .empty-scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #667eea, transparent); animation: scan-down 2.5s ease-in-out infinite; }
    @keyframes scan-down { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
    .empty-title { margin: 0 0 10px; font-size: 1.2rem; font-weight: 600; color: var(--text-tertiary); }
    .empty-subtitle { margin: 0; font-size: 0.85rem; color: var(--text-tertiary); line-height: 1.7; font-family: 'JetBrains Mono', monospace; }

    @media (max-width: 900px) {
      :host { padding: 20px 16px; }
      .intel-header { flex-direction: column; gap: 16px; }
      .stats-row { grid-template-columns: 1fr; }
      .filters-row { flex-direction: column; }
      .filter-field { width: 100%; }
    }
  `]
})
export class IntelListComponent implements OnInit, OnDestroy {
  reports: IntelReportSummaryDto[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  filterStatus = '';
  filterType = '';
  activeCount = 0;
  closedCount = 0;

  private signalRSub?: Subscription;

  get canCreate(): boolean {
    return this.auth.hasRole('DataEntry') || this.auth.hasRole('Editor') ||
           this.auth.hasRole('CountryAdmin') || this.auth.hasRole('AUAdmin');
  }

  constructor(
    public auth: AuthService,
    private intelService: IntelReportService,
    private signalR: IntelSignalRService
  ) {}

  ngOnInit() {
    this.load();
    this.signalR.connect();
    // Refresh list only when a report is fully created, updated or deleted — not on every field change
    this.signalRSub = this.signalR.changes$.subscribe(() => this.load());
  }

  ngOnDestroy() {
    this.signalRSub?.unsubscribe();
    this.signalR.disconnect();
  }

  load() {
    this.intelService.list({
      page: this.page,
      pageSize: this.pageSize,
      status: this.filterStatus || undefined,
      type: this.filterType || undefined
    }).subscribe(result => {
      this.reports = result.items;
      this.total = result.total;
      this.activeCount = result.items.filter(r => r.status === 'active').length;
      this.closedCount = result.items.filter(r => r.status === 'closed').length;
    });
  }

  onPage(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
  }
}
