import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ExperienceService } from '@core/services/experience.service';
import { AuthService } from '@core/services/auth.service';
import { LeaderboardEntryDto } from '@core/models';
import { LevelBadgeComponent } from '@shared/components/level-badge.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    FormsModule,
    TranslateModule,
    LevelBadgeComponent
  ],
  template: `
    <div class="lb-container">
      <!-- ===== HEADER ===== -->
      <div class="lb-header">
        <div class="lb-header-left">
          <div class="lb-trophy-icon">
            <mat-icon>emoji_events</mat-icon>
          </div>
          <div class="lb-title-block">
            <h1 class="lb-title">OSINT Analyst Leaderboard</h1>
            <span class="lb-subtitle">Real-time intelligence community rankings</span>
          </div>
          <span class="lb-live-badge">
            <span class="lb-live-dot"></span>
            LIVE RANKINGS
          </span>
        </div>

        <!-- Filter Row -->
        <div class="lb-filters">
          <div class="lb-toggle-group">
            <button class="lb-toggle-btn" [class.active]="filterType === 'global'"
                    (click)="filterType = 'global'; loadLeaderboard()">
              <mat-icon>public</mat-icon> Global
            </button>
            <button class="lb-toggle-btn" [class.active]="filterType === 'country'"
                    (click)="filterType = 'country'; loadLeaderboard()">
              <mat-icon>flag</mat-icon> My Country
            </button>
          </div>
          <button class="lb-refresh-btn" (click)="loadLeaderboard()">
            <mat-icon>refresh</mat-icon>
            {{ 'common.refresh' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="lb-loading">
          <div class="lb-loading-spinner"></div>
          <span>{{ 'common.loading' | translate }}</span>
        </div>
      } @else {
        <!-- ===== TOP 3 PODIUM ===== -->
        @if (leaderboard().length >= 3) {
          <div class="lb-podium">
            <!-- 2nd Place -->
            <div class="lb-podium-card silver" (mouseenter)="0" (mouseleave)="0">
              <div class="lb-rank-circle silver-circle">
                <span>2</span>
              </div>
              <div class="lb-podium-avatar silver-ring">
                <span class="lb-avatar-letter">{{ leaderboard()[1].fullName.charAt(0) }}</span>
              </div>
              <h3 class="lb-podium-name">{{ leaderboard()[1].fullName }}</h3>
              <p class="lb-podium-username">{{'@'}}{{ leaderboard()[1].username }}</p>
              <p class="lb-podium-country">{{ getCountryFlag(leaderboard()[1].countryCode) }} {{ leaderboard()[1].countryCode }}</p>
              <div class="lb-podium-xp">
                <span class="lb-xp-value">{{ leaderboard()[1].totalXp | number }}</span>
                <span class="lb-xp-label">XP</span>
              </div>
              <app-level-badge
                [level]="leaderboard()[1].level"
                [levelName]="getLevelName(leaderboard()[1].level)"
                [totalXp]="leaderboard()[1].totalXp"
                [showXp]="true"
                size="medium"
              />
            </div>

            <!-- 1st Place -->
            <div class="lb-podium-card gold" (mouseenter)="0" (mouseleave)="0">
              <div class="lb-crown-icon">
                <mat-icon>workspace_premium</mat-icon>
              </div>
              <div class="lb-rank-circle gold-circle">
                <span>1</span>
              </div>
              <div class="lb-podium-avatar gold-ring">
                <span class="lb-avatar-letter">{{ leaderboard()[0].fullName.charAt(0) }}</span>
              </div>
              <h3 class="lb-podium-name">{{ leaderboard()[0].fullName }}</h3>
              <p class="lb-podium-username">{{'@'}}{{ leaderboard()[0].username }}</p>
              <p class="lb-podium-country">{{ getCountryFlag(leaderboard()[0].countryCode) }} {{ leaderboard()[0].countryCode }}</p>
              <div class="lb-podium-xp">
                <span class="lb-xp-value gold-xp">{{ leaderboard()[0].totalXp | number }}</span>
                <span class="lb-xp-label">XP</span>
              </div>
              <app-level-badge
                [level]="leaderboard()[0].level"
                [levelName]="getLevelName(leaderboard()[0].level)"
                [totalXp]="leaderboard()[0].totalXp"
                [showXp]="true"
                size="medium"
              />
            </div>

            <!-- 3rd Place -->
            <div class="lb-podium-card bronze" (mouseenter)="0" (mouseleave)="0">
              <div class="lb-rank-circle bronze-circle">
                <span>3</span>
              </div>
              <div class="lb-podium-avatar bronze-ring">
                <span class="lb-avatar-letter">{{ leaderboard()[2].fullName.charAt(0) }}</span>
              </div>
              <h3 class="lb-podium-name">{{ leaderboard()[2].fullName }}</h3>
              <p class="lb-podium-username">{{'@'}}{{ leaderboard()[2].username }}</p>
              <p class="lb-podium-country">{{ getCountryFlag(leaderboard()[2].countryCode) }} {{ leaderboard()[2].countryCode }}</p>
              <div class="lb-podium-xp">
                <span class="lb-xp-value">{{ leaderboard()[2].totalXp | number }}</span>
                <span class="lb-xp-label">XP</span>
              </div>
              <app-level-badge
                [level]="leaderboard()[2].level"
                [levelName]="getLevelName(leaderboard()[2].level)"
                [totalXp]="leaderboard()[2].totalXp"
                [showXp]="true"
                size="medium"
              />
            </div>
          </div>
        }

        <!-- ===== REMAINING ENTRIES TABLE ===== -->
        @if (remainingEntries().length > 0) {
          <div class="lb-table-wrapper">
            <table class="lb-table">
              <thead>
                <tr>
                  <th class="lb-th-rank">#</th>
                  <th class="lb-th-user">{{ 'common.user' | translate }}</th>
                  <th class="lb-th-country">{{ 'users.country' | translate }}</th>
                  <th class="lb-th-level">{{ 'leaderboard.level' | translate }}</th>
                  <th class="lb-th-xp">{{ 'leaderboard.totalXp' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of remainingEntries(); track entry.userId; let i = $index) {
                  <tr class="lb-row" [class.lb-current-user]="entry.userId === currentUserId()"
                      [class.lb-row-even]="i % 2 === 0" [class.lb-row-odd]="i % 2 !== 0">
                    <td class="lb-cell-rank">
                      <span class="lb-rank-num" [class.lb-rank-top10]="i + 4 <= 10">{{ i + 4 }}</span>
                    </td>
                    <td class="lb-cell-user">
                      <div class="lb-user-cell">
                        <div class="lb-mini-avatar">
                          <span>{{ entry.fullName.charAt(0) }}</span>
                        </div>
                        <div class="lb-user-info">
                          <strong class="lb-user-name">{{ entry.fullName }}</strong>
                          <span class="lb-user-handle">{{'@'}}{{ entry.username }}</span>
                        </div>
                        @if (entry.userId === currentUserId()) {
                          <span class="lb-you-badge">YOU</span>
                        }
                      </div>
                    </td>
                    <td class="lb-cell-country">
                      <span class="lb-country-tag">{{ getCountryFlag(entry.countryCode) }} {{ entry.countryCode }}</span>
                    </td>
                    <td class="lb-cell-level">
                      <app-level-badge
                        [level]="entry.level"
                        [levelName]="getLevelName(entry.level)"
                        size="small"
                      />
                    </td>
                    <td class="lb-cell-xp">
                      <span class="lb-xp-table-value">{{ entry.totalXp | number }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (leaderboard().length === 0) {
          <div class="lb-empty">
            <mat-icon>leaderboard</mat-icon>
            <p>{{ 'leaderboard.noEntries' | translate }}</p>
          </div>
        }

        <!-- ===== STATS BAR ===== -->
        @if (leaderboard().length > 0) {
          <div class="lb-stats-bar">
            <div class="lb-stat-card">
              <mat-icon>groups</mat-icon>
              <div class="lb-stat-info">
                <span class="lb-stat-value">{{ leaderboard().length }}</span>
                <span class="lb-stat-label">Total Analysts</span>
              </div>
            </div>
            <div class="lb-stat-card">
              <mat-icon>speed</mat-icon>
              <div class="lb-stat-info">
                <span class="lb-stat-value">{{ getAvgXp() | number:'1.0-0' }}</span>
                <span class="lb-stat-label">Avg XP</span>
              </div>
            </div>
            <div class="lb-stat-card">
              <mat-icon>flag</mat-icon>
              <div class="lb-stat-info">
                <span class="lb-stat-value">{{ getTopCountry() }}</span>
                <span class="lb-stat-label">Top Country</span>
              </div>
            </div>
            <div class="lb-stat-card">
              <mat-icon>bar_chart</mat-icon>
              <div class="lb-stat-info">
                <span class="lb-stat-value">Lv. {{ getMostCommonLevel() }}</span>
                <span class="lb-stat-label">Most Common Level</span>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    /* ===================== */
    /*  BASE / CONTAINER     */
    /* ===================== */
    :host {
      display: block;
      background: var(--bg-page);
      min-height: 100vh;
    }

    .lb-container {
      padding: 32px 24px;
      max-width: 1200px;
      margin: 0 auto;
      background: var(--bg-page);
      color: var(--text-primary);
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }

    /* ===================== */
    /*  HEADER               */
    /* ===================== */
    .lb-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(102, 126, 234, 0.15);
    }

    .lb-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .lb-trophy-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
    }

    .lb-trophy-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #FFD700;
    }

    .lb-title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .lb-title {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, var(--text-heading) 0%, var(--text-secondary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .lb-subtitle {
      font-size: 13px;
      color: #667eea;
      letter-spacing: 0.3px;
      opacity: 0.8;
    }

    .lb-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(0, 230, 118, 0.08);
      border: 1px solid rgba(0, 230, 118, 0.25);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #00e676;
      text-transform: uppercase;
    }

    .lb-live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px #00e676;
      animation: lb-pulse 1.5s ease-in-out infinite;
    }

    @keyframes lb-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px #00e676; }
      50% { opacity: 0.4; box-shadow: 0 0 2px #00e676; }
    }

    /* ===================== */
    /*  FILTERS              */
    /* ===================== */
    .lb-filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .lb-toggle-group {
      display: flex;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .lb-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border: none;
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .lb-toggle-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .lb-toggle-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
    }

    .lb-toggle-btn:hover:not(.active) {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
    }

    .lb-refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 10px;
      border: 1px solid rgba(0, 212, 255, 0.2);
      background: rgba(0, 212, 255, 0.06);
      color: #00d4ff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .lb-refresh-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .lb-refresh-btn:hover {
      background: rgba(0, 212, 255, 0.12);
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 2px 12px rgba(0, 212, 255, 0.15);
    }

    /* ===================== */
    /*  LOADING              */
    /* ===================== */
    .lb-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      gap: 16px;
      color: #667eea;
      font-size: 14px;
    }

    .lb-loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(102, 126, 234, 0.15);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: lb-spin 0.8s linear infinite;
    }

    @keyframes lb-spin {
      to { transform: rotate(360deg); }
    }

    /* ===================== */
    /*  PODIUM               */
    /* ===================== */
    .lb-podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 20px;
      margin-bottom: 40px;
      padding: 40px 16px 24px;
    }

    .lb-podium-card {
      position: relative;
      background: var(--bg-card-glass);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-default);
      border-radius: 20px;
      padding: 50px 24px 24px;
      text-align: center;
      transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s ease;
      width: 260px;
    }

    .lb-podium-card:hover {
      transform: translateY(-10px);
    }

    /* --- GOLD (1st) --- */
    .lb-podium-card.gold {
      width: 300px;
      order: 2;
      border-color: rgba(255, 215, 0, 0.3);
      box-shadow:
        0 0 30px rgba(255, 215, 0, 0.08),
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 215, 0, 0.1);
      animation: lb-gold-glow 3s ease-in-out infinite;
      margin-bottom: 20px;
    }

    @keyframes lb-gold-glow {
      0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.08), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 215, 0, 0.1); }
      50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.18), 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 215, 0, 0.2); }
    }

    .lb-podium-card.gold:hover {
      box-shadow: 0 0 60px rgba(255, 215, 0, 0.2), 0 12px 48px rgba(0, 0, 0, 0.5);
    }

    .lb-crown-icon {
      position: absolute;
      top: -22px;
      left: 50%;
      transform: translateX(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FFD700, #FFA500);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
      z-index: 3;
    }

    .lb-crown-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: var(--bg-page);
    }

    /* --- SILVER (2nd) --- */
    .lb-podium-card.silver {
      order: 1;
      border-color: rgba(192, 192, 192, 0.2);
      box-shadow:
        0 0 20px rgba(192, 192, 192, 0.06),
        0 8px 28px rgba(0, 0, 0, 0.35),
        inset 0 1px 0 rgba(192, 192, 192, 0.08);
    }

    .lb-podium-card.silver:hover {
      box-shadow: 0 0 40px rgba(192, 192, 192, 0.12), 0 12px 40px rgba(0, 0, 0, 0.45);
    }

    /* --- BRONZE (3rd) --- */
    .lb-podium-card.bronze {
      order: 3;
      border-color: rgba(205, 127, 50, 0.2);
      box-shadow:
        0 0 20px rgba(205, 127, 50, 0.06),
        0 8px 28px rgba(0, 0, 0, 0.35),
        inset 0 1px 0 rgba(205, 127, 50, 0.08);
    }

    .lb-podium-card.bronze:hover {
      box-shadow: 0 0 40px rgba(205, 127, 50, 0.12), 0 12px 40px rgba(0, 0, 0, 0.45);
    }

    /* Rank circles */
    .lb-rank-circle {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
      color: var(--bg-page);
      z-index: 2;
    }

    .lb-podium-card.gold .lb-rank-circle {
      top: 26px;
    }

    .gold-circle {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      box-shadow: 0 0 18px rgba(255, 215, 0, 0.5);
      animation: lb-rank-glow-gold 2s ease-in-out infinite;
    }

    @keyframes lb-rank-glow-gold {
      0%, 100% { box-shadow: 0 0 18px rgba(255, 215, 0, 0.5); }
      50% { box-shadow: 0 0 28px rgba(255, 215, 0, 0.7); }
    }

    .silver-circle {
      background: linear-gradient(135deg, #e8e8e8, #C0C0C0);
      box-shadow: 0 0 14px rgba(192, 192, 192, 0.4);
    }

    .bronze-circle {
      background: linear-gradient(135deg, #e0a060, #CD7F32);
      box-shadow: 0 0 14px rgba(205, 127, 50, 0.4);
    }

    /* Podium avatar */
    .lb-podium-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      margin: 12px auto 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-surface);
      border: 3px solid;
    }

    .lb-podium-card.gold .lb-podium-avatar {
      width: 84px;
      height: 84px;
      margin-top: 20px;
    }

    .gold-ring { border-color: #FFD700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.2); }
    .silver-ring { border-color: #C0C0C0; box-shadow: 0 0 14px rgba(192, 192, 192, 0.15); }
    .bronze-ring { border-color: #CD7F32; box-shadow: 0 0 14px rgba(205, 127, 50, 0.15); }

    .lb-avatar-letter {
      font-size: 28px;
      font-weight: 800;
      color: #667eea;
      text-transform: uppercase;
    }

    .lb-podium-card.gold .lb-avatar-letter {
      font-size: 34px;
      color: #FFD700;
    }

    /* Podium text */
    .lb-podium-name {
      margin: 0 0 2px;
      font-size: 17px;
      font-weight: 700;
      color: var(--text-heading);
    }

    .lb-podium-card.gold .lb-podium-name {
      font-size: 20px;
    }

    .lb-podium-username {
      margin: 0 0 6px;
      font-size: 13px;
      color: #00d4ff;
      font-weight: 500;
    }

    .lb-podium-country {
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .lb-podium-xp {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
      margin-bottom: 14px;
    }

    .lb-xp-value {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 22px;
      font-weight: 800;
      color: #00d4ff;
    }

    .lb-podium-card.gold .lb-xp-value {
      font-size: 26px;
    }

    .gold-xp {
      background: linear-gradient(135deg, #FFD700, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .lb-xp-label {
      font-size: 11px;
      color: #667eea;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ===================== */
    /*  TABLE                */
    /* ===================== */
    .lb-table-wrapper {
      background: var(--bg-card-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-default);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 32px;
    }

    .lb-table {
      width: 100%;
      border-collapse: collapse;
    }

    .lb-table thead tr {
      background: rgba(15, 19, 32, 0.9);
    }

    .lb-table th {
      padding: 14px 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #667eea;
      text-align: left;
      border-bottom: 1px solid rgba(102, 126, 234, 0.12);
    }

    .lb-th-rank { width: 60px; text-align: center; }
    .lb-th-xp { text-align: right; }

    .lb-row {
      transition: background 0.2s ease;
    }

    .lb-row-even { background: var(--bg-card); }
    .lb-row-odd  { background: var(--bg-surface); }

    .lb-row:hover {
      background: rgba(102, 126, 234, 0.06) !important;
    }

    .lb-row td {
      padding: 14px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      vertical-align: middle;
    }

    .lb-current-user {
      background: rgba(0, 212, 255, 0.04) !important;
      border-left: 3px solid #00d4ff;
      box-shadow: inset 0 0 30px rgba(0, 212, 255, 0.03);
    }

    .lb-cell-rank {
      text-align: center;
    }

    .lb-rank-num {
      font-size: 16px;
      font-weight: 800;
      color: var(--text-tertiary);
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    .lb-rank-top10 {
      color: #667eea;
      text-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
    }

    .lb-user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .lb-mini-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--bg-card);
      border: 1px solid rgba(102, 126, 234, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .lb-mini-avatar span {
      font-size: 14px;
      font-weight: 700;
      color: #667eea;
      text-transform: uppercase;
    }

    .lb-user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .lb-user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .lb-user-handle {
      font-size: 12px;
      color: #00d4ff;
      opacity: 0.7;
    }

    .lb-you-badge {
      padding: 3px 10px;
      border-radius: 12px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      color: #00d4ff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .lb-country-tag {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .lb-cell-xp {
      text-align: right;
    }

    .lb-xp-table-value {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 15px;
      font-weight: 700;
      background: linear-gradient(135deg, #00d4ff, #667eea);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ===================== */
    /*  STATS BAR            */
    /* ===================== */
    .lb-stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 8px;
    }

    .lb-stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: var(--bg-card-glass);
      border: 1px solid var(--border-default);
      border-radius: 14px;
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
    }

    .lb-stat-card:hover {
      border-color: rgba(102, 126, 234, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .lb-stat-card mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: #667eea;
      opacity: 0.7;
    }

    .lb-stat-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .lb-stat-value {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-heading);
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    .lb-stat-label {
      font-size: 11px;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ===================== */
    /*  EMPTY STATE          */
    /* ===================== */
    .lb-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      color: var(--text-tertiary);
    }

    .lb-empty mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .lb-empty p {
      font-size: 15px;
      color: var(--text-tertiary);
    }

    /* ===================== */
    /*  RESPONSIVE           */
    /* ===================== */
    @media (max-width: 900px) {
      .lb-podium {
        flex-direction: column;
        align-items: center;
        gap: 28px;
      }

      .lb-podium-card.gold,
      .lb-podium-card.silver,
      .lb-podium-card.bronze {
        width: 100%;
        max-width: 340px;
        order: initial !important;
        margin-bottom: 0;
      }

      .lb-stats-bar {
        grid-template-columns: repeat(2, 1fr);
      }

      .lb-header {
        flex-direction: column;
      }
    }

    @media (max-width: 600px) {
      .lb-container {
        padding: 16px 12px;
      }

      .lb-stats-bar {
        grid-template-columns: 1fr;
      }

      .lb-table th,
      .lb-table td {
        padding: 10px 12px;
      }

      .lb-th-country,
      .lb-cell-country {
        display: none;
      }
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  private experienceService = signal(this.experienceServiceInstance);
  private authService = signal(this.authServiceInstance);

  loading = signal(false);
  leaderboard = signal<LeaderboardEntryDto[]>([]);
  filterType: 'global' | 'country' = 'global';

  displayedColumns = ['rank', 'user', 'country', 'level', 'xp'];

  constructor(
    private experienceServiceInstance: ExperienceService,
    private authServiceInstance: AuthService
  ) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.loading.set(true);
    const countryCode = this.filterType === 'country' ? this.authService().user()?.countryCode : undefined;

    this.experienceServiceInstance.getLeaderboard(1, 50, countryCode).subscribe({
      next: (entries) => {
        if (!entries || entries.length === 0) {
          this.leaderboard.set(this.getMockData());
        } else {
          this.leaderboard.set(entries);
        }
        this.loading.set(false);
      },
      error: () => {
        this.leaderboard.set(this.getMockData());
        this.loading.set(false);
      }
    });
  }

  remainingEntries(): LeaderboardEntryDto[] {
    return this.leaderboard().slice(3);
  }

  currentUserId(): string | undefined {
    return this.authService().user()?.id;
  }

  getLevelName(level: number): string {
    if (level >= 10) return 'Elite';
    if (level >= 9) return 'Legend';
    if (level >= 8) return 'Legend';
    if (level >= 7) return 'Grandmaster';
    if (level >= 6) return 'Veteran';
    if (level >= 5) return 'Expert';
    if (level >= 4) return 'Specialist';
    if (level >= 3) return 'Professional';
    if (level >= 2) return 'Apprentice';
    return 'Novice';
  }

  getCountryFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '';
    const cc = countryCode.toUpperCase();
    const offset = 127397;
    return String.fromCodePoint(cc.charCodeAt(0) + offset, cc.charCodeAt(1) + offset);
  }

  getAvgXp(): number {
    const entries = this.leaderboard();
    if (entries.length === 0) return 0;
    const total = entries.reduce((sum, e) => sum + e.totalXp, 0);
    return total / entries.length;
  }

  getTopCountry(): string {
    const entries = this.leaderboard();
    if (entries.length === 0) return '-';
    const countMap: { [key: string]: number } = {};
    entries.forEach(e => {
      countMap[e.countryCode] = (countMap[e.countryCode] || 0) + 1;
    });
    let topCountry = '';
    let topCount = 0;
    Object.keys(countMap).forEach(c => {
      if (countMap[c] > topCount) {
        topCount = countMap[c];
        topCountry = c;
      }
    });
    return topCountry;
  }

  getMostCommonLevel(): number {
    const entries = this.leaderboard();
    if (entries.length === 0) return 1;
    const levelMap: { [key: number]: number } = {};
    entries.forEach(e => {
      levelMap[e.level] = (levelMap[e.level] || 0) + 1;
    });
    let topLevel = 1;
    let topCount = 0;
    Object.keys(levelMap).forEach(l => {
      const lvl = Number(l);
      if (levelMap[lvl] > topCount) {
        topCount = levelMap[lvl];
        topLevel = lvl;
      }
    });
    return topLevel;
  }

  private getMockData(): LeaderboardEntryDto[] {
    return [
      { userId: 'mock-01', username: 'amina.osei',     fullName: 'Amina Osei',       countryCode: 'GH', totalXp: 24850, level: 10 },
      { userId: 'mock-02', username: 'kwame.mensah',   fullName: 'Kwame Mensah',     countryCode: 'KE', totalXp: 22300, level: 9 },
      { userId: 'mock-03', username: 'fatima.benali',  fullName: 'Fatima Benali',     countryCode: 'TN', totalXp: 19750, level: 9 },
      { userId: 'mock-04', username: 'chidi.okonkwo',  fullName: 'Chidi Okonkwo',     countryCode: 'NG', totalXp: 17200, level: 8 },
      { userId: 'mock-05', username: 'naledi.dlamini', fullName: 'Naledi Dlamini',    countryCode: 'ZA', totalXp: 15600, level: 8 },
      { userId: 'mock-06', username: 'youssef.hassan', fullName: 'Youssef Hassan',    countryCode: 'EG', totalXp: 13900, level: 7 },
      { userId: 'mock-07', username: 'abebe.tadesse',  fullName: 'Abebe Tadesse',     countryCode: 'ET', totalXp: 12100, level: 7 },
      { userId: 'mock-08', username: 'mariama.diallo', fullName: 'Mariama Diallo',    countryCode: 'SN', totalXp: 10500, level: 6 },
      { userId: 'mock-09', username: 'omar.idrissi',   fullName: 'Omar Idrissi',      countryCode: 'MA', totalXp: 9200,  level: 6 },
      { userId: 'mock-10', username: 'grace.mwangi',   fullName: 'Grace Mwangi',      countryCode: 'TZ', totalXp: 7800,  level: 5 },
      { userId: 'mock-11', username: 'jean.mugabo',    fullName: 'Jean-Pierre Mugabo', countryCode: 'RW', totalXp: 6400,  level: 4 },
      { userId: 'mock-12', username: 'awa.konate',     fullName: 'Awa Konate',        countryCode: 'CI', totalXp: 4900,  level: 3 },
      { userId: 'mock-13', username: 'daniel.okello',  fullName: 'Daniel Okello',     countryCode: 'UG', totalXp: 3200,  level: 3 },
      { userId: 'mock-14', username: 'rose.nganou',    fullName: 'Rose Nganou',       countryCode: 'CM', totalXp: 1800,  level: 2 },
      { userId: 'mock-15', username: 'karim.bouazza',  fullName: 'Karim Bouazza',     countryCode: 'DZ', totalXp: 950,   level: 1 },
    ];
  }
}
