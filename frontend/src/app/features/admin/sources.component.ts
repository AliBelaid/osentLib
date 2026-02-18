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
import { SourceService } from '../../core/services/source.service';
import { SourceDto } from '../../core/models';

@Component({
  selector: 'app-sources',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatTableModule, MatSlideToggleModule
  ],
  template: `
    <!-- Header -->
    <div class="page-header">
      <div class="header-title">
        <div class="header-icon-wrap">
          <mat-icon>source</mat-icon>
        </div>
        <div>
          <h2 class="gradient-title">Intelligence Sources</h2>
          <p class="header-subtitle">OSINT Feed Management Console</p>
        </div>
      </div>
      <div class="header-decoration">
        <span class="pulse-dot"></span>
        <span class="header-status">SYSTEM ONLINE</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon total-icon">
          <mat-icon>hub</mat-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ sources.length }}</div>
          <div class="stat-label">Total Sources</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value active-value">{{ getActiveSources() }}</div>
          <div class="stat-label">Active Feeds</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon inactive-icon">
          <mat-icon>pause_circle</mat-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value inactive-value">{{ getInactiveSources() }}</div>
          <div class="stat-label">Inactive</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon types-icon">
          <mat-icon>category</mat-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ getUniqueTypes() }}</div>
          <div class="stat-label">Source Types</div>
        </div>
      </div>
    </div>

    <!-- Add Source Form -->
    <mat-card class="form-card">
      <div class="form-card-header">
        <mat-icon>add_circle</mat-icon>
        <span>Register New Intelligence Source</span>
      </div>
      <mat-card-content>
        <form (ngSubmit)="create()" class="source-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="field-type">
              <mat-label>Source Type</mat-label>
              <mat-select [(ngModel)]="newSource.type" name="type" required>
                <mat-option value="GDELT">
                  <span class="option-label"><span class="type-dot gdelt-dot"></span> GDELT</span>
                </mat-option>
                <mat-option value="RSS">
                  <span class="option-label"><span class="type-dot rss-dot"></span> RSS</span>
                </mat-option>
                <mat-option value="MediaCloud">
                  <span class="option-label"><span class="type-dot mediacloud-dot"></span> MediaCloud</span>
                </mat-option>
                <mat-option value="ReliefWeb">
                  <span class="option-label"><span class="type-dot reliefweb-dot"></span> ReliefWeb</span>
                </mat-option>
                <mat-option value="AllAfrica">
                  <span class="option-label"><span class="type-dot allafrica-dot"></span> AllAfrica</span>
                </mat-option>
                <mat-option value="UN News">
                  <span class="option-label"><span class="type-dot unnews-dot"></span> UN News</span>
                </mat-option>
                <mat-option value="WHO">
                  <span class="option-label"><span class="type-dot who-dot"></span> WHO</span>
                </mat-option>
                <mat-option value="Twitter/X">
                  <span class="option-label"><span class="type-dot twitter-dot"></span> Twitter/X</span>
                </mat-option>
                <mat-option value="Telegram">
                  <span class="option-label"><span class="type-dot telegram-dot"></span> Telegram</span>
                </mat-option>
                <mat-option value="Dark Web">
                  <span class="option-label"><span class="type-dot darkweb-dot"></span> Dark Web</span>
                </mat-option>
                <mat-option value="CERT Feed">
                  <span class="option-label"><span class="type-dot cert-dot"></span> CERT Feed</span>
                </mat-option>
                <mat-option value="Shodan">
                  <span class="option-label"><span class="type-dot shodan-dot"></span> Shodan</span>
                </mat-option>
                <mat-option value="VirusTotal">
                  <span class="option-label"><span class="type-dot virustotal-dot"></span> VirusTotal</span>
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-name">
              <mat-label>Feed Name</mat-label>
              <input matInput [(ngModel)]="newSource.name" name="name" required
                     placeholder="e.g. GDELT Africa Monitor">
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-url">
              <mat-label>Endpoint URL</mat-label>
              <input matInput [(ngModel)]="newSource.url" name="url" required
                     placeholder="https://api.example.com/feed">
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-interval">
              <mat-label>Interval (min)</mat-label>
              <input matInput type="number" [(ngModel)]="newSource.fetchIntervalMinutes" name="interval"
                     min="1" max="1440">
            </mat-form-field>
            <button mat-raised-button type="submit" class="add-btn">
              <mat-icon>add</mat-icon>
              Deploy Source
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <!-- Sources Table -->
    <div class="table-container">
      <div class="table-header">
        <mat-icon>dns</mat-icon>
        <span>Registered Intelligence Feeds</span>
        <span class="table-count">{{ sources.length }} sources</span>
      </div>
      <table mat-table [dataSource]="sources" class="sources-table">
        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>TYPE</th>
          <td mat-cell *matCellDef="let s">
            <span class="type-badge" [ngClass]="getTypeClass(s.type)">{{ s.type }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>SOURCE NAME</th>
          <td mat-cell *matCellDef="let s" class="name-cell">{{ s.name }}</td>
        </ng-container>
        <ng-container matColumnDef="url">
          <th mat-header-cell *matHeaderCellDef>ENDPOINT</th>
          <td mat-cell *matCellDef="let s" class="url-cell">
            <span class="url-text">{{ s.url }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="interval">
          <th mat-header-cell *matHeaderCellDef>INTERVAL</th>
          <td mat-cell *matCellDef="let s" class="interval-cell">
            <mat-icon class="interval-icon">schedule</mat-icon>
            {{ s.fetchIntervalMinutes }}m
          </td>
        </ng-container>
        <ng-container matColumnDef="lastFetched">
          <th mat-header-cell *matHeaderCellDef>LAST FETCHED</th>
          <td mat-cell *matCellDef="let s" class="fetched-cell">
            <span *ngIf="s.lastFetchedAt" class="fetched-time">{{ getRelativeTime(s.lastFetchedAt) }}</span>
            <span *ngIf="!s.lastFetchedAt" class="never-fetched">NEVER</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="active">
          <th mat-header-cell *matHeaderCellDef>STATUS</th>
          <td mat-cell *matCellDef="let s">
            <div class="status-toggle" [class.active-glow]="s.isActive">
              <mat-slide-toggle [checked]="s.isActive" (change)="toggle(s)"
                                color="primary"></mat-slide-toggle>
              <span class="status-label" [class.status-active]="s.isActive"
                    [class.status-inactive]="!s.isActive">
                {{ s.isActive ? 'ACTIVE' : 'OFFLINE' }}
              </span>
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let s">
            <button mat-icon-button class="delete-btn" (click)="deleteSource(s)"
                    matTooltip="Remove source">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
            class="source-row"
            [style.animation-delay]="(i * 0.04) + 's'"></tr>
      </table>

      <div *ngIf="sources.length === 0" class="empty-state">
        <mat-icon>cloud_off</mat-icon>
        <p>No intelligence sources configured</p>
        <span>Use the form above to register your first OSINT feed</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--bg-page);
      min-height: 100vh;
      padding: 32px;
      color: var(--text-primary);
    }

    /* ===== Header ===== */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-icon-wrap {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #667eea, #00d4ff);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
    }
    .header-icon-wrap mat-icon {
      color: #fff; font-size: 28px; width: 28px; height: 28px;
    }
    .gradient-title {
      margin: 0; font-size: 26px; font-weight: 700;
      background: linear-gradient(135deg, #667eea, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      margin: 2px 0 0; font-size: 13px;
      color: var(--text-tertiary); letter-spacing: 1.5px;
      text-transform: uppercase; font-family: 'Courier New', monospace;
    }
    .header-decoration {
      display: flex; align-items: center; gap: 8px;
    }
    .pulse-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px #00e676, 0 0 16px rgba(0, 230, 118, 0.4);
      animation: pulse 2s ease-in-out infinite;
    }
    .header-status {
      font-family: 'Courier New', monospace;
      font-size: 11px; color: #00e676;
      letter-spacing: 2px; text-transform: uppercase;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    /* ===== Stats Row ===== */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      display: flex; align-items: center; gap: 14px;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      padding: 18px 20px;
      transition: all 0.25s ease;
    }
    .stat-card:hover {
      border-color: rgba(102, 126, 234, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .stat-icon {
      width: 46px; height: 46px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { color: #fff; font-size: 24px; width: 24px; height: 24px; }
    .total-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
    .active-icon { background: linear-gradient(135deg, #00e676, #00c853); }
    .inactive-icon { background: linear-gradient(135deg, #576574, #3d4455); }
    .types-icon { background: linear-gradient(135deg, #00d4ff, #667eea); }
    .stat-value { font-size: 26px; font-weight: 700; color: var(--text-primary); font-family: 'Courier New', monospace; }
    .active-value { color: #00e676; }
    .inactive-value { color: var(--text-tertiary); }
    .stat-label { font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; }

    /* ===== Form Card ===== */
    .form-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-default) !important;
      border-radius: 12px !important;
      margin-bottom: 24px;
      overflow: hidden;
    }
    .form-card-header {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 24px;
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.1), transparent);
      border-bottom: 1px solid var(--border-default);
      font-size: 14px; font-weight: 600; color: #667eea;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .form-card-header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .source-form { padding: 8px 0; }
    .form-row {
      display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
      padding: 0 8px;
    }
    .field-type { width: 170px; }
    .field-name { width: 200px; }
    .field-url { flex: 1; min-width: 280px; }
    .field-interval { width: 130px; }

    /* Dark form field overrides */
    .form-card ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .form-card ::ng-deep .mdc-text-field--outlined {
      background: var(--bg-input) !important;
    }
    .form-card ::ng-deep .mdc-notched-outline__leading,
    .form-card ::ng-deep .mdc-notched-outline__notch,
    .form-card ::ng-deep .mdc-notched-outline__trailing {
      border-color: rgba(102, 126, 234, 0.25) !important;
    }
    .form-card ::ng-deep .mdc-text-field--focused .mdc-notched-outline__leading,
    .form-card ::ng-deep .mdc-text-field--focused .mdc-notched-outline__notch,
    .form-card ::ng-deep .mdc-text-field--focused .mdc-notched-outline__trailing {
      border-color: #667eea !important;
    }
    .form-card ::ng-deep .mat-mdc-input-element,
    .form-card ::ng-deep .mat-mdc-select-value {
      color: var(--text-primary) !important;
    }
    .form-card ::ng-deep .mat-mdc-floating-label {
      color: var(--text-tertiary) !important;
    }

    /* Option dot indicators */
    .option-label { display: flex; align-items: center; gap: 8px; }
    .type-dot {
      width: 8px; height: 8px; border-radius: 50%; display: inline-block;
    }
    .gdelt-dot { background: #00d4ff; box-shadow: 0 0 6px rgba(0, 212, 255, 0.5); }
    .rss-dot { background: #667eea; box-shadow: 0 0 6px rgba(102, 126, 234, 0.5); }
    .mediacloud-dot { background: #a855f7; box-shadow: 0 0 6px rgba(168, 85, 247, 0.5); }
    .reliefweb-dot { background: #ff9800; box-shadow: 0 0 6px rgba(255, 152, 0, 0.5); }
    .allafrica-dot { background: #00e676; box-shadow: 0 0 6px rgba(0, 230, 118, 0.5); }
    .unnews-dot { background: #4fc3f7; box-shadow: 0 0 6px rgba(79, 195, 247, 0.5); }
    .who-dot { background: #ff1744; box-shadow: 0 0 6px rgba(255, 23, 68, 0.5); }
    .twitter-dot { background: #38bdf8; box-shadow: 0 0 6px rgba(56, 189, 248, 0.5); }
    .telegram-dot { background: #2196f3; box-shadow: 0 0 6px rgba(33, 150, 243, 0.5); }
    .darkweb-dot { background: #ff1744; box-shadow: 0 0 6px rgba(255, 23, 68, 0.5); }
    .cert-dot { background: #00e676; box-shadow: 0 0 6px rgba(0, 230, 118, 0.5); }
    .shodan-dot { background: #ff9800; box-shadow: 0 0 6px rgba(255, 152, 0, 0.5); }
    .virustotal-dot { background: #667eea; box-shadow: 0 0 6px rgba(102, 126, 234, 0.5); }

    .add-btn {
      background: linear-gradient(135deg, #667eea, #00d4ff) !important;
      color: #fff !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px;
      height: 48px;
      border-radius: 8px !important;
      padding: 0 24px !important;
      transition: all 0.25s ease !important;
      text-transform: uppercase;
      font-size: 12px !important;
    }
    .add-btn:hover {
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4) !important;
      transform: translateY(-1px);
    }
    .add-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* ===== Table ===== */
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
    }
    .table-header {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 24px;
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.08), transparent);
      border-bottom: 1px solid var(--border-default);
      font-size: 14px; font-weight: 600; color: #667eea;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .table-header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .table-count {
      margin-left: auto;
      font-size: 11px; color: var(--text-tertiary);
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    .sources-table {
      width: 100%;
      background: transparent !important;
    }
    .sources-table ::ng-deep .mat-mdc-header-row {
      background: var(--bg-input) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .sources-table ::ng-deep .mat-mdc-header-cell {
      color: var(--text-tertiary) !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border-bottom: none !important;
      padding: 12px 16px !important;
      font-family: 'Courier New', monospace;
    }
    .sources-table ::ng-deep .mat-mdc-row {
      background: transparent !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
      transition: all 0.2s ease;
    }
    .sources-table ::ng-deep .mat-mdc-row:hover {
      background: rgba(102, 126, 234, 0.06) !important;
    }
    .sources-table ::ng-deep .mat-mdc-cell {
      color: var(--text-primary) !important;
      border-bottom: none !important;
      padding: 14px 16px !important;
      font-size: 13px;
    }

    /* Staggered fadeIn for rows */
    .source-row {
      animation: fadeInRow 0.4s ease forwards;
      opacity: 0;
    }
    @keyframes fadeInRow {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Type Badges */
    .type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
      white-space: nowrap;
    }
    .type-gdelt {
      background: rgba(0, 212, 255, 0.12);
      color: #00d4ff;
      border: 1px solid rgba(0, 212, 255, 0.25);
    }
    .type-rss {
      background: rgba(102, 126, 234, 0.12);
      color: #667eea;
      border: 1px solid rgba(102, 126, 234, 0.25);
    }
    .type-mediacloud {
      background: rgba(168, 85, 247, 0.12);
      color: #a855f7;
      border: 1px solid rgba(168, 85, 247, 0.25);
    }
    .type-reliefweb {
      background: rgba(255, 152, 0, 0.12);
      color: #ff9800;
      border: 1px solid rgba(255, 152, 0, 0.25);
    }
    .type-allafrica {
      background: rgba(0, 230, 118, 0.12);
      color: #00e676;
      border: 1px solid rgba(0, 230, 118, 0.25);
    }
    .type-unnews {
      background: rgba(79, 195, 247, 0.12);
      color: #4fc3f7;
      border: 1px solid rgba(79, 195, 247, 0.25);
    }
    .type-who {
      background: rgba(255, 23, 68, 0.12);
      color: #ff1744;
      border: 1px solid rgba(255, 23, 68, 0.25);
    }
    .type-twitter {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }
    .type-telegram {
      background: rgba(33, 150, 243, 0.12);
      color: #2196f3;
      border: 1px solid rgba(33, 150, 243, 0.25);
    }
    .type-darkweb {
      background: rgba(255, 23, 68, 0.12);
      color: #ff1744;
      border: 1px solid rgba(255, 23, 68, 0.25);
    }
    .type-cert {
      background: rgba(0, 230, 118, 0.12);
      color: #00e676;
      border: 1px solid rgba(0, 230, 118, 0.25);
    }
    .type-shodan {
      background: rgba(255, 152, 0, 0.12);
      color: #ff9800;
      border: 1px solid rgba(255, 152, 0, 0.25);
    }
    .type-virustotal {
      background: rgba(102, 126, 234, 0.12);
      color: #667eea;
      border: 1px solid rgba(102, 126, 234, 0.25);
    }

    /* Name cell */
    .name-cell { font-weight: 600; color: var(--text-primary) !important; }

    /* URL cell */
    .url-cell {
      max-width: 320px;
    }
    .url-text {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #667eea !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
      max-width: 320px;
    }

    /* Interval cell */
    .interval-cell {
      display: flex !important;
      align-items: center;
      gap: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #00d4ff !important;
    }
    .interval-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: var(--text-tertiary);
    }

    /* Last Fetched cell */
    .fetched-cell {
      font-family: 'Courier New', monospace;
      font-size: 12px !important;
    }
    .fetched-time { color: var(--text-primary); }
    .never-fetched {
      color: var(--text-tertiary);
      letter-spacing: 1px;
      font-size: 10px;
    }

    /* Status Toggle */
    .status-toggle {
      display: flex; align-items: center; gap: 8px;
    }
    .active-glow ::ng-deep .mdc-switch--selected .mdc-switch__handle::after {
      background: #00e676 !important;
    }
    .active-glow ::ng-deep .mdc-switch--selected .mdc-switch__track::after {
      background: rgba(0, 230, 118, 0.35) !important;
    }
    .status-label {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
    }
    .status-active {
      color: #00e676;
      text-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
    }
    .status-inactive { color: var(--text-tertiary); }

    /* Delete button */
    .delete-btn {
      color: var(--text-tertiary) !important;
      transition: all 0.2s ease !important;
    }
    .delete-btn:hover {
      color: #ff1744 !important;
      background: rgba(255, 23, 68, 0.1) !important;
    }

    /* Empty State */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 24px; color: var(--text-tertiary);
    }
    .empty-state mat-icon {
      font-size: 48px; width: 48px; height: 48px;
      margin-bottom: 12px; opacity: 0.4;
    }
    .empty-state p {
      font-size: 16px; font-weight: 600; margin: 0 0 4px;
      color: var(--text-primary);
    }
    .empty-state span {
      font-size: 13px;
      font-family: 'Courier New', monospace;
    }

    /* ===== Responsive ===== */
    @media (max-width: 1100px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .form-row { flex-direction: column; align-items: stretch; }
      .field-type, .field-name, .field-url, .field-interval { width: 100%; min-width: unset; }
    }
    @media (max-width: 600px) {
      :host { padding: 16px; }
      .stats-row { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    }
  `]
})
export class SourcesComponent implements OnInit {
  sources: SourceDto[] = [];
  displayedColumns = ['type', 'name', 'url', 'interval', 'lastFetched', 'active', 'actions'];

  newSource = { type: 'RSS', name: '', url: '', fetchIntervalMinutes: 15 };

  constructor(private sourceService: SourceService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.sourceService.list().subscribe(data => this.sources = data);
  }

  create() {
    this.sourceService.create({
      type: this.newSource.type,
      name: this.newSource.name,
      url: this.newSource.url,
      fetchIntervalMinutes: this.newSource.fetchIntervalMinutes
    }).subscribe(() => {
      this.newSource = { type: 'RSS', name: '', url: '', fetchIntervalMinutes: 15 };
      this.load();
    });
  }

  toggle(source: SourceDto) {
    this.sourceService.toggle(source.id).subscribe(() => this.load());
  }

  deleteSource(source: SourceDto) {
    if (confirm(`Delete source "${source.name}"?`)) {
      this.sourceService.delete(source.id).subscribe(() => this.load());
    }
  }

  getActiveSources(): number {
    return this.sources.filter(s => s.isActive).length;
  }

  getInactiveSources(): number {
    return this.sources.filter(s => !s.isActive).length;
  }

  getUniqueTypes(): number {
    return new Set(this.sources.map(s => s.type)).size;
  }

  getTypeClass(type: string): string {
    const map: Record<string, string> = {
      'GDELT': 'type-gdelt',
      'RSS': 'type-rss',
      'MediaCloud': 'type-mediacloud',
      'ReliefWeb': 'type-reliefweb',
      'AllAfrica': 'type-allafrica',
      'UN News': 'type-unnews',
      'WHO': 'type-who',
      'Twitter/X': 'type-twitter',
      'Telegram': 'type-telegram',
      'Dark Web': 'type-darkweb',
      'CERT Feed': 'type-cert',
      'Shodan': 'type-shodan',
      'VirusTotal': 'type-virustotal'
    };
    return map[type] || 'type-rss';
  }

  getRelativeTime(dateStr: string): string {
    const now = new Date().getTime();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  }
}
