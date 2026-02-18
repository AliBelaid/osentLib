import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { BulletinService } from '../../core/services/bulletin.service';
import { AuthService } from '../../core/services/auth.service';
import { BulletinDto } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';

@Component({
  selector: 'app-bulletin-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatChipsModule, MatIconModule, ThreatBadgeComponent
  ],
  template: `
    <!-- ====== HEADER SECTION ====== -->
    <div class="intel-header">
      <div class="header-left">
        <div class="title-row">
          <span class="pulse-dot"></span>
          <h2 class="page-title">Intelligence Bulletins</h2>
          <span class="classified-badge">CLASSIFIED</span>
        </div>
        <p class="header-subtitle">
          <mat-icon class="subtitle-icon">security</mat-icon>
          Real-time OSINT bulletin feed &mdash; {{ bulletins.length }} record(s) loaded
        </p>
      </div>
      <div class="header-right">
        @if (auth.hasRole('Editor') || auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
          <button mat-raised-button class="new-btn" routerLink="/bulletins/new">
            <mat-icon>add_circle_outline</mat-icon>
            <span>New Bulletin</span>
          </button>
        }
      </div>
    </div>

    <!-- ====== STATS ROW ====== -->
    <div class="stats-row">
      <div class="stat-card stat-published">
        <div class="stat-icon-wrap published-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ publishedCount }}</span>
          <span class="stat-label">Published</span>
        </div>
        <div class="stat-bar published-bar"></div>
      </div>
      <div class="stat-card stat-draft">
        <div class="stat-icon-wrap draft-icon">
          <mat-icon>edit_note</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ draftCount }}</span>
          <span class="stat-label">Drafts</span>
        </div>
        <div class="stat-bar draft-bar"></div>
      </div>
      <div class="stat-card stat-review">
        <div class="stat-icon-wrap review-icon">
          <mat-icon>rate_review</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ reviewCount }}</span>
          <span class="stat-label">Under Review</span>
        </div>
        <div class="stat-bar review-bar"></div>
      </div>
    </div>

    <!-- ====== BULLETIN CARDS ====== -->
    @for (b of bulletins; track b.id; let i = $index) {
      <div class="bulletin-card" [style.animation-delay]="(i * 80) + 'ms'">
        <!-- Severity left border indicator -->
        <div class="severity-strip" [ngClass]="{
          'sev-critical': b.severity >= 5,
          'sev-high':     b.severity === 4,
          'sev-elevated': b.severity === 3,
          'sev-moderate': b.severity === 2,
          'sev-low':      b.severity <= 1
        }"></div>

        <div class="card-body">
          <!-- Top row: status + threat badge -->
          <div class="card-top-row">
            <span class="status-badge" [ngClass]="{
              'status-draft':   b.status === 'draft',
              'status-review':  b.status === 'review',
              'status-published': b.status === 'published'
            }">
              <span class="status-dot"></span>
              {{ b.status | uppercase }}
            </span>
            <app-threat-badge [level]="b.severity" />
          </div>

          <!-- Title -->
          <h3 class="card-title">{{ b.title }}</h3>

          <!-- Author + date -->
          <div class="card-meta">
            <mat-icon class="meta-icon">person_outline</mat-icon>
            <span class="meta-text">{{ b.createdByName }}</span>
            <span class="meta-sep">//</span>
            <mat-icon class="meta-icon">schedule</mat-icon>
            <span class="meta-text">{{ b.createdAt | date:'dd MMM yyyy, HH:mm' }}</span>
          </div>

          <!-- Content preview -->
          <p class="card-content">{{ b.content | slice:0:200 }}...</p>

          <!-- Category chip -->
          @if (b.category) {
            <div class="category-row">
              <span class="category-chip">
                <mat-icon class="chip-icon">label</mat-icon>
                {{ b.category }}
              </span>
            </div>
          }

          <!-- Actions -->
          <div class="card-actions">
            @if (b.status === 'draft') {
              <button mat-button class="action-btn action-edit" [routerLink]="['/bulletins', b.id, 'edit']">
                <mat-icon>edit</mat-icon> Edit
              </button>
              <button mat-button class="action-btn action-submit" (click)="submitForReview(b)">
                <mat-icon>send</mat-icon> Submit for Review
              </button>
            }
            @if (b.status === 'review' && (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin'))) {
              <button mat-button class="action-btn action-publish" (click)="publish(b)">
                <mat-icon>publish</mat-icon> Publish
              </button>
            }
            @if (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
              <button mat-button class="action-btn action-delete" (click)="delete(b)">
                <mat-icon>delete_outline</mat-icon> Delete
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- ====== EMPTY STATE ====== -->
    @if (bulletins.length === 0) {
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <mat-icon class="empty-icon">folder_off</mat-icon>
          <div class="empty-scan-line"></div>
        </div>
        <h3 class="empty-title">No Bulletins Found</h3>
        <p class="empty-subtitle">
          There are no intelligence bulletins matching your access level.<br />
          Classified documents will appear here when available.
        </p>
      </div>
    }
  `,
  styles: [`
    /* ============================================
       OSINT / CYBER DARK THEME - BULLETIN LIST
       ============================================ */

    :host {
      display: block;
      min-height: 100vh;
      background: var(--bg-page);
      padding: 32px 40px;
      color: var(--text-secondary);
      font-family: 'Inter', 'Roboto', sans-serif;
    }

    /* ---------- HEADER ---------- */
    .intel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-default);
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 6px rgba(0, 230, 118, 0.4); opacity: 1; }
      50%      { box-shadow: 0 0 18px rgba(0, 230, 118, 0.9); opacity: 0.7; }
    }

    .page-title {
      margin: 0;
      font-size: 1.65rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-primary);
      background: linear-gradient(135deg, #667eea 0%, #00d4ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .classified-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 12px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 2px;
      color: #ff1744;
      border: 1px solid rgba(255, 23, 68, 0.4);
      background: rgba(255, 23, 68, 0.08);
      text-transform: uppercase;
      animation: classified-flash 3s ease-in-out infinite;
    }

    @keyframes classified-flash {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.55; }
    }

    .header-subtitle {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0 0;
      font-size: 0.82rem;
      color: var(--text-tertiary);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .subtitle-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #667eea;
    }

    .new-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
      cursor: pointer;
      transition: all 0.25s ease;
      text-transform: none;
    }

    .new-btn:hover {
      box-shadow: 0 6px 28px rgba(102, 126, 234, 0.55);
      transform: translateY(-1px);
    }

    .new-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* ---------- STATS ROW ---------- */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      overflow: hidden;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .stat-card:hover {
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }

    .stat-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 3px;
    }

    .published-bar { background: linear-gradient(90deg, transparent, #00e676); }
    .draft-bar     { background: linear-gradient(90deg, transparent, #ffa726); }
    .review-bar    { background: linear-gradient(90deg, transparent, #00d4ff); }

    .stat-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
    }

    .published-icon {
      background: rgba(0, 230, 118, 0.1);
      color: #00e676;
    }

    .draft-icon {
      background: rgba(255, 167, 38, 0.1);
      color: #ffa726;
    }

    .review-icon {
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
    }

    .stat-icon-wrap mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .stat-label {
      font-size: 0.78rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }

    /* ---------- BULLETIN CARD ---------- */
    .bulletin-card {
      display: flex;
      margin-bottom: 16px;
      border-radius: 12px;
      background: var(--bg-card-glass);
      border: 1px solid var(--border-default);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      overflow: hidden;
      transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
      animation: card-fade-in 0.45s ease-out both;
    }

    .bulletin-card:hover {
      border-color: rgba(102, 126, 234, 0.25);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(102, 126, 234, 0.1);
      transform: translateY(-2px);
    }

    @keyframes card-fade-in {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Severity left strip */
    .severity-strip {
      width: 4px;
      flex-shrink: 0;
    }

    .sev-critical { background: linear-gradient(180deg, #ff1744, #d50000); box-shadow: inset 2px 0 8px rgba(255, 23, 68, 0.4); }
    .sev-high     { background: linear-gradient(180deg, #ff5252, #ff1744); }
    .sev-elevated { background: linear-gradient(180deg, #ffa726, #ff9100); }
    .sev-moderate { background: linear-gradient(180deg, #ffee58, #ffc107); }
    .sev-low      { background: linear-gradient(180deg, #00e676, #00c853); }

    .card-body {
      flex: 1;
      padding: 22px 28px;
    }

    /* Card top row */
    .card-top-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-draft {
      color: #ffa726;
      background: rgba(255, 167, 38, 0.1);
      border: 1px solid rgba(255, 167, 38, 0.3);
    }

    .status-draft .status-dot {
      background: #ffa726;
      box-shadow: 0 0 6px rgba(255, 167, 38, 0.7);
    }

    .status-review {
      color: #00d4ff;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .status-review .status-dot {
      background: #00d4ff;
      box-shadow: 0 0 6px rgba(0, 212, 255, 0.7);
    }

    .status-published {
      color: #00e676;
      background: rgba(0, 230, 118, 0.1);
      border: 1px solid rgba(0, 230, 118, 0.3);
    }

    .status-published .status-dot {
      background: #00e676;
      box-shadow: 0 0 6px rgba(0, 230, 118, 0.7);
    }

    /* Title */
    .card-title {
      margin: 0 0 10px;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
    }

    /* Meta row */
    .card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 14px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.76rem;
      color: var(--text-tertiary);
    }

    .meta-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: var(--text-secondary);
    }

    .meta-text {
      color: var(--text-secondary);
    }

    .meta-sep {
      margin: 0 4px;
      color: var(--text-primary);
    }

    /* Content preview */
    .card-content {
      margin: 0 0 14px;
      font-size: 0.88rem;
      line-height: 1.6;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Category chip */
    .category-row {
      margin-bottom: 16px;
    }

    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 14px;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 500;
      color: #667eea;
      background: rgba(102, 126, 234, 0.08);
      border: 1px solid rgba(102, 126, 234, 0.2);
      letter-spacing: 0.5px;
    }

    .chip-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    /* Actions */
    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      border: 1px solid;
      background: transparent;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .action-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .action-edit {
      color: #667eea;
      border-color: rgba(102, 126, 234, 0.3);
    }

    .action-edit:hover {
      background: rgba(102, 126, 234, 0.1);
      border-color: #667eea;
      box-shadow: 0 0 16px rgba(102, 126, 234, 0.25);
    }

    .action-submit {
      color: #00d4ff;
      border-color: rgba(0, 212, 255, 0.3);
    }

    .action-submit:hover {
      background: rgba(0, 212, 255, 0.1);
      border-color: #00d4ff;
      box-shadow: 0 0 16px rgba(0, 212, 255, 0.25);
    }

    .action-publish {
      color: #00e676;
      border-color: rgba(0, 230, 118, 0.3);
    }

    .action-publish:hover {
      background: rgba(0, 230, 118, 0.1);
      border-color: #00e676;
      box-shadow: 0 0 16px rgba(0, 230, 118, 0.25);
    }

    .action-delete {
      color: #ff1744;
      border-color: rgba(255, 23, 68, 0.3);
    }

    .action-delete:hover {
      background: rgba(255, 23, 68, 0.1);
      border-color: #ff1744;
      box-shadow: 0 0 16px rgba(255, 23, 68, 0.25);
    }

    /* ---------- EMPTY STATE ---------- */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 40px;
      text-align: center;
    }

    .empty-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--bg-card-glass);
      border: 1px solid var(--border-default);
      margin-bottom: 28px;
      overflow: hidden;
    }

    .empty-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: var(--text-primary);
    }

    .empty-scan-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #667eea, transparent);
      animation: scan-down 2.5s ease-in-out infinite;
    }

    @keyframes scan-down {
      0%   { top: 0; opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }

    .empty-title {
      margin: 0 0 10px;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text-tertiary);
      letter-spacing: 0.5px;
    }

    .empty-subtitle {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-tertiary);
      line-height: 1.7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    /* ---------- RESPONSIVE ---------- */
    @media (max-width: 900px) {
      :host {
        padding: 20px 16px;
      }

      .intel-header {
        flex-direction: column;
        gap: 16px;
      }

      .stats-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BulletinListComponent implements OnInit {
  bulletins: BulletinDto[] = [];

  constructor(public auth: AuthService, private bulletinService: BulletinService) {}

  ngOnInit() {
    this.load();
  }

  get publishedCount(): number {
    return this.bulletins.filter(b => b.status === 'published').length;
  }

  get draftCount(): number {
    return this.bulletins.filter(b => b.status === 'draft').length;
  }

  get reviewCount(): number {
    return this.bulletins.filter(b => b.status === 'review').length;
  }

  load() {
    this.bulletinService.list().subscribe(data => this.bulletins = data);
  }

  submitForReview(b: BulletinDto) {
    this.bulletinService.submitForReview(b.id).subscribe(() => this.load());
  }

  publish(b: BulletinDto) {
    this.bulletinService.publish(b.id).subscribe(() => this.load());
  }

  delete(b: BulletinDto) {
    if (confirm(`Delete bulletin "${b.title}"?`)) {
      this.bulletinService.delete(b.id).subscribe(() => this.load());
    }
  }
}
