import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { NewsService } from '../../core/services/news.service';
import { NewsSearchRequest, NewsSearchResult, FacetBucket } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';
import { BookmarkButtonComponent } from '../../shared/components/bookmark-button.component';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatChipsModule,
    MatPaginatorModule, MatIconModule, ThreatBadgeComponent, BookmarkButtonComponent
  ],
  template: `
    <!-- ===== HERO HEADER ===== -->
    <div class="intel-hero">
      <div class="hero-bg-grid"></div>
      <div class="hero-content">
        <div class="hero-title-row">
          <div class="hero-icon">
            <mat-icon class="radar-icon">radar</mat-icon>
          </div>
          <div>
            <h1 class="hero-title">OSINT News Intelligence</h1>
            <p class="hero-subtitle">Real-time open-source intelligence monitoring across Africa</p>
          </div>
        </div>
        <div class="hero-badges">
          <span class="live-indicator">
            <span class="live-dot"></span>
            LIVE
          </span>
          <span class="stat-badge">
            <mat-icon class="stat-icon">article</mat-icon>
            <span class="stat-value">{{ result?.total ?? 0 }}</span>
            <span class="stat-label">Total Results</span>
          </span>
          <span class="stat-badge">
            <mat-icon class="stat-icon">today</mat-icon>
            <span class="stat-value">{{ todayCount }}</span>
            <span class="stat-label">Today's Articles</span>
          </span>
          <span class="stat-badge stat-badge--danger">
            <mat-icon class="stat-icon">warning</mat-icon>
            <span class="stat-value">{{ highThreatCount }}</span>
            <span class="stat-label">High Threat</span>
          </span>
        </div>
      </div>
    </div>

    <!-- ===== FILTER BAR ===== -->
    <div class="filter-bar">
      <div class="filter-bar-inner">
        <div class="filter-field">
          <label class="filter-label">Search Query</label>
          <div class="input-wrapper">
            <mat-icon class="input-icon">search</mat-icon>
            <input
              class="cyber-input"
              placeholder="Enter keywords, entities, topics..."
              [(ngModel)]="request.query"
              (keyup.enter)="search()"
            />
          </div>
        </div>

        <div class="filter-field">
          <label class="filter-label">Category</label>
          <select class="cyber-select" [(ngModel)]="request.category">
            <option value="">All Categories</option>
            @for (c of facets['categories'] ?? []; track c.key) {
              <option [value]="c.key">{{ c.key }} ({{ c.count }})</option>
            }
          </select>
        </div>

        <div class="filter-field">
          <label class="filter-label">Min Threat Level</label>
          <select class="cyber-select" [(ngModel)]="request.minThreatLevel">
            <option [ngValue]="undefined">Any Level</option>
            @for (l of [0,1,2,3,4,5]; track l) {
              <option [ngValue]="l">Level {{ l }}</option>
            }
          </select>
        </div>

        <button class="cyber-btn" (click)="search()">
          <mat-icon>search</mat-icon>
          <span>Search</span>
          <span class="btn-glow"></span>
        </button>
      </div>
    </div>

    <!-- ===== ARTICLE CARDS ===== -->
    <div class="articles-grid">
      @for (article of result?.items ?? []; track article.id; let i = $index) {
        <div
          class="article-card"
          [class.threat-border-green]="article.threatLevel <= 1"
          [class.threat-border-yellow]="article.threatLevel === 2"
          [class.threat-border-orange]="article.threatLevel === 3"
          [class.threat-border-red]="article.threatLevel >= 4"
          [routerLink]="['/news', article.id]"
          [style.animation-delay]="(i * 60) + 'ms'"
        >
          <div class="card-header-row">
            <div class="source-info">
              <span
                class="source-dot"
                [class.dot-green]="article.threatLevel <= 1"
                [class.dot-yellow]="article.threatLevel === 2"
                [class.dot-orange]="article.threatLevel === 3"
                [class.dot-red]="article.threatLevel >= 4"
              ></span>
              <span class="source-name">{{ article.sourceName }}</span>
            </div>
            <div class="card-actions-row">
              <span class="article-date">{{ article.publishedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              <app-bookmark-button [articleId]="article.id" />
            </div>
          </div>

          <h3 class="article-title">{{ article.title }}</h3>

          <p class="article-summary">{{ article.summary }}</p>

          <div class="card-footer">
            <div class="tags-row">
              <app-threat-badge [level]="article.threatLevel" />
              @for (tag of article.countryTags; track tag) {
                <span class="cyber-chip">
                  <mat-icon class="chip-icon">public</mat-icon>
                  {{ tag }}
                </span>
              }
              @for (cat of article.categories; track cat) {
                <span class="cyber-chip cyber-chip--accent">
                  <mat-icon class="chip-icon">label</mat-icon>
                  {{ cat }}
                </span>
              }
            </div>
          </div>
        </div>
      }
    </div>

    <!-- ===== EMPTY STATE ===== -->
    @if ((result?.items ?? []).length === 0 && result !== null) {
      <div class="empty-state">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <h3>No intelligence articles found</h3>
        <p>Adjust your search filters or broaden your query</p>
      </div>
    }

    <!-- ===== PAGINATION ===== -->
    <div class="pagination-wrapper">
      <mat-paginator
        [length]="result?.total ?? 0"
        [pageSize]="request.pageSize ?? 20"
        [pageIndex]="(request.page ?? 1) - 1"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPage($event)">
      </mat-paginator>
    </div>
  `,
  styles: [`
    /* ========================================
       OSINT CYBER DARK THEME
       ======================================== */

    :host {
      display: block;
      background: var(--bg-page);
      min-height: 100vh;
      padding: 0 0 48px 0;
      color: var(--text-primary);
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }

    /* ---- KEYFRAMES ---- */

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    @keyframes radarSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 4px rgba(102, 126, 234, 0.3); }
      50% { box-shadow: 0 0 16px rgba(102, 126, 234, 0.6); }
    }

    @keyframes scanLine {
      0% { top: 0; }
      100% { top: 100%; }
    }

    @keyframes borderGlow {
      0%, 100% { border-color: rgba(0, 212, 255, 0.15); }
      50% { border-color: rgba(0, 212, 255, 0.35); }
    }

    /* ---- HERO HEADER ---- */

    .intel-hero {
      position: relative;
      background: var(--bg-header-gradient);
      border-bottom: 1px solid rgba(102, 126, 234, 0.15);
      padding: 40px 32px 32px;
      overflow: hidden;
    }

    .hero-bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(102, 126, 234, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(102, 126, 234, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    .hero-bg-grid::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.12), transparent);
      animation: scanLine 6s linear infinite;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
    }

    .hero-title-row {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 28px;
    }

    .hero-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(0, 212, 255, 0.08));
      border: 1px solid rgba(102, 126, 234, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: glowPulse 3s ease-in-out infinite;
    }

    .radar-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #667eea;
      animation: radarSpin 4s linear infinite;
    }

    .hero-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #ffffff 0%, #00d4ff 50%, #667eea 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }

    .hero-subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--text-tertiary);
      letter-spacing: 0.3px;
    }

    .hero-badges {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* ---- LIVE INDICATOR ---- */

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 20px;
      background: rgba(0, 230, 118, 0.08);
      border: 1px solid rgba(0, 230, 118, 0.25);
      color: #00e676;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00e676;
      animation: pulse 1.5s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
    }

    /* ---- STAT BADGES ---- */

    .stat-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--border-default);
    }

    .stat-badge--danger {
      background: rgba(255, 23, 68, 0.06);
      border-color: rgba(255, 23, 68, 0.2);
    }

    .stat-badge--danger .stat-icon {
      color: #ff1744;
    }

    .stat-badge--danger .stat-value {
      color: #ff1744;
    }

    .stat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #667eea;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-heading);
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ---- FILTER BAR ---- */

    .filter-bar {
      background: var(--bg-card-glass);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border-default);
      padding: 20px 32px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .filter-bar-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 180px;
    }

    .filter-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-tertiary);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-tertiary);
      pointer-events: none;
      z-index: 1;
    }

    .cyber-input {
      width: 100%;
      padding: 10px 14px 10px 40px;
      background: var(--bg-input);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 14px;
      outline: none;
      transition: all 0.25s ease;
      font-family: inherit;
    }

    .cyber-input::placeholder {
      color: var(--text-tertiary);
    }

    .cyber-input:focus {
      border-color: #00d4ff;
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1), 0 0 20px rgba(0, 212, 255, 0.05);
    }

    .cyber-select {
      padding: 10px 14px;
      background: var(--bg-input);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 14px;
      outline: none;
      transition: all 0.25s ease;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235a6b80'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
      font-family: inherit;
    }

    .cyber-select:focus {
      border-color: #00d4ff;
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1), 0 0 20px rgba(0, 212, 255, 0.05);
    }

    .cyber-select option {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .cyber-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 28px;
      background: linear-gradient(135deg, #667eea, #5a67d8);
      border: 1px solid rgba(102, 126, 234, 0.4);
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      font-family: inherit;
      letter-spacing: 0.3px;
    }

    .cyber-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .cyber-btn:hover {
      background: linear-gradient(135deg, #7c8ff0, #667eea);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
      transform: translateY(-1px);
    }

    .cyber-btn:active {
      transform: translateY(0);
    }

    .btn-glow {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      transform: translateX(-100%);
      transition: transform 0.6s;
    }

    .cyber-btn:hover .btn-glow {
      transform: translateX(100%);
    }

    /* ---- ARTICLES GRID ---- */

    .articles-grid {
      max-width: 1200px;
      margin: 24px auto 0;
      padding: 0 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ---- ARTICLE CARD ---- */

    .article-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      padding: 24px 24px 20px 28px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border-left-width: 4px;
      border-left-style: solid;
      animation: fadeInUp 0.5s ease both;
    }

    .article-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.02), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .article-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .article-card:hover::before {
      opacity: 1;
    }

    /* Threat level left border colors */

    .threat-border-green {
      border-left-color: #00e676;
    }

    .threat-border-green:hover {
      box-shadow: 0 8px 32px rgba(0, 230, 118, 0.08), 0 0 0 1px rgba(0, 230, 118, 0.1);
    }

    .threat-border-yellow {
      border-left-color: #ffea00;
    }

    .threat-border-yellow:hover {
      box-shadow: 0 8px 32px rgba(255, 234, 0, 0.08), 0 0 0 1px rgba(255, 234, 0, 0.1);
    }

    .threat-border-orange {
      border-left-color: #ff9100;
    }

    .threat-border-orange:hover {
      box-shadow: 0 8px 32px rgba(255, 145, 0, 0.08), 0 0 0 1px rgba(255, 145, 0, 0.1);
    }

    .threat-border-red {
      border-left-color: #ff1744;
    }

    .threat-border-red:hover {
      box-shadow: 0 8px 32px rgba(255, 23, 68, 0.1), 0 0 0 1px rgba(255, 23, 68, 0.15);
    }

    /* ---- CARD HEADER ROW ---- */

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .source-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-green {
      background: #00e676;
      box-shadow: 0 0 6px rgba(0, 230, 118, 0.5);
    }

    .dot-yellow {
      background: #ffea00;
      box-shadow: 0 0 6px rgba(255, 234, 0, 0.5);
    }

    .dot-orange {
      background: #ff9100;
      box-shadow: 0 0 6px rgba(255, 145, 0, 0.5);
    }

    .dot-red {
      background: #ff1744;
      box-shadow: 0 0 6px rgba(255, 23, 68, 0.5);
    }

    .source-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .card-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .article-date {
      font-size: 12px;
      color: var(--text-tertiary);
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      letter-spacing: 0.5px;
    }

    /* ---- ARTICLE CONTENT ---- */

    .article-title {
      margin: 0 0 10px;
      font-size: 17px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.45;
      transition: color 0.2s ease;
    }

    .article-card:hover .article-title {
      color: #00d4ff;
    }

    .article-summary {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ---- CARD FOOTER / TAGS ---- */

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tags-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .cyber-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.3px;
      transition: all 0.2s ease;
    }

    .cyber-chip:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .cyber-chip--accent {
      background: rgba(102, 126, 234, 0.08);
      border-color: rgba(102, 126, 234, 0.2);
      color: #667eea;
    }

    .cyber-chip--accent:hover {
      background: rgba(102, 126, 234, 0.14);
    }

    .chip-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    /* ---- EMPTY STATE ---- */

    .empty-state {
      text-align: center;
      padding: 80px 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .empty-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: var(--text-primary);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: var(--text-tertiary);
      font-weight: 600;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      color: var(--text-tertiary);
    }

    /* ---- PAGINATION ---- */

    .pagination-wrapper {
      max-width: 1200px;
      margin: 32px auto 0;
      padding: 0 32px;
    }

    ::ng-deep .pagination-wrapper .mat-mdc-paginator {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-default);
      border-radius: 12px;
      color: var(--text-secondary) !important;
    }

    ::ng-deep .pagination-wrapper .mat-mdc-paginator-container {
      color: var(--text-secondary);
    }

    ::ng-deep .pagination-wrapper .mat-mdc-select-value,
    ::ng-deep .pagination-wrapper .mat-mdc-paginator-page-size-label,
    ::ng-deep .pagination-wrapper .mat-mdc-paginator-range-label {
      color: var(--text-secondary) !important;
    }

    ::ng-deep .pagination-wrapper .mat-mdc-icon-button {
      color: #667eea !important;
    }

    ::ng-deep .pagination-wrapper .mat-mdc-icon-button:disabled {
      color: var(--text-primary) !important;
    }

    ::ng-deep .pagination-wrapper .mat-mdc-select-arrow {
      color: var(--text-tertiary) !important;
    }

    /* ---- BOOKMARK BUTTON OVERRIDE ---- */

    ::ng-deep .article-card app-bookmark-button .mat-mdc-icon-button {
      color: var(--text-tertiary);
    }

    ::ng-deep .article-card app-bookmark-button .mat-mdc-icon-button:hover {
      color: #00d4ff;
    }

    /* ---- THREAT BADGE OVERRIDE ---- */

    ::ng-deep .article-card .threat-badge {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      border-radius: 6px;
      padding: 3px 10px;
    }

    ::ng-deep .article-card .threat-critical {
      background: rgba(255, 23, 68, 0.12);
      color: #ff1744;
      border: 1px solid rgba(255, 23, 68, 0.25);
    }

    ::ng-deep .article-card .threat-high {
      background: rgba(255, 23, 68, 0.1);
      color: #ff5252;
      border: 1px solid rgba(255, 82, 82, 0.2);
    }

    ::ng-deep .article-card .threat-elevated {
      background: rgba(255, 145, 0, 0.1);
      color: #ff9100;
      border: 1px solid rgba(255, 145, 0, 0.2);
    }

    ::ng-deep .article-card .threat-moderate {
      background: rgba(255, 234, 0, 0.08);
      color: #ffd600;
      border: 1px solid rgba(255, 214, 0, 0.2);
    }

    ::ng-deep .article-card .threat-low {
      background: rgba(0, 230, 118, 0.08);
      color: #00e676;
      border: 1px solid rgba(0, 230, 118, 0.2);
    }

    ::ng-deep .article-card .threat-none {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-tertiary);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* ---- RESPONSIVE ---- */

    @media (max-width: 768px) {
      .intel-hero {
        padding: 24px 16px 20px;
      }

      .hero-title {
        font-size: 22px;
      }

      .hero-badges {
        gap: 10px;
      }

      .stat-badge {
        padding: 6px 12px;
      }

      .stat-label {
        display: none;
      }

      .filter-bar {
        padding: 16px;
      }

      .filter-bar-inner {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-field {
        min-width: 100%;
      }

      .cyber-btn {
        width: 100%;
        justify-content: center;
      }

      .articles-grid {
        padding: 0 16px;
      }

      .article-card {
        padding: 16px 16px 14px 20px;
      }

      .card-header-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .pagination-wrapper {
        padding: 0 16px;
      }
    }
  `]
})
export class NewsListComponent implements OnInit {
  request: NewsSearchRequest = { page: 1, pageSize: 20 };
  result: NewsSearchResult | null = null;
  facets: { [key: string]: FacetBucket[] } = {};

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.search();
  }

  search() {
    this.request.page = 1;
    this.loadResults();
  }

  onPage(event: PageEvent) {
    this.request.page = event.pageIndex + 1;
    this.request.pageSize = event.pageSize;
    this.loadResults();
  }

  private loadResults() {
    this.newsService.search(this.request).subscribe(data => {
      this.result = data;
      this.facets = data.facets;
    });
  }

  /** Count articles published today */
  get todayCount(): number {
    if (!this.result?.items) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.result.items.filter(a => {
      const d = new Date(a.publishedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
  }

  /** Count articles with threat level >= 4 */
  get highThreatCount(): number {
    if (!this.result?.items) return 0;
    return this.result.items.filter(a => a.threatLevel >= 4).length;
  }
}
