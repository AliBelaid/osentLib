import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { ExternalSearchService } from '@core/services/external-search.service';
import { ExternalSearchResult, ExternalSearchItem, ExternalSearchQueryDto } from '@core/models';

interface ProviderOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  description: string;
}

@Component({
  selector: 'app-social-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatSelectModule, MatCheckboxModule, MatProgressSpinnerModule,
    MatProgressBarModule, MatTooltipModule, MatBadgeModule,
    MatDividerModule, MatSnackBarModule, MatButtonToggleModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="social-search-container">
      <!-- Page Header -->
      <div class="page-header">
        <h2 class="page-title">
          <mat-icon>people_alt</mat-icon>
          {{ 'socialSearch.title' | translate }}
        </h2>
        <p class="page-subtitle">{{ 'socialSearch.subtitle' | translate }}</p>
      </div>

      <div class="main-layout">
        <!-- Search Panel -->
        <div class="search-col">
          <!-- Search Card -->
          <mat-card class="search-card">
            <mat-card-content>
              <!-- Search Input -->
              <div class="search-row">
                <mat-form-field appearance="outline" class="search-input">
                  <mat-label>{{ 'socialSearch.searchPlaceholder' | translate }}</mat-label>
                  <input matInput [(ngModel)]="query" (keyup.enter)="performSearch()"
                         placeholder="@username, #hashtag, keyword...">
                  <mat-icon matPrefix>search</mat-icon>
                </mat-form-field>
                <button mat-raised-button color="primary" class="search-btn"
                        (click)="performSearch()" [disabled]="searching || !query.trim()">
                  @if (searching) {
                    <mat-spinner diameter="20" color="accent"></mat-spinner>
                  } @else {
                    <mat-icon>travel_explore</mat-icon>
                  }
                  {{ 'socialSearch.search' | translate }}
                </button>
              </div>

              <!-- Search Type -->
              <div class="filter-row">
                <mat-button-toggle-group [(ngModel)]="searchType" class="type-toggle">
                  <mat-button-toggle value="keyword">
                    <mat-icon>text_fields</mat-icon> {{ 'socialSearch.keyword' | translate }}
                  </mat-button-toggle>
                  <mat-button-toggle value="username">
                    <mat-icon>person</mat-icon> {{ 'socialSearch.username' | translate }}
                  </mat-button-toggle>
                  <mat-button-toggle value="hashtag">
                    <mat-icon>tag</mat-icon> {{ 'socialSearch.hashtag' | translate }}
                  </mat-button-toggle>
                  <mat-button-toggle value="name">
                    <mat-icon>badge</mat-icon> {{ 'socialSearch.fullName' | translate }}
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>

              <!-- Provider Selection -->
              <div class="providers-row">
                <span class="providers-label">{{ 'socialSearch.sources' | translate }}:</span>
                <div class="provider-chips">
                  @for (p of providers; track p.id) {
                    <div class="provider-chip" [class.active]="p.enabled"
                         [style.--prov-color]="p.color"
                         (click)="p.enabled = !p.enabled"
                         [matTooltip]="p.description">
                      <mat-icon class="prov-icon">{{ p.icon }}</mat-icon>
                      <span>{{ p.name }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Advanced Filters (collapsible) -->
              <div class="advanced-toggle" (click)="showFilters = !showFilters">
                <mat-icon>{{ showFilters ? 'expand_less' : 'expand_more' }}</mat-icon>
                {{ 'socialSearch.advancedFilters' | translate }}
              </div>
              @if (showFilters) {
                <div class="advanced-filters">
                  <mat-form-field appearance="outline" class="filter-field">
                    <mat-label>{{ 'socialSearch.fromDate' | translate }}</mat-label>
                    <input matInput type="date" [(ngModel)]="fromDate">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="filter-field">
                    <mat-label>{{ 'socialSearch.toDate' | translate }}</mat-label>
                    <input matInput type="date" [(ngModel)]="toDate">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="filter-field">
                    <mat-label>{{ 'socialSearch.language' | translate }}</mat-label>
                    <mat-select [(ngModel)]="language">
                      <mat-option value="">All</mat-option>
                      <mat-option value="en">English</mat-option>
                      <mat-option value="ar">العربية</mat-option>
                      <mat-option value="fr">Français</mat-option>
                      <mat-option value="sw">Swahili</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="filter-field">
                    <mat-label>{{ 'socialSearch.maxResults' | translate }}</mat-label>
                    <mat-select [(ngModel)]="maxResults">
                      <mat-option [value]="25">25</mat-option>
                      <mat-option [value]="50">50</mat-option>
                      <mat-option [value]="100">100</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Results -->
          @if (searching) {
            <mat-card class="progress-card">
              <mat-card-content>
                <div class="searching-indicator">
                  <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
                  <p class="search-status">
                    <mat-icon class="spin">radar</mat-icon>
                    {{ 'socialSearch.searching' | translate }}
                  </p>
                </div>
              </mat-card-content>
            </mat-card>
          }

          @if (results.length > 0) {
            <!-- Results Summary -->
            <div class="results-header">
              <h3>
                <mat-icon>analytics</mat-icon>
                {{ totalResults }} {{ 'socialSearch.resultsFound' | translate }}
                <span class="query-echo">"{{ lastQuery }}"</span>
              </h3>
              <div class="provider-stats">
                @for (r of results; track r.provider) {
                  <span class="prov-stat" [style.color]="getProviderColor(r.provider)">
                    <mat-icon class="stat-icon">{{ getProviderIcon(r.provider) }}</mat-icon>
                    {{ r.provider }}: {{ r.items.length }}
                  </span>
                }
              </div>
            </div>

            <!-- Result Cards grouped by provider -->
            @for (provResult of results; track provResult.provider) {
              <div class="provider-section">
                <div class="provider-header" [style.border-color]="getProviderColor(provResult.provider)">
                  <mat-icon [style.color]="getProviderColor(provResult.provider)">
                    {{ getProviderIcon(provResult.provider) }}
                  </mat-icon>
                  <span class="provider-name">{{ provResult.provider }}</span>
                  <span class="provider-count">{{ provResult.items.length }} results</span>
                  @if (provResult.errorMessage) {
                    <span class="provider-error">
                      <mat-icon>error_outline</mat-icon> {{ provResult.errorMessage }}
                    </span>
                  }
                </div>

                @for (item of provResult.items; track item.id) {
                  <mat-card class="result-card" [style.--accent]="getProviderColor(provResult.provider)">
                    <mat-card-content>
                      <div class="result-top">
                        <div class="result-avatar" [style.background]="getProviderColor(provResult.provider)">
                          {{ item.author?.charAt(0)?.toUpperCase() || '?' }}
                        </div>
                        <div class="result-meta">
                          <span class="result-author">{{ item.author || 'Unknown' }}</span>
                          <span class="result-source">{{ item.source }}</span>
                          <span class="result-date">{{ item.publishedAt | date:'medium' }}</span>
                        </div>
                        <div class="result-engagement" *ngIf="item.engagementCount > 0">
                          <mat-icon>favorite</mat-icon>
                          <span>{{ formatEngagement(item.engagementCount) }}</span>
                        </div>
                      </div>

                      @if (item.title && item.title !== item.content) {
                        <h4 class="result-title">{{ item.title }}</h4>
                      }
                      <p class="result-content">{{ item.content | slice:0:400 }}{{ item.content.length > 400 ? '...' : '' }}</p>

                      @if (getImageUrl(item)) {
                        <div class="result-image">
                          <img [src]="getImageUrl(item)" [alt]="item.title" loading="lazy"
                               (error)="onImageError($event)">
                        </div>
                      }

                      @if (getMetaInfo(item).length > 0) {
                        <div class="result-meta-chips">
                          @for (meta of getMetaInfo(item); track meta.key) {
                            <span class="meta-chip" [style.--chip-color]="meta.color">
                              <mat-icon>{{ meta.icon }}</mat-icon> {{ meta.label }}: {{ meta.value }}
                            </span>
                          }
                        </div>
                      }

                      <div class="result-actions">
                        <a [href]="item.url" target="_blank" mat-button class="link-btn">
                          <mat-icon>open_in_new</mat-icon> {{ 'socialSearch.viewOriginal' | translate }}
                        </a>
                        <button mat-button class="analyze-btn" (click)="analyzeItem(item)">
                          <mat-icon>psychology</mat-icon> {{ 'socialSearch.analyze' | translate }}
                        </button>
                        <button mat-button class="link-btn" (click)="createIntelReport(item)">
                          <mat-icon>shield</mat-icon> {{ 'intel.createReport' | translate }}
                        </button>
                        @if (getHashtags(item).length > 0) {
                          <div class="result-tags">
                            @for (tag of getHashtags(item); track tag) {
                              <span class="hashtag">#{{ tag }}</span>
                            }
                          </div>
                        }
                      </div>
                    </mat-card-content>
                  </mat-card>
                }

                @if (provResult.items.length === 0 && !provResult.errorMessage) {
                  <div class="no-results-provider">
                    <mat-icon>search_off</mat-icon>
                    <span>{{ 'socialSearch.noResults' | translate }} {{ provResult.provider }}</span>
                  </div>
                }
              </div>
            }
          }

          @if (!searching && results.length === 0 && hasSearched) {
            <mat-card class="empty-state">
              <mat-card-content>
                <mat-icon class="empty-icon">search_off</mat-icon>
                <h3>{{ 'socialSearch.noResultsTitle' | translate }}</h3>
                <p>{{ 'socialSearch.noResultsDesc' | translate }}</p>
              </mat-card-content>
            </mat-card>
          }

          @if (!hasSearched && results.length === 0) {
            <mat-card class="welcome-state">
              <mat-card-content>
                <div class="welcome-grid">
                  <div class="welcome-card">
                    <mat-icon [style.color]="'#333333'">code</mat-icon>
                    <h4>GitHub</h4>
                    <p>{{ 'socialSearch.githubDesc' | translate }}</p>
                  </div>
                  <div class="welcome-card">
                    <mat-icon [style.color]="'#FF4500'">forum</mat-icon>
                    <h4>Reddit</h4>
                    <p>{{ 'socialSearch.redditDesc' | translate }}</p>
                  </div>
                  <div class="welcome-card">
                    <mat-icon [style.color]="'#FF6600'">trending_up</mat-icon>
                    <h4>Hacker News</h4>
                    <p>{{ 'socialSearch.hackerNewsDesc' | translate }}</p>
                  </div>
                  <div class="welcome-card">
                    <mat-icon [style.color]="'#ff1744'">shield</mat-icon>
                    <h4>Threat Intel</h4>
                    <p>{{ 'socialSearch.threatIntelDesc' | translate }}</p>
                  </div>
                  <div class="welcome-card">
                    <mat-icon [style.color]="'#1DA1F2'">tag</mat-icon>
                    <h4>Twitter / X</h4>
                    <p>{{ 'socialSearch.twitterDesc' | translate }}</p>
                  </div>
                  <div class="welcome-card">
                    <mat-icon [style.color]="'#4CAF50'">newspaper</mat-icon>
                    <h4>News API</h4>
                    <p>{{ 'socialSearch.newsDesc' | translate }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Sidebar -->
        <div class="sidebar-col">
          <!-- Quick Stats -->
          @if (results.length > 0) {
            <mat-card class="stats-card">
              <mat-card-header>
                <mat-card-title class="sidebar-title">
                  <mat-icon>insights</mat-icon> {{ 'socialSearch.quickStats' | translate }}
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-item">
                  <span class="stat-label">{{ 'socialSearch.totalResults' | translate }}</span>
                  <span class="stat-value accent">{{ totalResults }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">{{ 'socialSearch.providersQueried' | translate }}</span>
                  <span class="stat-value">{{ results.length }}</span>
                </div>
                @for (r of results; track r.provider) {
                  <div class="stat-item">
                    <span class="stat-label" [style.color]="getProviderColor(r.provider)">{{ r.provider }}</span>
                    <span class="stat-value">{{ r.items.length }}</span>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }

          <!-- Search History -->
          <mat-card class="history-card">
            <mat-card-header>
              <mat-card-title class="sidebar-title">
                <mat-icon>history</mat-icon> {{ 'socialSearch.recentSearches' | translate }}
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (searchService.searchHistory().length === 0) {
                <p class="empty-history">{{ 'socialSearch.noHistory' | translate }}</p>
              } @else {
                <div class="history-list">
                  @for (h of searchService.searchHistory().slice(0, 10); track h.id) {
                    <div class="history-item" (click)="replaySearch(h)">
                      <div class="hist-icon" [style.color]="getProviderColor(h.provider)">
                        <mat-icon>{{ getProviderIcon(h.provider) }}</mat-icon>
                      </div>
                      <div class="hist-body">
                        <span class="hist-query">{{ h.query }}</span>
                        <span class="hist-meta">{{ h.provider }} · {{ h.resultsCount }} results</span>
                      </div>
                      <mat-icon class="hist-status" [style.color]="getStatusColor(h.status)">
                        {{ getStatusIcon(h.status) }}
                      </mat-icon>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Provider Status -->
          <mat-card class="provider-status-card">
            <mat-card-header>
              <mat-card-title class="sidebar-title">
                <mat-icon>cloud_queue</mat-icon> {{ 'socialSearch.providerStatus' | translate }}
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (p of providers; track p.id) {
                <div class="prov-status-row">
                  <mat-icon [style.color]="p.color">{{ p.icon }}</mat-icon>
                  <span class="prov-status-name">{{ p.name }}</span>
                  <span class="prov-status-dot online"></span>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 0 16px 32px; min-height: 100vh; }

    .page-header { margin-bottom: 20px; }
    .page-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 24px; font-weight: 600; margin: 0; color: var(--text-primary);
    }
    .page-title mat-icon { color: #667eea; }
    .page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .main-layout { display: flex; gap: 20px; }
    .search-col { flex: 1; min-width: 0; }
    .sidebar-col { flex: 0 0 320px; display: flex; flex-direction: column; gap: 16px; }

    /* Search Card */
    .search-card { margin-bottom: 16px; }
    .search-row { display: flex; gap: 12px; align-items: flex-start; }
    .search-input { flex: 1; }
    .search-btn {
      height: 56px; min-width: 140px; display: flex; align-items: center; gap: 8px;
      font-weight: 600; font-size: 15px;
    }

    .filter-row { margin: 8px 0 12px; }
    .type-toggle { width: 100%; }
    .type-toggle mat-button-toggle { flex: 1; }
    :host ::ng-deep .type-toggle .mat-button-toggle-label-content {
      display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 0 8px;
    }

    .providers-row { margin: 12px 0; }
    .providers-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 8px; }
    .provider-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .provider-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px; cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);
      font-size: 13px; transition: all 0.2s; color: var(--text-secondary);
    }
    .provider-chip:hover { border-color: var(--prov-color); }
    .provider-chip.active {
      background: color-mix(in srgb, var(--prov-color) 15%, transparent);
      border-color: var(--prov-color); color: var(--prov-color);
    }
    .prov-icon { font-size: 18px; width: 18px; height: 18px; }

    .advanced-toggle {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #667eea; cursor: pointer; margin: 8px 0;
    }
    .advanced-filters { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .filter-field { flex: 1; min-width: 180px; }

    /* Progress */
    .progress-card { margin-bottom: 16px; }
    .searching-indicator { text-align: center; padding: 20px 0; }
    .search-status {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 12px; color: #667eea; font-weight: 500;
    }
    .spin { animation: spin 1.5s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Results Header */
    .results-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .results-header h3 {
      display: flex; align-items: center; gap: 8px;
      font-size: 18px; color: var(--text-primary); margin: 0;
    }
    .query-echo { color: #667eea; font-weight: 400; }
    .provider-stats { display: flex; gap: 16px; }
    .prov-stat {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 600;
    }
    .stat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Provider Section */
    .provider-section { margin-bottom: 24px; }
    .provider-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; border-radius: 8px;
      background: rgba(255,255,255,0.02); border-left: 3px solid;
      margin-bottom: 12px;
    }
    .provider-name { font-weight: 600; font-size: 16px; color: var(--text-primary); }
    .provider-count { font-size: 12px; color: var(--text-secondary); margin-left: auto; }
    .provider-error { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #ff1744; }

    /* Result Card */
    .result-card {
      margin-bottom: 10px; border-left: 3px solid var(--accent, #667eea);
      transition: transform 0.15s;
    }
    .result-card:hover { transform: translateX(4px); }
    .result-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .result-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px; color: #fff; flex-shrink: 0;
    }
    .result-meta { display: flex; flex-direction: column; flex: 1; }
    .result-author { font-weight: 600; font-size: 14px; color: var(--text-primary); }
    .result-source { font-size: 11px; color: var(--text-secondary); }
    .result-date { font-size: 11px; color: #667eea; }
    .result-engagement {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #ff6b6b; font-weight: 600;
    }
    .result-engagement mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .result-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 4px 0; }
    .result-content { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 8px; }

    .result-image {
      margin: 8px 0; border-radius: 8px; overflow: hidden; max-height: 300px;
      img { width: 100%; height: auto; max-height: 300px; object-fit: cover; border-radius: 8px; display: block; }
    }

    .result-meta-chips {
      display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0;
    }
    .meta-chip {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; padding: 3px 10px; border-radius: 12px;
      background: var(--border-default); color: var(--chip-color, var(--text-secondary));
      border: 1px solid rgba(255,255,255,0.08);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    .result-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .link-btn { color: #667eea !important; font-size: 12px; }
    .analyze-btn { color: #00e5ff !important; font-size: 12px; }
    .result-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-left: auto; }
    .hashtag {
      font-size: 11px; color: #667eea; background: rgba(102,126,234,0.1);
      padding: 2px 8px; border-radius: 10px;
    }

    .no-results-provider {
      display: flex; align-items: center; gap: 8px;
      padding: 16px; color: var(--text-secondary); font-size: 13px;
    }

    /* Empty / Welcome States */
    .empty-state, .welcome-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; color: var(--text-secondary); opacity: 0.5; }
    .empty-state h3 { color: var(--text-primary); }
    .empty-state p { color: var(--text-secondary); }

    .welcome-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
      text-align: center;
    }
    .welcome-card {
      padding: 24px 16px; border-radius: 12px;
      background: rgba(255,255,255,0.02); border: 1px solid var(--border-default);
      transition: transform 0.2s, border-color 0.2s;
    }
    .welcome-card:hover { transform: translateY(-4px); border-color: rgba(102,126,234,0.3); }
    .welcome-card mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
    .welcome-card h4 { color: var(--text-primary); margin: 8px 0 4px; font-size: 15px; }
    .welcome-card p { color: var(--text-secondary); font-size: 12px; margin: 0; line-height: 1.5; }
    .welcome-card.dark-web { border-color: rgba(255,23,68,0.15); }

    /* Sidebar */
    .sidebar-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; font-weight: 600;
    }

    .stat-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .stat-label { font-size: 13px; color: var(--text-secondary); }
    .stat-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .stat-value.accent { color: #667eea; }

    .empty-history { color: var(--text-secondary); font-size: 13px; text-align: center; padding: 16px 0; }

    .history-list { max-height: 320px; overflow-y: auto; }
    .history-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px; border-radius: 8px; cursor: pointer; transition: background 0.15s;
    }
    .history-item:hover { background: rgba(102,126,234,0.06); }
    .hist-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .hist-body { flex: 1; display: flex; flex-direction: column; }
    .hist-query { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .hist-meta { font-size: 11px; color: var(--text-secondary); }
    .hist-status mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .prov-status-row {
      display: flex; align-items: center; gap: 8px; padding: 6px 0;
    }
    .prov-status-name { flex: 1; font-size: 13px; color: var(--text-primary); }
    .prov-status-dot {
      width: 8px; height: 8px; border-radius: 50%;
    }
    .prov-status-dot.online { background: #00e676; box-shadow: 0 0 6px rgba(0,230,118,0.5); }

    @media (max-width: 1100px) {
      .main-layout { flex-direction: column; }
      .sidebar-col { flex: 1; }
      .welcome-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .welcome-grid { grid-template-columns: 1fr; }
      .search-row { flex-direction: column; }
      .search-btn { width: 100%; }
    }
  `]
})
export class SocialSearchComponent implements OnInit {
  private router = inject(Router);
  query = '';
  searchType = 'keyword';
  showFilters = false;
  fromDate = '';
  toDate = '';
  language = '';
  maxResults = 50;
  searching = false;
  hasSearched = false;
  lastQuery = '';
  results: ExternalSearchResult[] = [];

  providers: ProviderOption[] = [
    { id: 'GitHub', name: 'GitHub', icon: 'code', color: '#333333', enabled: true, description: 'Search repos, users, issues (real API, no key needed)' },
    { id: 'Reddit', name: 'Reddit', icon: 'forum', color: '#FF4500', enabled: true, description: 'Search posts, comments, and subreddits (real API)' },
    { id: 'HackerNews', name: 'Hacker News', icon: 'trending_up', color: '#FF6600', enabled: true, description: 'Search stories and discussions (real API)' },
    { id: 'ThreatIntel', name: 'Threat Intel', icon: 'shield', color: '#ff1744', enabled: true, description: 'Shodan + crt.sh + URLScan (real threat data)' },
    { id: 'Twitter', name: 'Twitter / X', icon: 'tag', color: '#1DA1F2', enabled: false, description: 'Requires API key in settings' },
    { id: 'NewsAPI', name: 'News', icon: 'newspaper', color: '#4CAF50', enabled: false, description: 'Requires API key from newsapi.org' },
  ];

  get totalResults(): number {
    return this.results.reduce((sum, r) => sum + r.items.length, 0);
  }

  constructor(
    public searchService: ExternalSearchService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.searchService.loadHistory();
  }

  performSearch(): void {
    if (!this.query.trim()) return;

    const enabledProviders = this.providers.filter(p => p.enabled).map(p => p.id);
    if (enabledProviders.length === 0) {
      this.snackBar.open('Please select at least one source', 'OK', { duration: 3000 });
      return;
    }

    this.searching = true;
    this.hasSearched = true;
    this.lastQuery = this.query;
    this.results = [];
    this.cdr.detectChanges();

    // Build query based on search type
    let finalQuery = this.query;
    if (this.searchType === 'hashtag' && !this.query.startsWith('#')) {
      finalQuery = '#' + this.query;
    }
    if (this.searchType === 'username' && !this.query.startsWith('@')) {
      finalQuery = '@' + this.query;
    }

    const filters: any = {};
    if (this.fromDate) filters.fromDate = this.fromDate;
    if (this.toDate) filters.toDate = this.toDate;
    if (this.language) filters.language = this.language;
    if (this.maxResults) filters.maxResults = this.maxResults;

    // If username search, add twitter-specific filter
    if (this.searchType === 'username') {
      filters.twitterUsername = this.query.replace('@', '');
    }

    this.searchService.searchMultiple(enabledProviders, finalQuery, filters).subscribe({
      next: (response) => {
        this.results = response.results || [];
        this.searching = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.searching = false;
        this.snackBar.open(err.error?.error || 'Search failed', 'OK', { duration: 5000 });
        this.cdr.detectChanges();
      }
    });
  }

  replaySearch(h: ExternalSearchQueryDto): void {
    this.query = h.query;
    const prov = this.providers.find(p => p.id === h.provider);
    if (prov) {
      this.providers.forEach(p => p.enabled = false);
      prov.enabled = true;
    }
    this.performSearch();
  }

  analyzeItem(item: ExternalSearchItem): void {
    this.snackBar.open('OSINT analysis started for: ' + (item.author || item.title), 'OK', { duration: 3000 });
  }

  getProviderColor(provider: string): string {
    return this.searchService.getProviderColor(provider);
  }

  getProviderIcon(provider: string): string {
    const map: Record<string, string> = {
      'GitHub': 'code', 'Reddit': 'forum', 'HackerNews': 'trending_up',
      'ThreatIntel': 'shield', 'Twitter': 'tag', 'NewsAPI': 'newspaper'
    };
    return map[provider] || 'search';
  }

  getStatusColor(status: string): string {
    return this.searchService.getStatusColor(status) === 'primary' ? '#667eea' :
           this.searchService.getStatusColor(status) === 'warn' ? '#ff1744' : '#ff9100';
  }

  getStatusIcon(status: string): string {
    return this.searchService.getStatusIcon(status);
  }

  formatEngagement(count: number): string {
    return this.searchService.formatEngagementCount(count);
  }

  getHashtags(item: ExternalSearchItem): string[] {
    const tags = item.metadata?.['hashtags'];
    if (Array.isArray(tags)) return tags.slice(0, 5);
    return [];
  }

  onImageError(event: Event): void {
    const el = event.target as HTMLElement;
    el.style.display = 'none';
  }

  getImageUrl(item: ExternalSearchItem): string | null {
    const url = item.metadata?.['image_url'];
    return typeof url === 'string' && url.length > 0 ? url : null;
  }

  getMetaInfo(item: ExternalSearchItem): { key: string; label: string; value: string; icon: string; color: string }[] {
    const info: { key: string; label: string; value: string; icon: string; color: string }[] = [];
    const m = item.metadata;
    if (!m) return info;

    // Twitter
    if (m['likes'] !== undefined) info.push({ key: 'likes', label: 'Likes', value: this.formatEngagement(+m['likes']), icon: 'favorite', color: '#e91e63' });
    if (m['retweets'] !== undefined) info.push({ key: 'retweets', label: 'Retweets', value: this.formatEngagement(+m['retweets']), icon: 'repeat', color: '#1DA1F2' });
    if (m['replies'] !== undefined && m['platform'] === 'Twitter') info.push({ key: 'replies', label: 'Replies', value: this.formatEngagement(+m['replies']), icon: 'chat_bubble_outline', color: '#666' });

    // GitHub
    if (m['stars'] !== undefined) info.push({ key: 'stars', label: 'Stars', value: this.formatEngagement(+m['stars']), icon: 'star', color: '#333333' });
    if (m['forks'] !== undefined) info.push({ key: 'forks', label: 'Forks', value: this.formatEngagement(+m['forks']), icon: 'call_split', color: '#333333' });
    if (m['language'] !== undefined) info.push({ key: 'language', label: 'Language', value: '' + m['language'], icon: 'code', color: '#333333' });

    // HackerNews
    if (m['points'] !== undefined) info.push({ key: 'points', label: 'Points', value: this.formatEngagement(+m['points']), icon: 'trending_up', color: '#FF6600' });
    if (m['num_comments'] !== undefined) info.push({ key: 'comments', label: 'Comments', value: this.formatEngagement(+m['num_comments']), icon: 'comment', color: '#FF6600' });

    // Reddit
    if (m['upvotes'] !== undefined) info.push({ key: 'upvotes', label: 'Upvotes', value: this.formatEngagement(+m['upvotes']), icon: 'arrow_upward', color: '#FF4500' });
    if (m['subreddit'] !== undefined) info.push({ key: 'subreddit', label: 'Subreddit', value: 'r/' + m['subreddit'], icon: 'forum', color: '#FF4500' });

    // ThreatIntel
    if (m['vulns'] !== undefined) info.push({ key: 'vulns', label: 'Vulns', value: '' + m['vulns'], icon: 'bug_report', color: '#ff1744' });
    if (m['ports'] !== undefined) info.push({ key: 'ports', label: 'Ports', value: '' + m['ports'], icon: 'dns', color: '#ff1744' });
    if (m['issuer'] !== undefined) info.push({ key: 'issuer', label: 'Issuer', value: '' + m['issuer'], icon: 'verified', color: '#4CAF50' });

    return info;
  }

  createIntelReport(item: ExternalSearchItem): void {
    this.router.navigate(['/intelligence/new'], {
      queryParams: {
        title: item.title,
        content: item.content?.substring(0, 500) || '',
        type: 'report'
      }
    });
  }
}
