import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';

interface ResponseAction {
  step: number;
  action: string;
  performedBy: string;
  timestamp: string;
  status: 'completed' | 'in-progress' | 'pending';
}

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  assignedAnalyst: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  affectedSystems: string[];
  iocs: string[];
  containmentPercent: number;
  responseActions: ResponseAction[];
}

interface BarItem {
  label: string;
  count: number;
}

@Component({
  selector: 'app-incident-tracker',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatChipsModule,
    MatButtonModule, MatButtonToggleModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatProgressBarModule, MatTooltipModule, MatBadgeModule,
    TranslateModule
  ],
  template: `
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">
        <mat-icon>local_fire_department</mat-icon>
        {{ 'cyber.incidents.title' | translate }}
      </h2>
      <div class="header-stats">
        <div class="header-badge badge-open">
          <span class="badge-count">{{ openCount }}</span>
          <span class="badge-label">{{ 'cyber.incidents.open' | translate }}</span>
        </div>
        <div class="header-badge badge-investigating">
          <span class="badge-count">{{ investigatingCount }}</span>
          <span class="badge-label">{{ 'cyber.incidents.investigating' | translate }}</span>
        </div>
        <div class="header-badge badge-resolved">
          <span class="badge-count">{{ resolvedCount }}</span>
          <span class="badge-label">{{ 'cyber.incidents.resolved' | translate }}</span>
        </div>
        <div class="header-badge badge-total">
          <span class="badge-count">{{ allIncidents.length }}</span>
          <span class="badge-label">{{ 'cyber.incidents.total' | translate }}</span>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <mat-button-toggle-group [(ngModel)]="statusFilter" (change)="applyFilters()" class="status-toggle">
        <mat-button-toggle value="all">All</mat-button-toggle>
        <mat-button-toggle value="open">{{ 'cyber.incidents.open' | translate }}</mat-button-toggle>
        <mat-button-toggle value="investigating">{{ 'cyber.incidents.investigating' | translate }}</mat-button-toggle>
        <mat-button-toggle value="resolved">{{ 'cyber.incidents.resolved' | translate }}</mat-button-toggle>
      </mat-button-toggle-group>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>{{ 'cyber.incidents.severity' | translate }}</mat-label>
        <mat-select [(ngModel)]="severityFilter" (selectionChange)="applyFilters()">
          <mat-option value="all">All</mat-option>
          <mat-option value="critical">Critical</mat-option>
          <mat-option value="high">High</mat-option>
          <mat-option value="medium">Medium</mat-option>
          <mat-option value="low">Low</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'cyber.incidents.searchPlaceholder' | translate }}</mat-label>
        <input matInput [(ngModel)]="searchTerm" (input)="applyFilters()">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board">
      <!-- Open Column -->
      <div class="kanban-column">
        <div class="column-header col-open">
          <mat-icon>error_outline</mat-icon>
          <span>{{ 'cyber.incidents.open' | translate }}</span>
          <span class="col-count">{{ openIncidents.length }}</span>
        </div>
        <div class="column-cards">
          @for (inc of openIncidents; track inc.id) {
            <div class="incident-card" [class]="'sev-' + inc.severity"
                 (click)="toggleDetail(inc)" [class.selected]="selectedIncident?.id === inc.id">
              <div class="inc-header">
                <span class="inc-id">{{ inc.id }}</span>
                <span class="sev-badge" [class]="'sev-badge-' + inc.severity">{{ inc.severity }}</span>
              </div>
              <div class="inc-title">{{ inc.title }}</div>
              <div class="inc-meta">
                <span class="inc-country">{{ inc.countryFlag }} {{ inc.countryName }}</span>
                <mat-chip class="inc-cat">{{ inc.category }}</mat-chip>
              </div>
              <div class="inc-footer">
                <span class="inc-analyst"><mat-icon class="small-icon">person</mat-icon> {{ inc.assignedAnalyst }}</span>
                <span class="inc-time">{{ getRelativeTime(inc.createdAt) }}</span>
              </div>
            </div>
          }
          @if (openIncidents.length === 0) {
            <div class="empty-col">No open incidents</div>
          }
        </div>
      </div>

      <!-- Investigating Column -->
      <div class="kanban-column">
        <div class="column-header col-investigating">
          <mat-icon>manage_search</mat-icon>
          <span>{{ 'cyber.incidents.investigating' | translate }}</span>
          <span class="col-count">{{ investigatingIncidents.length }}</span>
        </div>
        <div class="column-cards">
          @for (inc of investigatingIncidents; track inc.id) {
            <div class="incident-card" [class]="'sev-' + inc.severity"
                 (click)="toggleDetail(inc)" [class.selected]="selectedIncident?.id === inc.id">
              <div class="inc-header">
                <span class="inc-id">{{ inc.id }}</span>
                <span class="sev-badge" [class]="'sev-badge-' + inc.severity">{{ inc.severity }}</span>
              </div>
              <div class="inc-title">{{ inc.title }}</div>
              <div class="inc-meta">
                <span class="inc-country">{{ inc.countryFlag }} {{ inc.countryName }}</span>
                <mat-chip class="inc-cat">{{ inc.category }}</mat-chip>
              </div>
              <div class="inc-footer">
                <span class="inc-analyst"><mat-icon class="small-icon">person</mat-icon> {{ inc.assignedAnalyst }}</span>
                <span class="inc-time">{{ getRelativeTime(inc.createdAt) }}</span>
              </div>
              <mat-progress-bar mode="determinate" [value]="inc.containmentPercent" class="containment-bar"></mat-progress-bar>
            </div>
          }
          @if (investigatingIncidents.length === 0) {
            <div class="empty-col">No incidents under investigation</div>
          }
        </div>
      </div>

      <!-- Resolved Column -->
      <div class="kanban-column">
        <div class="column-header col-resolved">
          <mat-icon>check_circle</mat-icon>
          <span>{{ 'cyber.incidents.resolved' | translate }}</span>
          <span class="col-count">{{ resolvedIncidents.length }}</span>
        </div>
        <div class="column-cards">
          @for (inc of resolvedIncidents; track inc.id) {
            <div class="incident-card resolved-card" [class]="'sev-' + inc.severity"
                 (click)="toggleDetail(inc)" [class.selected]="selectedIncident?.id === inc.id">
              <div class="inc-header">
                <span class="inc-id">{{ inc.id }}</span>
                <span class="sev-badge" [class]="'sev-badge-' + inc.severity">{{ inc.severity }}</span>
              </div>
              <div class="inc-title">{{ inc.title }}</div>
              <div class="inc-meta">
                <span class="inc-country">{{ inc.countryFlag }} {{ inc.countryName }}</span>
                <mat-chip class="inc-cat">{{ inc.category }}</mat-chip>
              </div>
              <div class="inc-footer">
                <span class="inc-analyst"><mat-icon class="small-icon">person</mat-icon> {{ inc.assignedAnalyst }}</span>
                <span class="inc-time">{{ getRelativeTime(inc.resolvedAt || inc.updatedAt) }}</span>
              </div>
            </div>
          }
          @if (resolvedIncidents.length === 0) {
            <div class="empty-col">No resolved incidents</div>
          }
        </div>
      </div>
    </div>

    <!-- Expanded Detail Panel -->
    @if (selectedIncident) {
      <mat-card class="detail-panel">
        <div class="detail-header">
          <div>
            <span class="detail-id">{{ selectedIncident.id }}</span>
            <span class="sev-badge" [class]="'sev-badge-' + selectedIncident.severity">{{ selectedIncident.severity }}</span>
            <mat-chip class="detail-status" [class]="'status-' + selectedIncident.status">{{ selectedIncident.status }}</mat-chip>
          </div>
          <button mat-icon-button (click)="selectedIncident = null"><mat-icon>close</mat-icon></button>
        </div>
        <h3 class="detail-title">{{ selectedIncident.title }}</h3>
        <p class="detail-desc">{{ selectedIncident.description }}</p>

        <div class="detail-grid">
          <!-- Affected Systems -->
          <div class="detail-section">
            <h4><mat-icon>dns</mat-icon> {{ 'cyber.incidents.affectedSystems' | translate }}</h4>
            <div class="system-list">
              @for (sys of selectedIncident.affectedSystems; track sys) {
                <div class="system-item"><mat-icon class="small-icon">storage</mat-icon> {{ sys }}</div>
              }
            </div>
          </div>

          <!-- Containment -->
          <div class="detail-section">
            <h4><mat-icon>shield</mat-icon> {{ 'cyber.incidents.containment' | translate }}</h4>
            <div class="containment-gauge">
              <div class="gauge-track">
                <div class="gauge-fill" [style.width.%]="selectedIncident.containmentPercent"
                     [class]="getContainmentClass(selectedIncident.containmentPercent)"></div>
              </div>
              <span class="gauge-text">{{ selectedIncident.containmentPercent }}%</span>
            </div>
          </div>

          <!-- IOCs -->
          <div class="detail-section">
            <h4><mat-icon>fingerprint</mat-icon> {{ 'cyber.incidents.relatedIocs' | translate }}</h4>
            <div class="ioc-list">
              @for (ioc of selectedIncident.iocs; track ioc) {
                <code class="ioc-value">{{ ioc }}</code>
              }
            </div>
          </div>
        </div>

        <!-- Response Timeline -->
        <div class="detail-section">
          <h4><mat-icon>timeline</mat-icon> {{ 'cyber.incidents.responseTimeline' | translate }}</h4>
          <div class="response-timeline">
            @for (action of selectedIncident.responseActions; track action.step) {
              <div class="timeline-item" [class]="'tl-' + action.status">
                <div class="tl-marker">
                  <div class="tl-dot"></div>
                  @if (!$last) { <div class="tl-line"></div> }
                </div>
                <div class="tl-content">
                  <div class="tl-header">
                    <span class="tl-step">Step {{ action.step }}</span>
                    <span class="tl-status-badge" [class]="'tls-' + action.status">{{ action.status }}</span>
                    <span class="tl-time">{{ action.timestamp }}</span>
                  </div>
                  <div class="tl-action">{{ action.action }}</div>
                  <div class="tl-by">{{ action.performedBy }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      </mat-card>
    }

    <!-- Stats Section -->
    <div class="stats-section">
      <h3 class="section-title">
        <mat-icon>analytics</mat-icon>
        Statistics
      </h3>
      <div class="stats-grid">
        <!-- MTTD Gauge -->
        <mat-card class="gauge-card">
          <div class="metric-gauge">
            <div class="gauge-circle" [style]="'--progress: ' + (mttd / 48 * 360) + 'deg'">
              <div class="gauge-inner">
                <span class="gauge-val">{{ mttd }}</span>
                <span class="gauge-unit">{{ 'cyber.incidents.hours' | translate }}</span>
              </div>
            </div>
            <div class="gauge-label">{{ 'cyber.incidents.mttd' | translate }}</div>
          </div>
        </mat-card>

        <!-- MTTR Gauge -->
        <mat-card class="gauge-card">
          <div class="metric-gauge">
            <div class="gauge-circle mttr-gauge" [style]="'--progress: ' + (mttr / 72 * 360) + 'deg'">
              <div class="gauge-inner">
                <span class="gauge-val">{{ mttr }}</span>
                <span class="gauge-unit">{{ 'cyber.incidents.hours' | translate }}</span>
              </div>
            </div>
            <div class="gauge-label">{{ 'cyber.incidents.mttr' | translate }}</div>
          </div>
        </mat-card>

        <!-- Incidents by Category -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title class="chart-title">
              <mat-icon>category</mat-icon>
              {{ 'cyber.incidents.byCategory' | translate }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of byCategory; track item.label) {
              <div class="bar-row">
                <span class="bar-label">{{ item.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill cat-bar" [style.width.%]="getBarWidth(item.count, maxCatCount)">
                    <span class="bar-value">{{ item.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Monthly Trend -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title class="chart-title">
              <mat-icon>trending_up</mat-icon>
              {{ 'cyber.incidents.monthlyTrend' | translate }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="trend-chart">
              @for (item of monthlyTrend; track item.label) {
                <div class="trend-bar-wrapper" [matTooltip]="item.label + ': ' + item.count">
                  <div class="trend-bar" [style.height.%]="getBarWidth(item.count, maxMonthCount)"></div>
                  <span class="trend-label">{{ item.label }}</span>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 0 16px 32px; background: var(--bg-page); min-height: 100vh; color: var(--text-primary); }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; margin-bottom: 16px;
    }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 24px; font-weight: 600; margin: 0; color: var(--text-heading);
    }
    .header-stats { display: flex; gap: 10px; }
    .header-badge {
      display: flex; flex-direction: column; align-items: center;
      padding: 8px 16px; border-radius: 10px; min-width: 70px;
    }
    .badge-count { font-size: 22px; font-weight: 700; line-height: 1.2; }
    .badge-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
    .badge-open { background: rgba(255, 23, 68, 0.1); color: #ff1744; border: 1px solid rgba(255, 23, 68, 0.2); }
    .badge-investigating { background: rgba(255, 145, 0, 0.1); color: #ff9100; border: 1px solid rgba(255, 145, 0, 0.2); }
    .badge-resolved { background: rgba(0, 230, 118, 0.1); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.2); }
    .badge-total { background: rgba(102, 126, 234, 0.1); color: #667eea; border: 1px solid rgba(102, 126, 234, 0.2); }

    /* Filter Bar */
    .filter-bar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
    }
    .status-toggle { height: 38px; }
    .filter-field { width: 140px; }
    .filter-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .search-field { flex: 1; min-width: 200px; }
    .search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    /* Kanban Board */
    .kanban-board {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;
    }
    .kanban-column {
      background: var(--bg-card-glass); border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.04); overflow: hidden;
    }
    .column-header {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      font-weight: 700; font-size: 14px; letter-spacing: 0.5px;
      border-bottom: 2px solid;
    }
    .col-open { border-color: #ff1744; color: #ff1744; }
    .col-investigating { border-color: #ff9100; color: #ff9100; }
    .col-resolved { border-color: #00e676; color: #00e676; }
    .col-count {
      margin-left: auto; font-size: 12px;
      background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px;
    }
    .column-cards { padding: 8px; max-height: 500px; overflow-y: auto; }
    .empty-col {
      text-align: center; padding: 24px; font-size: 13px; color: var(--text-secondary);
    }

    /* Incident Card */
    .incident-card {
      padding: 12px; margin-bottom: 8px; border-radius: 10px;
      background: var(--bg-card-glass); border: 1px solid rgba(255,255,255,0.04);
      cursor: pointer; transition: all 0.2s;
      animation: fadeInCard 0.4s ease both;
    }
    .incident-card:nth-child(1) { animation-delay: 0s; }
    .incident-card:nth-child(2) { animation-delay: 0.05s; }
    .incident-card:nth-child(3) { animation-delay: 0.1s; }
    .incident-card:nth-child(4) { animation-delay: 0.15s; }
    .incident-card:nth-child(5) { animation-delay: 0.2s; }
    .incident-card:nth-child(6) { animation-delay: 0.25s; }
    .incident-card:nth-child(7) { animation-delay: 0.3s; }
    .incident-card:nth-child(8) { animation-delay: 0.35s; }
    .incident-card:nth-child(9) { animation-delay: 0.4s; }
    .incident-card:nth-child(10) { animation-delay: 0.45s; }
    .incident-card:hover { border-color: rgba(102, 126, 234, 0.3); transform: translateY(-1px); }
    .incident-card.selected { border-color: #667eea; box-shadow: 0 0 12px rgba(102, 126, 234, 0.15); }
    .sev-critical { border-left: 3px solid #ff1744; }
    .sev-high { border-left: 3px solid #f44336; }
    .sev-medium { border-left: 3px solid #ff9100; }
    .sev-low { border-left: 3px solid #00e676; }
    .resolved-card { opacity: 0.7; }
    .resolved-card:hover { opacity: 1; }

    .inc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .inc-id { font-family: 'Consolas', monospace; font-size: 11px; color: #667eea; font-weight: 600; }
    .sev-badge {
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 2px 8px; border-radius: 4px;
    }
    .sev-badge-critical { background: rgba(255, 23, 68, 0.15); color: #ff1744; }
    .sev-badge-high { background: rgba(244, 67, 54, 0.15); color: #f44336; }
    .sev-badge-medium { background: rgba(255, 145, 0, 0.15); color: #ff9100; }
    .sev-badge-low { background: rgba(0, 230, 118, 0.15); color: #00e676; }

    .inc-title { font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.3; color: var(--text-primary); }
    .inc-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .inc-country { font-size: 12px; color: var(--text-primary); }
    .inc-cat {
      font-size: 9px !important; height: 18px !important;
      padding: 0 6px !important; min-height: 18px !important;
    }
    .inc-footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); }
    .inc-analyst { display: flex; align-items: center; gap: 2px; color: var(--text-secondary); }
    .inc-time { color: var(--text-tertiary); }
    .small-icon { font-size: 14px; width: 14px; height: 14px; }
    .containment-bar { margin-top: 8px; border-radius: 4px; }

    /* Detail Panel */
    .detail-panel {
      padding: 24px !important; margin-bottom: 24px;
      border: 1px solid rgba(102, 126, 234, 0.2) !important;
    }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .detail-header > div { display: flex; align-items: center; gap: 8px; }
    .detail-id { font-family: 'Consolas', monospace; font-size: 14px; color: #667eea; font-weight: 700; }
    .detail-status {
      font-size: 10px !important; height: 22px !important; min-height: 22px !important;
      text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
    }
    .status-open { background: rgba(255, 23, 68, 0.15) !important; color: #ff1744 !important; }
    .status-investigating { background: rgba(255, 145, 0, 0.15) !important; color: #ff9100 !important; }
    .status-contained { background: rgba(0, 212, 255, 0.15) !important; color: #00d4ff !important; }
    .status-resolved { background: rgba(0, 230, 118, 0.15) !important; color: #00e676 !important; }
    .status-closed { background: rgba(136, 146, 164, 0.15) !important; color: var(--text-secondary) !important; }
    .detail-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: var(--text-heading); }
    .detail-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px; }

    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;
    }
    .detail-section h4 {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; margin: 0 0 10px; color: #667eea;
    }
    .system-list { display: flex; flex-direction: column; gap: 4px; }
    .system-item {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; padding: 4px 8px; border-radius: 4px;
      background: rgba(255,255,255,0.03);
    }
    .containment-gauge { display: flex; align-items: center; gap: 10px; }
    .gauge-track {
      flex: 1; height: 10px; background: rgba(128,128,128,0.15);
      border-radius: 5px; overflow: hidden;
    }
    .gauge-fill { height: 100%; border-radius: 5px; transition: width 0.5s; }
    .gauge-fill.cont-high { background: linear-gradient(90deg, #00e676, #69f0ae); }
    .gauge-fill.cont-medium { background: linear-gradient(90deg, #ff9100, #ffc107); }
    .gauge-fill.cont-low { background: linear-gradient(90deg, #ff1744, #f44336); }
    .gauge-text { font-weight: 700; font-size: 16px; color: var(--text-heading); }
    .ioc-list { display: flex; flex-direction: column; gap: 4px; }
    .ioc-value {
      font-family: 'Consolas', monospace; font-size: 11px;
      color: #00d4ff; background: rgba(0, 212, 255, 0.06);
      padding: 4px 8px; border-radius: 4px;
      border: 1px solid rgba(0, 212, 255, 0.12);
    }

    /* Response Timeline */
    .response-timeline { padding-left: 4px; }
    .timeline-item { display: flex; gap: 12px; }
    .tl-marker { display: flex; flex-direction: column; align-items: center; width: 20px; }
    .tl-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid; background: var(--bg-card);
    }
    .tl-completed .tl-dot { border-color: #00e676; background: #00e676; }
    .tl-in-progress .tl-dot { border-color: #ff9100; background: #ff9100; animation: pulse 2s infinite; }
    .tl-pending .tl-dot { border-color: var(--text-secondary); }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes fadeInCard {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tl-line { width: 2px; flex: 1; background: var(--border-default); min-height: 24px; }
    .tl-content { flex: 1; padding-bottom: 16px; }
    .tl-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .tl-step { font-size: 11px; font-weight: 600; color: #667eea; }
    .tl-status-badge {
      font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 1px 6px; border-radius: 3px;
    }
    .tls-completed { background: rgba(0, 230, 118, 0.1); color: #00e676; }
    .tls-in-progress { background: rgba(255, 145, 0, 0.1); color: #ff9100; }
    .tls-pending { background: rgba(136, 146, 164, 0.1); color: var(--text-secondary); }
    .tl-time { font-size: 10px; opacity: 0.5; margin-left: auto; }
    .tl-action { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .tl-by { font-size: 11px; color: var(--text-secondary); }

    /* Stats Section */
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--text-heading);
    }
    .stats-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px;
    }
    .gauge-card { display: flex; align-items: center; justify-content: center; padding: 20px !important; }
    .metric-gauge { text-align: center; }
    .gauge-circle {
      width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 10px;
      background: conic-gradient(#667eea var(--progress), var(--border-default) 0deg);
      display: flex; align-items: center; justify-content: center;
    }
    .mttr-gauge {
      background: conic-gradient(#ff9100 var(--progress), var(--border-default) 0deg);
    }
    .gauge-inner {
      width: 76px; height: 76px; border-radius: 50%; background: var(--bg-card);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .gauge-val { font-size: 22px; font-weight: 700; color: var(--text-heading); }
    .gauge-unit { font-size: 10px; opacity: 0.5; }
    .gauge-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }

    .chart-card { }
    .chart-title {
      display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-primary);
    }
    .bar-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
    .bar-label { min-width: 90px; font-size: 12px; font-weight: 500; color: var(--text-primary); }
    .bar-track {
      flex: 1; height: 22px; background: rgba(128,128,128,0.1);
      border-radius: 4px; overflow: hidden;
    }
    .bar-fill {
      height: 100%; border-radius: 4px; min-width: 24px;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px; transition: width 0.5s ease;
    }
    .bar-value { font-size: 10px; font-weight: 600; color: #fff; }
    .cat-bar { background: linear-gradient(90deg, #f5576c, #ff6b6b); }

    .trend-chart {
      display: flex; align-items: flex-end; gap: 8px; height: 100px; padding: 8px 0;
    }
    .trend-bar-wrapper {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      height: 100%; justify-content: flex-end;
    }
    .trend-bar {
      width: 100%; min-height: 4px; border-radius: 4px 4px 0 0;
      background: linear-gradient(180deg, #667eea, #764ba2);
      transition: height 0.5s ease;
    }
    .trend-label { font-size: 9px; margin-top: 4px; color: var(--text-tertiary); }

    @media (max-width: 1100px) {
      .kanban-board { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .detail-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 900px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .header-stats { flex-wrap: wrap; }
      .filter-bar { flex-direction: column; align-items: stretch; }
    }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class IncidentTrackerComponent implements OnInit {
  allIncidents: SecurityIncident[] = [];
  filteredIncidents: SecurityIncident[] = [];
  selectedIncident: SecurityIncident | null = null;

  statusFilter = 'all';
  severityFilter = 'all';
  searchTerm = '';

  openCount = 0;
  investigatingCount = 0;
  resolvedCount = 0;

  mttd = 4.2;
  mttr = 18.7;
  byCategory: BarItem[] = [];
  monthlyTrend: BarItem[] = [];
  maxCatCount = 1;
  maxMonthCount = 1;

  get openIncidents() { return this.filteredIncidents.filter(i => i.status === 'open'); }
  get investigatingIncidents() { return this.filteredIncidents.filter(i => i.status === 'investigating' || i.status === 'contained'); }
  get resolvedIncidents() { return this.filteredIncidents.filter(i => i.status === 'resolved' || i.status === 'closed'); }

  ngOnInit() {
    this.allIncidents = this.generateIncidents();
    this.byCategory = [
      { label: 'Ransomware', count: 23 },
      { label: 'Data Breach', count: 18 },
      { label: 'DDoS', count: 15 },
      { label: 'Phishing', count: 31 },
      { label: 'Insider Threat', count: 8 },
      { label: 'Malware', count: 21 }
    ];
    this.monthlyTrend = [
      { label: 'Sep', count: 12 },
      { label: 'Oct', count: 18 },
      { label: 'Nov', count: 15 },
      { label: 'Dec', count: 24 },
      { label: 'Jan', count: 21 },
      { label: 'Feb', count: 17 }
    ];
    this.maxCatCount = Math.max(1, ...this.byCategory.map(c => c.count));
    this.maxMonthCount = Math.max(1, ...this.monthlyTrend.map(m => m.count));
    this.updateCounts();
    this.applyFilters();
  }

  private generateIncidents(): SecurityIncident[] {
    const incidents: SecurityIncident[] = [
      {
        id: 'INC-2024-001', title: 'Ransomware attack on Nigerian Federal Ministry servers',
        description: 'A sophisticated ransomware variant encrypted critical servers at the Federal Ministry of Communications. The attack vector was a spearphishing email targeting senior officials. Initial analysis indicates the ransomware is a new variant of LockBit with African-specific targeting.',
        severity: 'critical', status: 'investigating', category: 'Ransomware',
        countryCode: 'NG', countryName: 'Nigeria', countryFlag: '\u{1F1F3}\u{1F1EC}',
        assignedAnalyst: 'A. Okonkwo', createdAt: new Date(Date.now() - 7200000), updatedAt: new Date(Date.now() - 3600000),
        affectedSystems: ['Mail Server (Exchange)', 'File Server (NAS)', 'Active Directory', 'Web Portal'],
        iocs: ['185.220.101.34', 'au-commission-portal.click', 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5'],
        containmentPercent: 45,
        responseActions: [
          { step: 1, action: 'Isolated affected network segments', performedBy: 'SOC Team', timestamp: '14:23 UTC', status: 'completed' },
          { step: 2, action: 'Initiated forensic imaging of affected servers', performedBy: 'A. Okonkwo', timestamp: '14:45 UTC', status: 'completed' },
          { step: 3, action: 'Deploying EDR to all endpoints for threat hunting', performedBy: 'Incident Response Team', timestamp: '15:10 UTC', status: 'in-progress' },
          { step: 4, action: 'Restore from clean backups once containment confirmed', performedBy: 'Infrastructure Team', timestamp: 'Pending', status: 'pending' }
        ]
      },
      {
        id: 'INC-2024-002', title: 'DDoS attack against Kenyan banking infrastructure',
        description: 'Volumetric DDoS attack targeting multiple Kenyan banking portals, peaking at 800Gbps. The attack appears coordinated, with multiple attack vectors including SYN flood, UDP amplification, and HTTP slowloris.',
        severity: 'high', status: 'contained', category: 'DDoS',
        countryCode: 'KE', countryName: 'Kenya', countryFlag: '\u{1F1F0}\u{1F1EA}',
        assignedAnalyst: 'J. Kamau', createdAt: new Date(Date.now() - 14400000), updatedAt: new Date(Date.now() - 7200000),
        affectedSystems: ['Online Banking Portal', 'Mobile Banking API', 'ATM Network Gateway'],
        iocs: ['91.234.56.78', '203.0.113.42'],
        containmentPercent: 82,
        responseActions: [
          { step: 1, action: 'Activated DDoS mitigation service (cloud scrubbing)', performedBy: 'NOC Team', timestamp: '10:15 UTC', status: 'completed' },
          { step: 2, action: 'Implemented rate limiting and geo-blocking', performedBy: 'J. Kamau', timestamp: '10:30 UTC', status: 'completed' },
          { step: 3, action: 'Monitoring for attack pattern changes', performedBy: 'SOC Analysts', timestamp: '11:00 UTC', status: 'in-progress' },
          { step: 4, action: 'Post-incident review and hardening', performedBy: 'Security Architecture', timestamp: 'Pending', status: 'pending' }
        ]
      },
      {
        id: 'INC-2024-003', title: 'Data exfiltration detected at South African energy company',
        description: 'Anomalous data transfers detected from internal databases to external servers. Approximately 2.3TB of data was transferred over a 72-hour period. Investigation suggests compromised service account credentials.',
        severity: 'critical', status: 'open', category: 'Data Breach',
        countryCode: 'ZA', countryName: 'South Africa', countryFlag: '\u{1F1FF}\u{1F1E6}',
        assignedAnalyst: 'S. van der Merwe', createdAt: new Date(Date.now() - 1800000), updatedAt: new Date(Date.now() - 900000),
        affectedSystems: ['Customer Database', 'SCADA Control System', 'HR Portal'],
        iocs: ['hxxps://swift-africa.net/update.exe', 'e7d8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'],
        containmentPercent: 10,
        responseActions: [
          { step: 1, action: 'Revoke compromised service account credentials', performedBy: 'Identity Team', timestamp: '16:00 UTC', status: 'in-progress' },
          { step: 2, action: 'Block C2 IP addresses at firewall', performedBy: 'SOC Team', timestamp: 'Pending', status: 'pending' },
          { step: 3, action: 'Full forensic analysis of affected systems', performedBy: 'DFIR Team', timestamp: 'Pending', status: 'pending' }
        ]
      },
      {
        id: 'INC-2024-004', title: 'Phishing campaign targeting Egyptian government officials',
        description: 'Widespread phishing campaign using fake AU Commission emails to harvest credentials of Egyptian government officials. Over 500 emails detected with malicious links.',
        severity: 'high', status: 'investigating', category: 'Phishing',
        countryCode: 'EG', countryName: 'Egypt', countryFlag: '\u{1F1EA}\u{1F1EC}',
        assignedAnalyst: 'M. Hassan', createdAt: new Date(Date.now() - 28800000), updatedAt: new Date(Date.now() - 14400000),
        affectedSystems: ['Email Gateway', 'Web Proxy'],
        iocs: ['au-commission-portal.click', 'hxxps://login-au.org/verify'],
        containmentPercent: 65,
        responseActions: [
          { step: 1, action: 'Blocked phishing domains at DNS and proxy', performedBy: 'SOC Team', timestamp: '08:30 UTC', status: 'completed' },
          { step: 2, action: 'Sent advisory to all government email users', performedBy: 'M. Hassan', timestamp: '09:15 UTC', status: 'completed' },
          { step: 3, action: 'Password reset for affected accounts', performedBy: 'Identity Team', timestamp: '10:00 UTC', status: 'in-progress' },
          { step: 4, action: 'Deploy additional email filtering rules', performedBy: 'Email Security', timestamp: 'Pending', status: 'pending' }
        ]
      },
      {
        id: 'INC-2024-005', title: 'Malware infection in Ethiopian telecom network',
        description: 'Backdoor malware discovered on core routing infrastructure of major Ethiopian telecom provider. The malware allows remote access and traffic interception.',
        severity: 'critical', status: 'open', category: 'Malware',
        countryCode: 'ET', countryName: 'Ethiopia', countryFlag: '\u{1F1EA}\u{1F1F9}',
        assignedAnalyst: 'T. Bekele', createdAt: new Date(Date.now() - 3600000), updatedAt: new Date(Date.now() - 1800000),
        affectedSystems: ['Core Router Cluster', 'DNS Infrastructure', 'Monitoring Systems'],
        iocs: ['c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9', '45.33.32.156'],
        containmentPercent: 15,
        responseActions: [
          { step: 1, action: 'Emergency threat assessment initiated', performedBy: 'T. Bekele', timestamp: '15:30 UTC', status: 'in-progress' },
          { step: 2, action: 'Engage vendor for firmware integrity check', performedBy: 'Network Engineering', timestamp: 'Pending', status: 'pending' }
        ]
      },
      {
        id: 'INC-2024-006', title: 'Insider threat at Moroccan financial institution',
        description: 'Suspicious data access patterns detected from privileged user account. The user accessed customer records outside normal working hours and attempted to copy data to USB device.',
        severity: 'medium', status: 'resolved', category: 'Insider Threat',
        countryCode: 'MA', countryName: 'Morocco', countryFlag: '\u{1F1F2}\u{1F1E6}',
        assignedAnalyst: 'K. Benani', createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 86400000),
        resolvedAt: new Date(Date.now() - 86400000),
        affectedSystems: ['Customer Database', 'DLP System'],
        iocs: [],
        containmentPercent: 100,
        responseActions: [
          { step: 1, action: 'Suspended user account and revoked access', performedBy: 'HR & Security', timestamp: 'Day 1, 09:00 UTC', status: 'completed' },
          { step: 2, action: 'Forensic analysis of user workstation', performedBy: 'DFIR Team', timestamp: 'Day 1, 11:00 UTC', status: 'completed' },
          { step: 3, action: 'Confirmed no data left the organization', performedBy: 'K. Benani', timestamp: 'Day 2, 14:00 UTC', status: 'completed' }
        ]
      },
      {
        id: 'INC-2024-007', title: 'Supply chain attack on West African logistics platform',
        description: 'Malicious code injected into software update for logistics management platform used across West Africa. The compromised update was distributed to approximately 200 organizations.',
        severity: 'high', status: 'open', category: 'Supply Chain',
        countryCode: 'GH', countryName: 'Ghana', countryFlag: '\u{1F1EC}\u{1F1ED}',
        assignedAnalyst: 'E. Mensah', createdAt: new Date(Date.now() - 5400000), updatedAt: new Date(Date.now() - 2700000),
        affectedSystems: ['Logistics Platform (SaaS)', 'API Gateway', 'Partner Integration Layer'],
        iocs: ['afdb-secure-update.info'],
        containmentPercent: 20,
        responseActions: [
          { step: 1, action: 'Notified vendor and all affected organizations', performedBy: 'E. Mensah', timestamp: '13:00 UTC', status: 'completed' },
          { step: 2, action: 'Rolled back to previous software version', performedBy: 'Vendor', timestamp: '14:30 UTC', status: 'in-progress' },
          { step: 3, action: 'Scan all systems for compromise indicators', performedBy: 'SOC Team', timestamp: 'Pending', status: 'pending' }
        ]
      },
      {
        id: 'INC-2024-008', title: 'Credential stuffing attack on Tanzanian government portal',
        description: 'Automated credential stuffing attack detected against the Tanzanian e-government portal. Attackers using credentials from previous data breaches.',
        severity: 'medium', status: 'resolved', category: 'Credential Theft',
        countryCode: 'TZ', countryName: 'Tanzania', countryFlag: '\u{1F1F9}\u{1F1FF}',
        assignedAnalyst: 'D. Mushi', createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 172800000),
        resolvedAt: new Date(Date.now() - 172800000),
        affectedSystems: ['e-Government Portal', 'Authentication Service'],
        iocs: [],
        containmentPercent: 100,
        responseActions: [
          { step: 1, action: 'Implemented CAPTCHA and rate limiting', performedBy: 'Web Team', timestamp: 'Day 1, 10:00 UTC', status: 'completed' },
          { step: 2, action: 'Forced password reset for compromised accounts', performedBy: 'D. Mushi', timestamp: 'Day 1, 14:00 UTC', status: 'completed' },
          { step: 3, action: 'Deployed MFA for all government accounts', performedBy: 'Identity Team', timestamp: 'Day 2, 09:00 UTC', status: 'completed' }
        ]
      },
      {
        id: 'INC-2024-009', title: 'Cryptojacking on Rwandan university computing cluster',
        description: 'Cryptocurrency mining malware discovered on university high-performance computing cluster. Resources diverted for mining operations over 2-week period.',
        severity: 'low', status: 'closed', category: 'Malware',
        countryCode: 'RW', countryName: 'Rwanda', countryFlag: '\u{1F1F7}\u{1F1FC}',
        assignedAnalyst: 'P. Uwimana', createdAt: new Date(Date.now() - 604800000), updatedAt: new Date(Date.now() - 432000000),
        resolvedAt: new Date(Date.now() - 432000000),
        affectedSystems: ['HPC Cluster', 'Research Network'],
        iocs: [],
        containmentPercent: 100,
        responseActions: [
          { step: 1, action: 'Terminated mining processes and isolated nodes', performedBy: 'IT Support', timestamp: 'Day 1', status: 'completed' },
          { step: 2, action: 'Patched vulnerable SSH configuration', performedBy: 'P. Uwimana', timestamp: 'Day 2', status: 'completed' }
        ]
      },
      {
        id: 'INC-2024-010', title: 'BEC attack targeting Senegalese trade organization',
        description: 'Business email compromise targeting wire transfers at a major Senegalese trade organization. Attackers impersonated the CFO to authorize a fraudulent payment of $450,000.',
        severity: 'high', status: 'resolved', category: 'BEC',
        countryCode: 'SN', countryName: 'Senegal', countryFlag: '\u{1F1F8}\u{1F1F3}',
        assignedAnalyst: 'A. Diallo', createdAt: new Date(Date.now() - 345600000), updatedAt: new Date(Date.now() - 259200000),
        resolvedAt: new Date(Date.now() - 259200000),
        affectedSystems: ['Email System', 'Financial ERP'],
        iocs: ['ecobank-verification.xyz'],
        containmentPercent: 100,
        responseActions: [
          { step: 1, action: 'Contacted bank to freeze fraudulent transfer', performedBy: 'CFO Office', timestamp: 'Day 1, 11:00 UTC', status: 'completed' },
          { step: 2, action: 'Secured compromised email account', performedBy: 'A. Diallo', timestamp: 'Day 1, 13:00 UTC', status: 'completed' },
          { step: 3, action: 'Implemented DMARC/DKIM/SPF for email domain', performedBy: 'Email Security', timestamp: 'Day 3', status: 'completed' },
          { step: 4, action: 'Conducted BEC awareness training for finance team', performedBy: 'Security Awareness', timestamp: 'Day 5', status: 'completed' }
        ]
      }
    ];
    return incidents;
  }

  updateCounts() {
    this.openCount = this.allIncidents.filter(i => i.status === 'open').length;
    this.investigatingCount = this.allIncidents.filter(i => i.status === 'investigating' || i.status === 'contained').length;
    this.resolvedCount = this.allIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  }

  applyFilters() {
    this.filteredIncidents = this.allIncidents.filter(i => {
      if (this.statusFilter !== 'all') {
        if (this.statusFilter === 'open' && i.status !== 'open') return false;
        if (this.statusFilter === 'investigating' && i.status !== 'investigating' && i.status !== 'contained') return false;
        if (this.statusFilter === 'resolved' && i.status !== 'resolved' && i.status !== 'closed') return false;
      }
      if (this.severityFilter !== 'all' && i.severity !== this.severityFilter) return false;
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        return i.title.toLowerCase().includes(term) || i.id.toLowerCase().includes(term) || i.countryName.toLowerCase().includes(term);
      }
      return true;
    });
  }

  toggleDetail(inc: SecurityIncident) {
    this.selectedIncident = this.selectedIncident?.id === inc.id ? null : inc;
  }

  getRelativeTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getBarWidth(value: number, max: number): number {
    return max > 0 ? Math.max(5, (value / max) * 100) : 5;
  }

  getContainmentClass(percent: number): string {
    if (percent >= 75) return 'cont-high';
    if (percent >= 40) return 'cont-medium';
    return 'cont-low';
  }
}
