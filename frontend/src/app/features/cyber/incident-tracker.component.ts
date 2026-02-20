import { Component, OnInit, OnDestroy, signal } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { IncidentService } from '../../core/services/incident.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { IntelSignalRService } from '../../core/services/intel-signalr.service';
import { IncidentDto, IncidentStatsDto, CountryDto } from '../../core/models';

const SECTOR_OPTIONS = [
  { value: 'government',   labelKey: 'cyber.incidents.sectorGovt' },
  { value: 'banking',      labelKey: 'cyber.incidents.sectorBank' },
  { value: 'telecom',      labelKey: 'cyber.incidents.sectorTelecom' },
  { value: 'oil',          labelKey: 'cyber.incidents.sectorOil' },
  { value: 'military',     labelKey: 'cyber.incidents.sectorMilitary' },
  { value: 'health',       labelKey: 'cyber.incidents.sectorHealth' },
  { value: 'education',    labelKey: 'cyber.incidents.sectorEducation' },
  { value: 'transport',    labelKey: 'cyber.incidents.sectorTransport' },
  { value: 'energy',       labelKey: 'cyber.incidents.sectorEnergy' },
  { value: 'media',        labelKey: 'cyber.incidents.sectorMedia' },
  { value: 'other',        labelKey: 'cyber.incidents.sectorOther' },
];

const TYPE_OPTIONS = [
  { value: 'ransomware',    labelKey: 'cyber.incidents.typeRansomware' },
  { value: 'ddos',          labelKey: 'cyber.incidents.typeDdos' },
  { value: 'data_breach',   labelKey: 'cyber.incidents.typeDataBreach' },
  { value: 'phishing',      labelKey: 'cyber.incidents.typePhishing' },
  { value: 'malware',       labelKey: 'cyber.incidents.typeMalware' },
  { value: 'insider_threat',labelKey: 'cyber.incidents.typeInsiderThreat' },
  { value: 'supply_chain',  labelKey: 'cyber.incidents.typeSupplyChain' },
  { value: 'bec',           labelKey: 'cyber.incidents.typeBec' },
  { value: 'apt',           labelKey: 'cyber.incidents.typeApt' },
  { value: 'cryptojacking', labelKey: 'cyber.incidents.typeCryptojacking' },
  { value: 'web_defacement',labelKey: 'cyber.incidents.typeWebDefacement' },
  { value: 'other',         labelKey: 'cyber.incidents.typeOther' },
];

@Component({
  selector: 'app-incident-tracker',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatChipsModule,
    MatButtonModule, MatButtonToggleModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatSnackBarModule, TranslateModule
  ],
  template: `
    <!-- ══════════════════════════ LIST MODE ══════════════════════════ -->
    @if (mode === 'list') {

      <!-- Header -->
      <div class="page-header">
        <h2 class="page-title">
          <mat-icon>local_fire_department</mat-icon>
          {{ 'cyber.incidents.title' | translate }}
        </h2>
        <div class="header-right">
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
              <span class="badge-count">{{ totalCount }}</span>
              <span class="badge-label">{{ 'cyber.incidents.total' | translate }}</span>
            </div>
          </div>
          <button mat-raised-button class="new-btn" (click)="startCreate()">
            <mat-icon>add_circle</mat-icon>
            {{ 'cyber.incidents.newIncident' | translate }}
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <mat-button-toggle-group [(ngModel)]="statusFilter" (change)="loadIncidents()" class="status-toggle">
          <mat-button-toggle value="all">{{ 'common.all' | translate }}</mat-button-toggle>
          <mat-button-toggle value="open">{{ 'cyber.incidents.open' | translate }}</mat-button-toggle>
          <mat-button-toggle value="investigating">{{ 'cyber.incidents.investigating' | translate }}</mat-button-toggle>
          <mat-button-toggle value="resolved">{{ 'cyber.incidents.resolved' | translate }}</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>{{ 'cyber.incidents.severity' | translate }}</mat-label>
          <mat-select [(ngModel)]="severityFilter" (selectionChange)="loadIncidents()">
            <mat-option value="all">{{ 'common.all' | translate }}</mat-option>
            <mat-option value="critical">{{ 'bulletins.severityCritical' | translate }}</mat-option>
            <mat-option value="high">{{ 'bulletins.severityHigh' | translate }}</mat-option>
            <mat-option value="medium">{{ 'bulletins.severityMedium' | translate }}</mat-option>
            <mat-option value="low">{{ 'bulletins.severityLow' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>{{ 'cyber.incidents.sector' | translate }}</mat-label>
          <mat-select [(ngModel)]="sectorFilter" (selectionChange)="loadIncidents()">
            <mat-option value="all">{{ 'common.all' | translate }}</mat-option>
            @for (s of sectorOptions; track s.value) {
              <mat-option [value]="s.value">{{ s.labelKey | translate }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>{{ 'cyber.incidents.searchPlaceholder' | translate }}</mat-label>
          <input matInput [(ngModel)]="searchTerm" (input)="onSearch()">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <button mat-icon-button (click)="loadIncidents()" [matTooltip]="'common.refresh' | translate">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-wrap">
          <mat-spinner diameter="40" />
          <span>{{ 'common.loading' | translate }}</span>
        </div>
      }

      <!-- Kanban Board -->
      @if (!loading()) {
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
                <div class="incident-card sev-{{ inc.severity }}"
                     [class.selected]="selectedIncident?.id === inc.id"
                     (click)="toggleDetail(inc)">
                  <div class="inc-header">
                    <span class="inc-type">{{ getTypeLabel(inc.incidentType) }}</span>
                    <span class="sev-badge sev-badge-{{ inc.severity }}">{{ inc.severity }}</span>
                  </div>
                  <div class="inc-title">{{ inc.title }}</div>
                  <div class="inc-meta">
                    <span class="inc-sector">{{ getSectorLabel(inc.sector) }}</span>
                    <span class="inc-country">🌍 {{ inc.countryName }}</span>
                  </div>
                  <div class="inc-footer">
                    <span class="inc-analyst"><mat-icon class="small-icon">person</mat-icon> {{ inc.reportedByName }}</span>
                    <span class="inc-time">{{ getRelativeTime(inc.createdAt) }}</span>
                  </div>
                </div>
              }
              @if (openIncidents.length === 0 && !loading()) {
                <div class="empty-col">{{ 'cyber.incidents.noIncidents' | translate }}</div>
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
                <div class="incident-card sev-{{ inc.severity }}"
                     [class.selected]="selectedIncident?.id === inc.id"
                     (click)="toggleDetail(inc)">
                  <div class="inc-header">
                    <span class="inc-type">{{ getTypeLabel(inc.incidentType) }}</span>
                    <span class="sev-badge sev-badge-{{ inc.severity }}">{{ inc.severity }}</span>
                  </div>
                  <div class="inc-title">{{ inc.title }}</div>
                  <div class="inc-meta">
                    <span class="inc-sector">{{ getSectorLabel(inc.sector) }}</span>
                    <span class="inc-country">🌍 {{ inc.countryName }}</span>
                  </div>
                  <div class="inc-footer">
                    <span class="inc-analyst"><mat-icon class="small-icon">person</mat-icon> {{ inc.reportedByName }}</span>
                    <span class="inc-time">{{ getRelativeTime(inc.createdAt) }}</span>
                  </div>
                  <mat-progress-bar mode="determinate" [value]="inc.containmentPercent" class="containment-bar"></mat-progress-bar>
                </div>
              }
              @if (investigatingIncidents.length === 0 && !loading()) {
                <div class="empty-col">{{ 'cyber.incidents.noIncidents' | translate }}</div>
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
                <div class="incident-card resolved-card sev-{{ inc.severity }}"
                     [class.selected]="selectedIncident?.id === inc.id"
                     (click)="toggleDetail(inc)">
                  <div class="inc-header">
                    <span class="inc-type">{{ getTypeLabel(inc.incidentType) }}</span>
                    <span class="sev-badge sev-badge-{{ inc.severity }}">{{ inc.severity }}</span>
                  </div>
                  <div class="inc-title">{{ inc.title }}</div>
                  <div class="inc-meta">
                    <span class="inc-sector">{{ getSectorLabel(inc.sector) }}</span>
                    <span class="inc-country">🌍 {{ inc.countryName }}</span>
                  </div>
                  <div class="inc-footer">
                    <span class="inc-analyst"><mat-icon class="small-icon">person</mat-icon> {{ inc.reportedByName }}</span>
                    <span class="inc-time">{{ getRelativeTime(inc.resolvedAt || inc.updatedAt || inc.createdAt) }}</span>
                  </div>
                </div>
              }
              @if (resolvedIncidents.length === 0 && !loading()) {
                <div class="empty-col">{{ 'cyber.incidents.noIncidents' | translate }}</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Detail Panel -->
      @if (selectedIncident) {
        <mat-card class="detail-panel">
          <div class="detail-header">
            <div class="detail-header-left">
              <span class="sev-badge sev-badge-{{ selectedIncident.severity }}">{{ selectedIncident.severity }}</span>
              <span class="detail-status status-{{ selectedIncident.status }}">{{ selectedIncident.status }}</span>
              <span class="detail-sector">{{ getSectorLabel(selectedIncident.sector) }}</span>
            </div>
            <div class="detail-header-actions">
              <button mat-stroked-button class="edit-btn" (click)="startEdit(selectedIncident)">
                <mat-icon>edit</mat-icon>
                {{ 'common.edit' | translate }}
              </button>
              <button mat-icon-button (click)="selectedIncident = null"><mat-icon>close</mat-icon></button>
            </div>
          </div>
          <h3 class="detail-title">{{ selectedIncident.title }}</h3>
          <p class="detail-meta-line">
            <mat-icon class="meta-icon">public</mat-icon> {{ selectedIncident.countryName }}
            &nbsp;·&nbsp;
            <mat-icon class="meta-icon">local_fire_department</mat-icon> {{ getTypeLabel(selectedIncident.incidentType) }}
            &nbsp;·&nbsp;
            <mat-icon class="meta-icon">person</mat-icon> {{ selectedIncident.reportedByName }}
            &nbsp;·&nbsp;
            <mat-icon class="meta-icon">schedule</mat-icon> {{ getRelativeTime(selectedIncident.createdAt) }}
            @if (selectedIncident.source) {
              &nbsp;·&nbsp;
              <mat-icon class="meta-icon">source</mat-icon> {{ selectedIncident.source }}
            }
          </p>
          <p class="detail-desc">{{ selectedIncident.description }}</p>

          <div class="detail-grid">
            <!-- Affected Systems -->
            <div class="detail-section">
              <h4><mat-icon>dns</mat-icon> {{ 'cyber.incidents.affectedSystemsLabel' | translate }}</h4>
              @if (selectedIncident.affectedSystems.length > 0) {
                <div class="system-list">
                  @for (sys of selectedIncident.affectedSystems; track sys) {
                    <div class="system-item"><mat-icon class="small-icon">storage</mat-icon> {{ sys }}</div>
                  }
                </div>
              } @else {
                <div class="empty-field">—</div>
              }
            </div>

            <!-- Containment -->
            <div class="detail-section">
              <h4><mat-icon>shield</mat-icon> {{ 'cyber.incidents.containment' | translate }}</h4>
              <div class="containment-gauge">
                <div class="gauge-track">
                  <div class="gauge-fill {{ getContainmentClass(selectedIncident.containmentPercent) }}"
                       [style.width.%]="selectedIncident.containmentPercent"></div>
                </div>
                <span class="gauge-text">{{ selectedIncident.containmentPercent }}%</span>
              </div>
            </div>

            <!-- IOCs -->
            <div class="detail-section">
              <h4><mat-icon>fingerprint</mat-icon> {{ 'cyber.incidents.iocsLabel' | translate }}</h4>
              @if (selectedIncident.iocs.length > 0) {
                <div class="ioc-list">
                  @for (ioc of selectedIncident.iocs; track ioc) {
                    <code class="ioc-value">{{ ioc }}</code>
                  }
                </div>
              } @else {
                <div class="empty-field">—</div>
              }
            </div>
          </div>

          <!-- Attachment -->
          @if (selectedIncident.attachmentName) {
            <div class="detail-attachment">
              <mat-icon>attach_file</mat-icon>
              <span>{{ selectedIncident.attachmentName }}</span>
            </div>
          }
        </mat-card>
      }

      <!-- Stats Section -->
      @if (stats) {
        <div class="stats-section">
          <h3 class="section-title">
            <mat-icon>analytics</mat-icon>
            {{ 'cyber.incidents.statsSection' | translate }}
          </h3>
          <div class="stats-grid">
            <!-- By Sector -->
            <mat-card class="chart-card">
              <mat-card-header>
                <mat-card-title class="chart-title">
                  <mat-icon>category</mat-icon>
                  {{ 'cyber.incidents.bySector' | translate }}
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (stats.bySector.length === 0) {
                  <div class="empty-stats">{{ 'common.noData' | translate }}</div>
                }
                @for (item of stats.bySector; track item.label) {
                  <div class="bar-row">
                    <span class="bar-label">{{ getSectorLabel(item.label) }}</span>
                    <div class="bar-track">
                      <div class="bar-fill cat-bar" [style.width.%]="getBarWidth(item.count, maxSectorCount)">
                        <span class="bar-value">{{ item.count }}</span>
                      </div>
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- By Type -->
            <mat-card class="chart-card">
              <mat-card-header>
                <mat-card-title class="chart-title">
                  <mat-icon>local_fire_department</mat-icon>
                  {{ 'cyber.incidents.byType' | translate }}
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (stats.byType.length === 0) {
                  <div class="empty-stats">{{ 'common.noData' | translate }}</div>
                }
                @for (item of stats.byType; track item.label) {
                  <div class="bar-row">
                    <span class="bar-label">{{ getTypeLabel(item.label) }}</span>
                    <div class="bar-track">
                      <div class="bar-fill type-bar" [style.width.%]="getBarWidth(item.count, maxTypeCount)">
                        <span class="bar-value">{{ item.count }}</span>
                      </div>
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- By Severity -->
            <mat-card class="chart-card">
              <mat-card-header>
                <mat-card-title class="chart-title">
                  <mat-icon>warning</mat-icon>
                  {{ 'cyber.incidents.bySeverity' | translate }}
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (stats.bySeverity.length === 0) {
                  <div class="empty-stats">{{ 'common.noData' | translate }}</div>
                }
                @for (item of stats.bySeverity; track item.label) {
                  <div class="bar-row">
                    <span class="bar-label sev-{{ item.label }}-text">{{ item.label }}</span>
                    <div class="bar-track">
                      <div class="bar-fill sev-bar-{{ item.label }}" [style.width.%]="getBarWidth(item.count, maxSeverityCount)">
                        <span class="bar-value">{{ item.count }}</span>
                      </div>
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <!-- Status Summary -->
            <mat-card class="chart-card">
              <mat-card-header>
                <mat-card-title class="chart-title">
                  <mat-icon>donut_small</mat-icon>
                  {{ 'cyber.incidents.status' | translate }}
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="status-summary">
                  <div class="status-row">
                    <span class="status-dot open-dot"></span>
                    <span class="status-label">{{ 'cyber.incidents.open' | translate }}</span>
                    <span class="status-count">{{ stats.open }}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-dot invest-dot"></span>
                    <span class="status-label">{{ 'cyber.incidents.investigating' | translate }}</span>
                    <span class="status-count">{{ stats.investigating }}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-dot contain-dot"></span>
                    <span class="status-label">{{ 'cyber.incidents.contained' | translate }}</span>
                    <span class="status-count">{{ stats.contained }}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-dot resolved-dot"></span>
                    <span class="status-label">{{ 'cyber.incidents.resolved' | translate }}</span>
                    <span class="status-count">{{ stats.resolved }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      }

    }

    <!-- ══════════════════════════ CREATE / EDIT FORM ══════════════════════════ -->
    @if (mode === 'create' || mode === 'edit') {
      <div class="form-page">
        <!-- Form Header -->
        <div class="form-header">
          <button mat-icon-button (click)="cancelForm()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h2 class="form-title">
            <mat-icon>{{ mode === 'create' ? 'add_circle' : 'edit' }}</mat-icon>
            {{ (mode === 'create' ? 'cyber.incidents.create' : 'cyber.incidents.edit') | translate }}
          </h2>
        </div>

        <mat-card class="form-card">
          <mat-card-content>
            <div class="form-grid">

              <!-- Title -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'cyber.incidents.incidentTitle' | translate }}</mat-label>
                <input matInput [(ngModel)]="formTitle" required maxlength="300">
              </mat-form-field>

              <!-- Description -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'cyber.incidents.description' | translate }}</mat-label>
                <textarea matInput [(ngModel)]="formDescription" required rows="5" maxlength="5000"></textarea>
                <mat-hint align="end">{{ formDescription.length }}/5000</mat-hint>
              </mat-form-field>

              <!-- Row: Severity + Incident Type + Sector -->
              <div class="form-row-3">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'cyber.incidents.severity' | translate }}</mat-label>
                  <mat-select [(ngModel)]="formSeverity" required>
                    <mat-option value="critical">🔴 {{ 'bulletins.severityCritical' | translate }}</mat-option>
                    <mat-option value="high">🟠 {{ 'bulletins.severityHigh' | translate }}</mat-option>
                    <mat-option value="medium">🟡 {{ 'bulletins.severityMedium' | translate }}</mat-option>
                    <mat-option value="low">🟢 {{ 'bulletins.severityLow' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'cyber.incidents.incidentType' | translate }}</mat-label>
                  <mat-select [(ngModel)]="formIncidentType" required>
                    @for (t of typeOptions; track t.value) {
                      <mat-option [value]="t.value">{{ t.labelKey | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'cyber.incidents.sector' | translate }}</mat-label>
                  <mat-select [(ngModel)]="formSector" required>
                    @for (s of sectorOptions; track s.value) {
                      <mat-option [value]="s.value">{{ s.labelKey | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <!-- Row: Country + Source -->
              <div class="form-row-2">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'cyber.incidents.affectedCountry' | translate }}</mat-label>
                  <mat-select [(ngModel)]="formCountryCode" required>
                    @for (c of countries(); track c.code) {
                      <mat-option [value]="c.code">{{ c.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'cyber.incidents.source' | translate }}</mat-label>
                  <input matInput [(ngModel)]="formSource" maxlength="200">
                </mat-form-field>
              </div>

              <!-- Edit-only: Status + Containment -->
              @if (mode === 'edit') {
                <div class="form-row-2">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'cyber.incidents.status' | translate }}</mat-label>
                    <mat-select [(ngModel)]="formStatus">
                      <mat-option value="open">{{ 'cyber.incidents.open' | translate }}</mat-option>
                      <mat-option value="investigating">{{ 'cyber.incidents.investigating' | translate }}</mat-option>
                      <mat-option value="contained">{{ 'cyber.incidents.contained' | translate }}</mat-option>
                      <mat-option value="resolved">{{ 'cyber.incidents.resolved' | translate }}</mat-option>
                      <mat-option value="closed">{{ 'cyber.incidents.closed' | translate }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'cyber.incidents.containmentPct' | translate }}</mat-label>
                    <input matInput type="number" [(ngModel)]="formContainmentPercent" min="0" max="100">
                    <span matSuffix>%</span>
                  </mat-form-field>
                </div>
              }

              <!-- Affected Systems -->
              <div class="chips-section">
                <div class="chips-label">
                  <mat-icon>dns</mat-icon>
                  {{ 'cyber.incidents.affectedSystemsLabel' | translate }}
                </div>
                <div class="chips-input-row">
                  <input class="chips-input" placeholder="{{ 'cyber.incidents.addSystem' | translate }}"
                         [(ngModel)]="newSystem"
                         (keydown.enter)="addSystem(); $event.preventDefault()">
                  <button mat-icon-button type="button" (click)="addSystem()" [disabled]="!newSystem.trim()">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <div class="chips-list">
                  @for (sys of formAffectedSystems; track sys) {
                    <div class="chip-item">
                      <mat-icon class="chip-icon">storage</mat-icon>
                      <span>{{ sys }}</span>
                      <button mat-icon-button type="button" class="chip-remove" (click)="removeSystem(sys)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- IOCs -->
              <div class="chips-section">
                <div class="chips-label">
                  <mat-icon>fingerprint</mat-icon>
                  {{ 'cyber.incidents.iocsLabel' | translate }}
                </div>
                <div class="chips-input-row">
                  <input class="chips-input" placeholder="{{ 'cyber.incidents.addIoc' | translate }}"
                         [(ngModel)]="newIoc"
                         (keydown.enter)="addIoc(); $event.preventDefault()">
                  <button mat-icon-button type="button" (click)="addIoc()" [disabled]="!newIoc.trim()">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <div class="chips-list">
                  @for (ioc of formIocs; track ioc) {
                    <div class="chip-item ioc-chip">
                      <mat-icon class="chip-icon">radio_button_checked</mat-icon>
                      <code>{{ ioc }}</code>
                      <button mat-icon-button type="button" class="chip-remove" (click)="removeIoc(ioc)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- File Attachment -->
              <div class="attachment-section">
                <div class="chips-label">
                  <mat-icon>attach_file</mat-icon>
                  {{ 'cyber.incidents.attachment' | translate }}
                  <span class="optional-tag">{{ 'submitReport.optional' | translate }}</span>
                </div>
                @if (!formAttachment) {
                  <label class="drop-zone" (click)="fileInput.click()"
                         (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                    <mat-icon class="upload-icon">cloud_upload</mat-icon>
                    <p>{{ 'submitReport.dropFile' | translate }}</p>
                    <p class="file-hint">PDF, DOC, DOCX, JPG, PNG — max 10MB</p>
                    <input #fileInput type="file" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                           (change)="onFileSelect($event)">
                  </label>
                } @else {
                  <div class="file-preview">
                    <mat-icon class="file-icon">insert_drive_file</mat-icon>
                    <div class="file-info">
                      <span class="file-name">{{ formAttachment.name }}</span>
                      <span class="file-size">{{ formatSize(formAttachment.size) }}</span>
                    </div>
                    <button mat-icon-button type="button" (click)="formAttachment = null">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <!-- Actions -->
              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="cancelForm()">
                  {{ 'common.cancel' | translate }}
                </button>
                <button mat-raised-button class="submit-btn" type="button"
                        [disabled]="!canSubmit() || submitting()"
                        (click)="submitForm()">
                  @if (submitting()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <mat-icon>{{ mode === 'create' ? 'send' : 'save' }}</mat-icon>
                  }
                  {{ (mode === 'create' ? 'cyber.incidents.submitCreate' : 'cyber.incidents.submitEdit') | translate }}
                </button>
              </div>

            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    :host { display: block; padding: 0 16px 32px; background: var(--bg-page); min-height: 100vh; color: var(--text-primary); }

    /* ─── LIST HEADER ─── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; margin-bottom: 16px;
    }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 24px; font-weight: 600; margin: 0; color: var(--text-heading);
    }
    .header-right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .header-stats { display: flex; gap: 10px; }
    .header-badge {
      display: flex; flex-direction: column; align-items: center;
      padding: 8px 16px; border-radius: 10px; min-width: 70px;
    }
    .badge-count { font-size: 22px; font-weight: 700; line-height: 1.2; }
    .badge-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
    .badge-open { background: rgba(255,23,68,0.1); color: #ff1744; border: 1px solid rgba(255,23,68,0.2); }
    .badge-investigating { background: rgba(255,145,0,0.1); color: #ff9100; border: 1px solid rgba(255,145,0,0.2); }
    .badge-resolved { background: rgba(0,230,118,0.1); color: #00e676; border: 1px solid rgba(0,230,118,0.2); }
    .badge-total { background: rgba(102,126,234,0.1); color: #667eea; border: 1px solid rgba(102,126,234,0.2); }

    .new-btn {
      background: linear-gradient(135deg, #667eea, #5a67d8) !important;
      color: #fff !important; font-weight: 600 !important; border-radius: 8px !important;
    }

    /* ─── FILTER BAR ─── */
    .filter-bar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
    }
    .status-toggle { height: 38px; }
    .filter-field { width: 150px; }
    .filter-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .search-field { flex: 1; min-width: 200px; }
    .search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    /* ─── LOADING ─── */
    .loading-wrap {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 40px; color: var(--text-secondary);
    }

    /* ─── KANBAN ─── */
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
    .column-cards { padding: 8px; max-height: 520px; overflow-y: auto; }
    .empty-col { text-align: center; padding: 24px; font-size: 13px; color: var(--text-secondary); }

    /* ─── INCIDENT CARD ─── */
    .incident-card {
      padding: 12px; margin-bottom: 8px; border-radius: 10px;
      background: var(--bg-card-glass); border: 1px solid rgba(255,255,255,0.04);
      cursor: pointer; transition: all 0.2s; animation: fadeInCard 0.4s ease both;
    }
    .incident-card:hover { border-color: rgba(102,126,234,0.3); transform: translateY(-1px); }
    .incident-card.selected { border-color: #667eea; box-shadow: 0 0 12px rgba(102,126,234,0.2); }
    .sev-critical { border-left: 3px solid #ff1744; }
    .sev-high { border-left: 3px solid #f44336; }
    .sev-medium { border-left: 3px solid #ff9100; }
    .sev-low { border-left: 3px solid #00e676; }
    .resolved-card { opacity: 0.72; }
    .resolved-card:hover { opacity: 1; }
    @keyframes fadeInCard { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .inc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .inc-type { font-size: 10px; color: #667eea; font-weight: 600; letter-spacing: 0.3px; }
    .sev-badge {
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 2px 8px; border-radius: 4px;
    }
    .sev-badge-critical { background: rgba(255,23,68,0.15); color: #ff1744; }
    .sev-badge-high { background: rgba(244,67,54,0.15); color: #f44336; }
    .sev-badge-medium { background: rgba(255,145,0,0.15); color: #ff9100; }
    .sev-badge-low { background: rgba(0,230,118,0.15); color: #00e676; }

    .inc-title { font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.3; color: var(--text-primary); }
    .inc-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .inc-sector { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(102,126,234,0.1); color: #667eea; }
    .inc-country { font-size: 11px; color: var(--text-secondary); }
    .inc-footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); }
    .inc-analyst { display: flex; align-items: center; gap: 2px; }
    .inc-time { color: var(--text-tertiary); }
    .small-icon { font-size: 14px; width: 14px; height: 14px; }
    .containment-bar { margin-top: 8px; border-radius: 4px; }

    /* ─── DETAIL PANEL ─── */
    .detail-panel {
      padding: 20px !important; margin-bottom: 24px;
      border: 1px solid rgba(102,126,234,0.2) !important;
      border-radius: 12px !important;
    }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .detail-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .detail-header-actions { display: flex; align-items: center; gap: 8px; }
    .detail-status {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 3px 10px; border-radius: 4px;
    }
    .status-open { background: rgba(255,23,68,0.12); color: #ff1744; }
    .status-investigating { background: rgba(255,145,0,0.12); color: #ff9100; }
    .status-contained { background: rgba(0,212,255,0.12); color: #00d4ff; }
    .status-resolved { background: rgba(0,230,118,0.12); color: #00e676; }
    .status-closed { background: rgba(128,128,128,0.12); color: var(--text-secondary); }
    .detail-sector {
      font-size: 11px; padding: 3px 8px; border-radius: 4px;
      background: rgba(102,126,234,0.1); color: #667eea;
    }
    .edit-btn { font-size: 12px; color: #667eea; border-color: rgba(102,126,234,0.3) !important; }
    .detail-title { font-size: 18px; font-weight: 600; margin: 0 0 6px; color: var(--text-heading); }
    .detail-meta-line {
      font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;
      display: flex; align-items: center; flex-wrap: wrap; gap: 2px;
    }
    .meta-icon { font-size: 14px; width: 14px; height: 14px; vertical-align: middle; }
    .detail-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .detail-section h4 {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; margin: 0 0 10px; color: #667eea;
    }
    .empty-field { font-size: 13px; color: var(--text-tertiary); }
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
    .cont-high { background: linear-gradient(90deg, #00e676, #69f0ae); }
    .cont-medium { background: linear-gradient(90deg, #ff9100, #ffc107); }
    .cont-low { background: linear-gradient(90deg, #ff1744, #f44336); }
    .gauge-text { font-weight: 700; font-size: 16px; color: var(--text-heading); }
    .ioc-list { display: flex; flex-direction: column; gap: 4px; }
    .ioc-value {
      font-family: 'Consolas', monospace; font-size: 11px;
      color: #00d4ff; background: rgba(0,212,255,0.06);
      padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0,212,255,0.12);
    }
    .detail-attachment {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #667eea; padding: 8px 12px;
      background: rgba(102,126,234,0.06); border-radius: 6px;
    }

    /* ─── STATS SECTION ─── */
    .stats-section { margin-top: 8px; }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--text-heading);
    }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .chart-card { }
    .chart-title { display: flex; align-items: center; gap: 6px; font-size: 14px !important; color: var(--text-primary) !important; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
    .bar-label { min-width: 80px; font-size: 11px; font-weight: 500; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; }
    .bar-track { flex: 1; height: 22px; background: rgba(128,128,128,0.1); border-radius: 4px; overflow: hidden; }
    .bar-fill {
      height: 100%; border-radius: 4px; min-width: 24px;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px; transition: width 0.5s ease;
    }
    .bar-value { font-size: 10px; font-weight: 600; color: #fff; }
    .cat-bar { background: linear-gradient(90deg, #667eea, #764ba2); }
    .type-bar { background: linear-gradient(90deg, #f5576c, #f093fb); }
    .sev-bar-critical { background: linear-gradient(90deg, #ff1744, #f44336); }
    .sev-bar-high { background: linear-gradient(90deg, #ff6b35, #ff9100); }
    .sev-bar-medium { background: linear-gradient(90deg, #ff9100, #ffc107); }
    .sev-bar-low { background: linear-gradient(90deg, #00c853, #00e676); }
    .sev-critical-text { color: #ff1744; }
    .sev-high-text { color: #ff9100; }
    .sev-medium-text { color: #ffc107; }
    .sev-low-text { color: #00e676; }
    .empty-stats { font-size: 12px; color: var(--text-tertiary); padding: 12px 0; }

    .status-summary { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
    .status-row { display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .open-dot { background: #ff1744; }
    .invest-dot { background: #ff9100; }
    .contain-dot { background: #00d4ff; }
    .resolved-dot { background: #00e676; }
    .status-label { flex: 1; font-size: 12px; color: var(--text-secondary); }
    .status-count { font-size: 14px; font-weight: 700; color: var(--text-heading); }

    /* ─── CREATE / EDIT FORM ─── */
    .form-page { }
    .form-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .back-btn { color: var(--text-secondary); }
    .form-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 22px; font-weight: 700; margin: 0; color: var(--text-heading);
    }
    .form-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-default) !important;
      border-radius: 12px !important;
    }
    .form-grid { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
    .full-width { width: 100%; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .form-row-2 mat-form-field, .form-row-3 mat-form-field { width: 100%; }
    ::ng-deep .form-card .mat-mdc-form-field-subscript-wrapper { min-height: 0 !important; }

    /* Chips/Tags input */
    .chips-section { margin: 4px 0 8px; }
    .chips-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: var(--text-primary);
      margin-bottom: 8px;
    }
    .chips-label mat-icon { font-size: 18px; width: 18px; height: 18px; color: #667eea; }
    .optional-tag {
      font-size: 11px; color: var(--text-tertiary); font-weight: 400;
      background: rgba(102,126,234,0.1); padding: 2px 6px; border-radius: 4px;
    }
    .chips-input-row { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .chips-input {
      flex: 1; padding: 8px 12px; border-radius: 8px;
      background: var(--bg-input, rgba(255,255,255,0.05));
      border: 1px solid var(--border-default); color: var(--text-primary);
      font-size: 13px; outline: none;
    }
    .chips-input:focus { border-color: #667eea; }
    .chips-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip-item {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 4px 4px 10px; border-radius: 20px;
      background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.2);
      font-size: 12px; color: var(--text-primary);
    }
    .chip-icon { font-size: 14px; width: 14px; height: 14px; color: #667eea; }
    .chip-remove { width: 24px !important; height: 24px !important; line-height: 24px !important; }
    .chip-remove mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .ioc-chip { background: rgba(0,212,255,0.06); border-color: rgba(0,212,255,0.15); }
    .ioc-chip .chip-icon { color: #00d4ff; }
    .ioc-chip code { font-family: 'Consolas', monospace; font-size: 11px; color: #00d4ff; }

    /* File attachment */
    .attachment-section { margin: 4px 0 8px; }
    .drop-zone {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px 32px; border: 2px dashed rgba(102,126,234,0.3); border-radius: 12px;
      cursor: pointer; transition: all 0.2s;
    }
    .drop-zone:hover { border-color: #667eea; background: rgba(102,126,234,0.04); }
    .upload-icon { font-size: 32px; width: 32px; height: 32px; color: #667eea; margin-bottom: 6px; }
    .drop-zone p { margin: 2px 0; font-size: 13px; color: var(--text-secondary); }
    .file-hint { font-size: 11px !important; color: var(--text-tertiary) !important; }
    .file-preview {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px;
      background: rgba(102,126,234,0.06); border: 1px solid rgba(102,126,234,0.2);
    }
    .file-icon { font-size: 24px; width: 24px; height: 24px; color: #667eea; }
    .file-info { flex: 1; display: flex; flex-direction: column; }
    .file-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .file-size { font-size: 11px; color: var(--text-tertiary); }

    /* Form actions */
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .submit-btn {
      background: linear-gradient(135deg, #667eea, #5a67d8) !important;
      color: #fff !important; font-weight: 600 !important;
      padding: 0 28px !important; height: 42px !important;
      border-radius: 8px !important; display: flex; align-items: center; gap: 8px;
    }
    .submit-btn:disabled { opacity: 0.6; }

    /* ─── RESPONSIVE ─── */
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 1000px) {
      .kanban-board { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 1fr 1fr; }
      .form-row-3 { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 700px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .header-right { flex-direction: column; align-items: flex-start; width: 100%; }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .stats-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
      .form-row-2, .form-row-3 { grid-template-columns: 1fr; }
    }
  `]
})
export class IncidentTrackerComponent implements OnInit, OnDestroy {
  // Options
  readonly sectorOptions = SECTOR_OPTIONS;
  readonly typeOptions = TYPE_OPTIONS;

  // Data
  allIncidents: IncidentDto[] = [];
  filteredIncidents: IncidentDto[] = [];
  selectedIncident: IncidentDto | null = null;
  stats: IncidentStatsDto | null = null;
  countries = signal<CountryDto[]>([]);

  // Mode
  mode: 'list' | 'create' | 'edit' = 'list';
  editingId: string | null = null;

  // Form fields
  formTitle = '';
  formDescription = '';
  formSeverity = 'medium';
  formSector = '';
  formIncidentType = '';
  formCountryCode = '';
  formSource = '';
  formAffectedSystems: string[] = [];
  formIocs: string[] = [];
  formAttachment: File | null = null;
  formStatus = 'open';
  formContainmentPercent = 0;
  newSystem = '';
  newIoc = '';

  // State
  loading = signal(false);
  submitting = signal(false);

  // Filters
  statusFilter = 'all';
  severityFilter = 'all';
  sectorFilter = 'all';
  searchTerm = '';
  private _searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Counts (from API)
  openCount = 0;
  investigatingCount = 0;
  resolvedCount = 0;
  totalCount = 0;

  // Stats derived
  maxSectorCount = 1;
  maxTypeCount = 1;
  maxSeverityCount = 1;

  private _incidentSub?: Subscription;

  get openIncidents() { return this.filteredIncidents.filter(i => i.status === 'open'); }
  get investigatingIncidents() { return this.filteredIncidents.filter(i => i.status === 'investigating' || i.status === 'contained'); }
  get resolvedIncidents() { return this.filteredIncidents.filter(i => i.status === 'resolved' || i.status === 'closed'); }

  constructor(
    private incidentService: IncidentService,
    private userService: UserService,
    private auth: AuthService,
    private signalR: IntelSignalRService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.userService.listCountries().subscribe(c => this.countries.set(c));
    this.formCountryCode = this.auth.user()?.countryCode ?? '';
    this.loadIncidents();
    this.loadStats();

    this._incidentSub = this.signalR.incidentEvents$.subscribe(() => {
      this.loadIncidents();
      this.loadStats();
    });
  }

  ngOnDestroy() {
    this._incidentSub?.unsubscribe();
    if (this._searchTimer) clearTimeout(this._searchTimer);
  }

  loadIncidents() {
    this.loading.set(true);
    this.incidentService.list({
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      severity: this.severityFilter !== 'all' ? this.severityFilter : undefined,
      sector: this.sectorFilter !== 'all' ? this.sectorFilter : undefined,
      query: this.searchTerm || undefined,
      page: 1,
      pageSize: 100
    }).subscribe({
      next: result => {
        this.allIncidents = result.items;
        this.filteredIncidents = result.items;
        this.openCount = result.openCount;
        this.investigatingCount = result.investigatingCount;
        this.resolvedCount = result.resolvedCount;
        this.totalCount = result.total;
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open(this.translate.instant('cyber.incidents.loadError'), 'OK', { duration: 4000 });
        this.loading.set(false);
      }
    });
  }

  loadStats() {
    this.incidentService.getStats().subscribe({
      next: stats => {
        this.stats = stats;
        this.maxSectorCount = Math.max(1, ...stats.bySector.map(x => x.count));
        this.maxTypeCount = Math.max(1, ...stats.byType.map(x => x.count));
        this.maxSeverityCount = Math.max(1, ...stats.bySeverity.map(x => x.count));
      },
      error: () => {}
    });
  }

  onSearch() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadIncidents(), 400);
  }

  toggleDetail(inc: IncidentDto) {
    this.selectedIncident = this.selectedIncident?.id === inc.id ? null : inc;
  }

  // ── FORM MANAGEMENT ──

  startCreate() {
    this.resetForm();
    this.formCountryCode = this.auth.user()?.countryCode ?? '';
    this.mode = 'create';
    this.selectedIncident = null;
  }

  startEdit(inc: IncidentDto) {
    this.editingId = inc.id;
    this.formTitle = inc.title;
    this.formDescription = inc.description;
    this.formSeverity = inc.severity;
    this.formSector = inc.sector;
    this.formIncidentType = inc.incidentType;
    this.formCountryCode = inc.countryCode;
    this.formSource = inc.source ?? '';
    this.formAffectedSystems = [...inc.affectedSystems];
    this.formIocs = [...inc.iocs];
    this.formAttachment = null;
    this.formStatus = inc.status;
    this.formContainmentPercent = inc.containmentPercent;
    this.newSystem = '';
    this.newIoc = '';
    this.mode = 'edit';
  }

  cancelForm() {
    this.mode = 'list';
    this.resetForm();
  }

  private resetForm() {
    this.editingId = null;
    this.formTitle = '';
    this.formDescription = '';
    this.formSeverity = 'medium';
    this.formSector = '';
    this.formIncidentType = '';
    this.formCountryCode = '';
    this.formSource = '';
    this.formAffectedSystems = [];
    this.formIocs = [];
    this.formAttachment = null;
    this.formStatus = 'open';
    this.formContainmentPercent = 0;
    this.newSystem = '';
    this.newIoc = '';
  }

  canSubmit(): boolean {
    return !!(this.formTitle.trim() && this.formDescription.trim() &&
              this.formSeverity && this.formSector && this.formIncidentType && this.formCountryCode);
  }

  submitForm() {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);

    if (this.mode === 'create') {
      this.incidentService.create({
        title: this.formTitle,
        description: this.formDescription,
        severity: this.formSeverity,
        sector: this.formSector,
        incidentType: this.formIncidentType,
        countryCode: this.formCountryCode,
        source: this.formSource || undefined,
        affectedSystems: this.formAffectedSystems,
        iocs: this.formIocs,
        attachment: this.formAttachment ?? undefined
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.snackBar.open(this.translate.instant('cyber.incidents.createSuccess'), 'OK', { duration: 4000 });
          this.mode = 'list';
          this.resetForm();
          this.loadIncidents();
          this.loadStats();
        },
        error: () => {
          this.submitting.set(false);
          this.snackBar.open(this.translate.instant('common.error'), 'OK', { duration: 4000 });
        }
      });
    } else if (this.mode === 'edit' && this.editingId) {
      this.incidentService.update(this.editingId, {
        title: this.formTitle,
        description: this.formDescription,
        severity: this.formSeverity,
        status: this.formStatus,
        sector: this.formSector,
        incidentType: this.formIncidentType,
        source: this.formSource || undefined,
        affectedSystems: this.formAffectedSystems,
        iocs: this.formIocs,
        containmentPercent: this.formContainmentPercent,
        attachment: this.formAttachment ?? undefined
      }).subscribe({
        next: updated => {
          this.submitting.set(false);
          this.snackBar.open(this.translate.instant('cyber.incidents.updateSuccess'), 'OK', { duration: 4000 });
          this.mode = 'list';
          this.resetForm();
          this.loadIncidents();
          this.loadStats();
          this.selectedIncident = updated;
        },
        error: () => {
          this.submitting.set(false);
          this.snackBar.open(this.translate.instant('common.error'), 'OK', { duration: 4000 });
        }
      });
    }
  }

  // ── CHIP INPUT ──

  addSystem() {
    const val = this.newSystem.trim();
    if (val && !this.formAffectedSystems.includes(val)) {
      this.formAffectedSystems = [...this.formAffectedSystems, val];
    }
    this.newSystem = '';
  }

  removeSystem(sys: string) {
    this.formAffectedSystems = this.formAffectedSystems.filter(s => s !== sys);
  }

  addIoc() {
    const val = this.newIoc.trim();
    if (val && !this.formIocs.includes(val)) {
      this.formIocs = [...this.formIocs, val];
    }
    this.newIoc = '';
  }

  removeIoc(ioc: string) {
    this.formIocs = this.formIocs.filter(i => i !== ioc);
  }

  // ── FILE UPLOAD ──

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setFile(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open(this.translate.instant('submitReport.fileTooLarge'), 'OK', { duration: 4000 });
      return;
    }
    this.formAttachment = file;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── HELPERS ──

  getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
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

  getSectorLabel(value: string): string {
    const opt = SECTOR_OPTIONS.find(s => s.value === value);
    return opt ? this.translate.instant(opt.labelKey) : value;
  }

  getTypeLabel(value: string): string {
    const opt = TYPE_OPTIONS.find(t => t.value === value);
    return opt ? this.translate.instant(opt.labelKey) : value;
  }
}
