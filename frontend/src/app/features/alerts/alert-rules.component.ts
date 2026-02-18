import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AlertService } from '../../core/services/alert.service';
import { AlertRuleDto } from '../../core/models';

@Component({
  selector: 'app-alert-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatTableModule, MatSlideToggleModule
  ],
  template: `
    <!-- ========== HEADER ========== -->
    <div class="page-header">
      <div class="header-title-row">
        <div class="header-icon-wrap">
          <mat-icon class="header-icon">rule</mat-icon>
        </div>
        <div>
          <h1 class="page-title">Alert Rules Engine</h1>
          <p class="page-subtitle">Define automated threat detection rules for OSINT monitoring</p>
        </div>
      </div>
      <div class="live-badge">
        <span class="live-dot"></span>
        LIVE
      </div>
    </div>

    <!-- ========== STATS ROW ========== -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon-wrap stat-total">
          <mat-icon>playlist_add_check</mat-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ rules.length }}</span>
          <span class="stat-label">Total Rules</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap stat-active">
          <mat-icon>check_circle</mat-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value stat-value-green">{{ activeCount }}</span>
          <span class="stat-label">Active</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap stat-inactive">
          <mat-icon>pause_circle</mat-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value stat-value-muted">{{ inactiveCount }}</span>
          <span class="stat-label">Inactive</span>
        </div>
      </div>
    </div>

    <!-- ========== NEW RULE FORM ========== -->
    <div class="form-card">
      <div class="card-header">
        <mat-icon class="card-header-icon">add_circle_outline</mat-icon>
        <span class="card-header-title">Create New Rule</span>
      </div>
      <div class="card-body">
        <form (ngSubmit)="createRule()">
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Rule Name</label>
              <input
                class="cyber-input"
                placeholder="e.g. Sahel Terrorism Monitor"
                [(ngModel)]="newRule.name"
                name="name"
                required
              />
            </div>
            <div class="field-group">
              <label class="field-label">Category</label>
              <select class="cyber-select" [(ngModel)]="newRule.category" name="category">
                <option value="">Any Category</option>
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Threat Type</label>
              <select class="cyber-select" [(ngModel)]="newRule.threatType" name="threatType">
                <option value="">Any Type</option>
                <option *ngFor="let t of threatTypes" [value]="t">{{ t }}</option>
              </select>
            </div>
            <div class="field-group field-group-small">
              <label class="field-label">Min Level</label>
              <select class="cyber-select" [(ngModel)]="newRule.minThreatLevel" name="minThreatLevel">
                <option *ngFor="let l of [0,1,2,3,4,5]" [value]="l">{{ l }}</option>
              </select>
            </div>
            <div class="field-group field-group-btn">
              <button class="btn-add-rule" type="submit">
                <mat-icon>add</mat-icon>
                Add Rule
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- ========== RULES TABLE ========== -->
    <div class="table-card">
      <div class="card-header">
        <mat-icon class="card-header-icon">shield</mat-icon>
        <span class="card-header-title">Configured Rules</span>
        <span class="card-header-count">{{ rules.length }} rules</span>
      </div>
      <div class="table-wrap">
        <table mat-table [dataSource]="rules" class="rules-table">

          <!-- Name -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>RULE NAME</th>
            <td mat-cell *matCellDef="let r; let i = index">
              <div class="rule-name-cell" [style.animation-delay]="(i * 60) + 'ms'">
                <mat-icon class="rule-cell-icon">description</mat-icon>
                <span class="rule-name-text">{{ r.name }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Category -->
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>CATEGORY</th>
            <td mat-cell *matCellDef="let r">
              <span class="tag tag-category">{{ r.category ?? 'Any' }}</span>
            </td>
          </ng-container>

          <!-- Threat Type -->
          <ng-container matColumnDef="threatType">
            <th mat-header-cell *matHeaderCellDef>THREAT TYPE</th>
            <td mat-cell *matCellDef="let r">
              <span class="tag tag-threat">{{ r.threatType ?? 'Any' }}</span>
            </td>
          </ng-container>

          <!-- Min Level -->
          <ng-container matColumnDef="minLevel">
            <th mat-header-cell *matHeaderCellDef>MIN LEVEL</th>
            <td mat-cell *matCellDef="let r">
              <span class="level-badge"
                    [class.level-high]="r.minThreatLevel >= 4"
                    [class.level-med]="r.minThreatLevel >= 2 && r.minThreatLevel < 4"
                    [class.level-low]="r.minThreatLevel < 2">
                {{ r.minThreatLevel }}
              </span>
            </td>
          </ng-container>

          <!-- Active -->
          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>STATUS</th>
            <td mat-cell *matCellDef="let r">
              <div class="status-cell">
                <mat-slide-toggle
                  [checked]="r.isActive"
                  (change)="toggle(r)"
                  [class.toggle-active]="r.isActive"
                  [class.toggle-inactive]="!r.isActive">
                </mat-slide-toggle>
                <span class="status-label" [class.status-on]="r.isActive" [class.status-off]="!r.isActive">
                  {{ r.isActive ? 'ACTIVE' : 'OFF' }}
                </span>
              </div>
            </td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <button class="btn-delete" (click)="deleteRule(r)" title="Delete rule">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              class="rule-row"
              [style.animation-delay]="(i * 60) + 'ms'">
          </tr>
        </table>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="rules.length === 0">
          <mat-icon>rule_folder</mat-icon>
          <p>No alert rules configured yet</p>
          <span>Create your first rule above to start monitoring</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== ANIMATIONS ===== */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.5); }
      50%      { opacity: 0.6; box-shadow: 0 0 0 6px rgba(0, 230, 118, 0); }
    }

    @keyframes gradientShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* ===== HOST ===== */
    :host {
      display: block;
      background: var(--bg-page);
      min-height: 100vh;
      padding: 32px;
      color: var(--text-primary);
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }

    /* ===== PAGE HEADER ===== */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      animation: fadeInUp 0.5s ease-out both;
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(0, 212, 255, 0.10));
      border: 1px solid rgba(102, 126, 234, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #667eea, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .page-title {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #667eea, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .page-subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--text-tertiary);
      letter-spacing: 0.2px;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 20px;
      background: rgba(0, 230, 118, 0.08);
      border: 1px solid rgba(0, 230, 118, 0.2);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #00e676;
      text-transform: uppercase;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00e676;
      animation: pulse 2s ease-in-out infinite;
    }

    /* ===== STATS ROW ===== */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 28px;
      animation: fadeInUp 0.5s ease-out 0.1s both;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 14px;
      transition: border-color 0.25s, box-shadow 0.25s;
    }

    .stat-card:hover {
      border-color: rgba(102, 126, 234, 0.2);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
    }

    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-wrap mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .stat-total {
      background: rgba(102, 126, 234, 0.12);
      color: #667eea;
    }
    .stat-active {
      background: rgba(0, 230, 118, 0.10);
      color: #00e676;
    }
    .stat-inactive {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-tertiary);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    .stat-value-green { color: #00e676; }
    .stat-value-muted { color: var(--text-tertiary); }

    .stat-label {
      font-size: 12px;
      color: var(--text-tertiary);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 2px;
    }

    /* ===== SHARED CARD STYLES ===== */
    .form-card,
    .table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .form-card {
      animation: fadeInUp 0.5s ease-out 0.2s both;
    }

    .table-card {
      animation: fadeInUp 0.5s ease-out 0.3s both;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-default);
    }

    .card-header-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #667eea;
    }

    .card-header-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.2px;
    }

    .card-header-count {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-tertiary);
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px 10px;
      border-radius: 6px;
    }

    .card-body {
      padding: 24px;
    }

    /* ===== FORM ===== */
    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 180px;
    }

    .field-group-small {
      flex: 0 0 110px;
      min-width: 110px;
    }

    .field-group-btn {
      flex: 0 0 auto;
      min-width: auto;
    }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-tertiary);
    }

    .cyber-input,
    .cyber-select {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      color: var(--text-primary);
      background: var(--bg-input);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px;
      outline: none;
      transition: border-color 0.25s, box-shadow 0.25s;
      box-sizing: border-box;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
    }

    .cyber-select {
      padding-right: 32px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%235a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      cursor: pointer;
    }

    .cyber-select option {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .cyber-input::placeholder {
      color: var(--text-tertiary);
    }

    .cyber-input:focus,
    .cyber-select:focus {
      border-color: #00d4ff;
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.10), 0 0 20px rgba(0, 212, 255, 0.05);
    }

    .btn-add-rule {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      color: #fff;
      background: linear-gradient(135deg, #667eea, #5a67d8);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.25s;
      white-space: nowrap;
      letter-spacing: 0.2px;
    }

    .btn-add-rule mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-add-rule:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(102, 126, 234, 0.35);
    }

    .btn-add-rule:active {
      transform: translateY(0);
    }

    /* ===== TABLE ===== */
    .table-wrap {
      overflow-x: auto;
    }

    .rules-table {
      width: 100%;
      background: transparent !important;
      border-collapse: collapse;
    }

    /* Header row */
    :host ::ng-deep .rules-table .mat-mdc-header-row {
      background: var(--bg-surface) !important;
      height: 48px;
    }

    :host ::ng-deep .rules-table .mat-mdc-header-cell {
      color: var(--text-tertiary) !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 1px !important;
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-default) !important;
      padding: 0 16px !important;
      font-family: 'Inter', 'Segoe UI', sans-serif !important;
    }

    /* Data rows */
    :host ::ng-deep .rules-table .mat-mdc-row {
      background: transparent !important;
      transition: background 0.2s;
      animation: fadeInUp 0.4s ease-out both;
    }

    :host ::ng-deep .rules-table .mat-mdc-row:nth-child(odd) {
      background: var(--bg-card) !important;
    }

    :host ::ng-deep .rules-table .mat-mdc-row:nth-child(even) {
      background: var(--bg-surface) !important;
    }

    :host ::ng-deep .rules-table .mat-mdc-row:hover {
      background: rgba(102, 126, 234, 0.06) !important;
    }

    :host ::ng-deep .rules-table .mat-mdc-cell {
      color: var(--text-primary) !important;
      font-size: 13px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
      padding: 0 16px !important;
      height: 52px !important;
      font-family: 'Inter', 'Segoe UI', sans-serif !important;
    }

    /* Rule name cell */
    .rule-name-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .rule-cell-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #667eea;
      opacity: 0.6;
    }

    .rule-name-text {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Tags */
    .tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .tag-category {
      background: rgba(102, 126, 234, 0.10);
      color: #8ea4f0;
      border: 1px solid rgba(102, 126, 234, 0.15);
    }

    .tag-threat {
      background: rgba(0, 212, 255, 0.08);
      color: #4dd9f0;
      border: 1px solid rgba(0, 212, 255, 0.12);
    }

    /* Level badge */
    .level-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    .level-high {
      background: rgba(255, 23, 68, 0.12);
      color: #ff1744;
      border: 1px solid rgba(255, 23, 68, 0.2);
    }

    .level-med {
      background: rgba(255, 171, 0, 0.10);
      color: #ffab00;
      border: 1px solid rgba(255, 171, 0, 0.18);
    }

    .level-low {
      background: rgba(0, 230, 118, 0.08);
      color: #00e676;
      border: 1px solid rgba(0, 230, 118, 0.15);
    }

    /* Status cell */
    .status-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    .status-on  { color: #00e676; }
    .status-off { color: var(--text-tertiary); }

    /* Toggle override for active state */
    :host ::ng-deep .toggle-active .mdc-switch--selected .mdc-switch__handle::after,
    :host ::ng-deep .toggle-active .mdc-switch--selected .mdc-switch__track::after {
      background: #00e676 !important;
    }

    :host ::ng-deep .toggle-active .mdc-switch--selected .mdc-switch__icon {
      fill: var(--bg-page) !important;
    }

    :host ::ng-deep .toggle-inactive .mdc-switch__track {
      opacity: 0.25 !important;
    }

    /* Delete button */
    .btn-delete {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(255, 23, 68, 0.15);
      border-radius: 8px;
      background: rgba(255, 23, 68, 0.06);
      color: #ff1744;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
    }

    .btn-delete mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-delete:hover {
      background: rgba(255, 23, 68, 0.14);
      border-color: rgba(255, 23, 68, 0.35);
      box-shadow: 0 0 16px rgba(255, 23, 68, 0.15);
    }

    /* ===== EMPTY STATE ===== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--text-primary);
      margin-bottom: 16px;
    }

    .empty-state p {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-tertiary);
    }

    .empty-state span {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 4px;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 900px) {
      :host {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .stats-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .form-row {
        flex-direction: column;
      }

      .field-group,
      .field-group-small,
      .field-group-btn {
        min-width: 100%;
        flex: 1 1 100%;
      }

      .btn-add-rule {
        width: 100%;
        justify-content: center;
      }

      .card-body {
        padding: 16px;
      }

      :host ::ng-deep .rules-table .mat-mdc-header-cell,
      :host ::ng-deep .rules-table .mat-mdc-cell {
        padding: 0 10px !important;
      }
    }
  `]
})
export class AlertRulesComponent implements OnInit {
  rules: AlertRuleDto[] = [];
  displayedColumns = ['name', 'category', 'threatType', 'minLevel', 'active', 'actions'];
  categories = ['Politics', 'Security', 'Health', 'Economy', 'Environment', 'Technology', 'Society'];
  threatTypes = ['terrorism', 'unrest', 'epidemic', 'flood', 'drought', 'famine', 'cyber'];

  newRule = { name: '', category: '', threatType: '', minThreatLevel: 3, keywords: '' };

  constructor(private alertService: AlertService) {}

  get activeCount(): number {
    return this.rules.filter(r => r.isActive).length;
  }

  get inactiveCount(): number {
    return this.rules.filter(r => !r.isActive).length;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.alertService.listRules().subscribe(data => this.rules = data);
  }

  createRule() {
    this.alertService.createRule({
      name: this.newRule.name,
      category: this.newRule.category || undefined,
      threatType: this.newRule.threatType || undefined,
      minThreatLevel: this.newRule.minThreatLevel,
      keywords: this.newRule.keywords || undefined
    }).subscribe(() => {
      this.newRule = { name: '', category: '', threatType: '', minThreatLevel: 3, keywords: '' };
      this.load();
    });
  }

  toggle(rule: AlertRuleDto) {
    this.alertService.toggleRule(rule.id).subscribe(() => this.load());
  }

  deleteRule(rule: AlertRuleDto) {
    if (confirm(`Delete rule "${rule.name}"?`)) {
      this.alertService.deleteRule(rule.id).subscribe(() => this.load());
    }
  }
}
