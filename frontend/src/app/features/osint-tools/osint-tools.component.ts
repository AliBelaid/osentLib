import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env';

/* ────────────────────────────────────────────
   Interfaces
   ──────────────────────────────────────────── */

interface Breach {
  name: string;
  domain: string;
  breachDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  severity: string;
  isVerified: boolean;
}

interface EmailBreachResult {
  email: string;
  found: boolean;
  totalBreaches: number;
  totalExposedRecords: number;
  breaches: Breach[];
}

interface DomainIntelResult {
  target: string;
  type: string;
  whois: Record<string, unknown>;
  geoIp: Record<string, unknown>;
  openPorts: Array<{ port: number; service: string; state: string }>;
  technologies: string[];
  subdomains: string[];
  dns: Record<string, unknown>;
  threatIntel: { riskScore: number; riskLevel: string; tags: string[] };
  sslCerts: Record<string, unknown>;
}

interface Dork {
  title: string;
  query: string;
  description: string;
  category: string;
  risk: string;
}

interface GoogleDorksResult {
  target: string;
  category: string;
  dorks: Dork[];
}

interface Snapshot {
  timestamp: string;
  captureDate: string;
  archiveUrl: string;
  statusCode: number;
}

interface WaybackResult {
  url: string;
  totalSnapshots: number;
  firstSnapshot: string;
  lastSnapshot: string;
  snapshots: Snapshot[];
}

interface SpiderFinding {
  module: string;
  type: string;
  data: string;
  severity: string;
  foundAt: string;
  source: string;
}

interface SpiderFootResult {
  scanId: string;
  target: string;
  status: string;
  findings: SpiderFinding[];
  moduleStats: Record<string, number>;
}

@Component({
  selector: 'app-osint-tools',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTabsModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatChipsModule, MatProgressSpinnerModule,
    MatTooltipModule, MatTableModule, MatBadgeModule, TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="osint-container">
      <!-- Page Header -->
      <div class="page-header">
        <h2 class="page-title">
          <mat-icon>biotech</mat-icon>
          OSINT Framework
        </h2>
        <p class="page-subtitle">Open Source Intelligence Toolkit for African Security Operations</p>
      </div>

      <mat-tab-group class="osint-tabs" animationDuration="200ms" (selectedTabChange)="onTabChange($event)">

        <!-- ═══════════════════════════════════════════
             TAB 1: EMAIL INTEL
             ═══════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">email</mat-icon>
            Email Intel
          </ng-template>

          <div class="tab-body">
            <mat-card class="input-card">
              <mat-card-content>
                <div class="input-row">
                  <mat-form-field appearance="outline" class="flex-input">
                    <mat-label>Email Address</mat-label>
                    <input matInput [(ngModel)]="emailInput" placeholder="target@example.com"
                           (keyup.enter)="checkEmailBreach()">
                    <mat-icon matPrefix>alternate_email</mat-icon>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="action-btn"
                          (click)="checkEmailBreach()" [disabled]="emailLoading || !emailInput.trim()">
                    @if (emailLoading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>search</mat-icon>
                    }
                    Check Breaches
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            @if (emailError) {
              <div class="error-banner">
                <mat-icon>error</mat-icon>
                {{ emailError }}
              </div>
            }

            @if (emailResult) {
              <!-- Summary Stats -->
              <div class="breach-summary">
                <mat-card class="summary-card breach-count-card">
                  <div class="summary-icon"><mat-icon>report_problem</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value">{{ emailResult.totalBreaches }}</div>
                    <div class="summary-label">Total Breaches</div>
                  </div>
                </mat-card>
                <mat-card class="summary-card records-card">
                  <div class="summary-icon"><mat-icon>data_usage</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value">{{ emailResult.totalExposedRecords | number }}</div>
                    <div class="summary-label">Records Exposed</div>
                  </div>
                </mat-card>
                <mat-card class="summary-card status-card">
                  <div class="summary-icon">
                    <mat-icon>{{ emailResult.found ? 'gpp_bad' : 'verified_user' }}</mat-icon>
                  </div>
                  <div class="summary-info">
                    <div class="summary-value" [class.text-danger]="emailResult.found" [class.text-safe]="!emailResult.found">
                      {{ emailResult.found ? 'BREACHED' : 'CLEAN' }}
                    </div>
                    <div class="summary-label">{{ emailResult.email }}</div>
                  </div>
                </mat-card>
              </div>

              <!-- Breach Cards -->
              @if (emailResult.breaches.length > 0) {
                <h3 class="section-heading">
                  <mat-icon>warning</mat-icon>
                  Breach Details
                </h3>
                <div class="breach-grid">
                  @for (breach of emailResult.breaches; track breach.name) {
                    <mat-card class="breach-card">
                      <div class="breach-header">
                        <div class="breach-name">{{ breach.name }}</div>
                        <span class="severity-badge" [class]="'severity-' + (breach.severity || 'Medium').toLowerCase()">
                          {{ breach.severity || 'Medium' }}
                        </span>
                      </div>
                      <div class="breach-meta">
                        <span class="mono-text">{{ breach.domain }}</span>
                        <span class="breach-date">{{ breach.breachDate | date:'mediumDate' }}</span>
                        <span class="pwn-count">{{ breach.pwnCount | number }} records</span>
                      </div>
                      @if (breach.isVerified) {
                        <div class="verified-badge">
                          <mat-icon>verified</mat-icon> Verified Breach
                        </div>
                      }
                      <p class="breach-desc">{{ breach.description }}</p>
                      <div class="data-classes">
                        @for (dc of breach.dataClasses; track dc) {
                          <span class="data-chip">{{ dc }}</span>
                        }
                      </div>
                    </mat-card>
                  }
                </div>
              }
            }
          </div>
        </mat-tab>

        <!-- ═══════════════════════════════════════════
             TAB 2: DOMAIN / IP INTEL
             ═══════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">dns</mat-icon>
            Domain/IP Intel
          </ng-template>

          <div class="tab-body">
            <mat-card class="input-card">
              <mat-card-content>
                <div class="input-row">
                  <mat-form-field appearance="outline" class="flex-input">
                    <mat-label>Domain or IP Address</mat-label>
                    <input matInput [(ngModel)]="domainInput" placeholder="example.com or 41.58.100.1"
                           (keyup.enter)="analyzeDomain()">
                    <mat-icon matPrefix>language</mat-icon>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="action-btn"
                          (click)="analyzeDomain()" [disabled]="domainLoading || !domainInput.trim()">
                    @if (domainLoading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>radar</mat-icon>
                    }
                    Analyze
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            @if (domainError) {
              <div class="error-banner">
                <mat-icon>error</mat-icon>
                {{ domainError }}
              </div>
            }

            @if (domainResult) {
              <div class="domain-grid">

                <!-- Threat Intel -->
                @if (domainResult.threatIntel) {
                  <mat-card class="domain-section threat-section full-width">
                    <h3 class="section-title-inline">
                      <mat-icon>shield</mat-icon> Threat Intelligence
                    </h3>
                    <div class="threat-overview">
                      <div class="risk-gauge">
                        <svg viewBox="0 0 120 70" class="gauge-svg">
                          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#1a1f2e" stroke-width="10" stroke-linecap="round"/>
                          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none"
                                [attr.stroke]="getGaugeColor(domainResult.threatIntel.riskScore)"
                                stroke-width="10" stroke-linecap="round"
                                [attr.stroke-dasharray]="getGaugeDash(domainResult.threatIntel.riskScore)"
                                stroke-dashoffset="0"/>
                          <text x="60" y="58" text-anchor="middle" fill="#e0e6f0" font-size="22" font-weight="bold">
                            {{ domainResult.threatIntel.riskScore }}
                          </text>
                          <text x="60" y="70" text-anchor="middle" fill="#8892a4" font-size="8">/100</text>
                        </svg>
                        <div class="risk-level-label" [style.color]="getGaugeColor(domainResult.threatIntel.riskScore)">
                          {{ domainResult.threatIntel.riskLevel }}
                        </div>
                      </div>
                      <div class="threat-tags">
                        @for (tag of domainResult.threatIntel.tags; track tag) {
                          <span class="threat-tag">{{ tag }}</span>
                        }
                      </div>
                    </div>
                  </mat-card>
                }

                <!-- WHOIS -->
                @if (domainResult.whois) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>badge</mat-icon> WHOIS
                    </h3>
                    <div class="info-grid">
                      @for (entry of objectEntries(domainResult.whois); track entry[0]) {
                        <div class="info-item">
                          <span class="info-key">{{ formatKey(entry[0]) }}</span>
                          <span class="info-val">{{ entry[1] || 'N/A' }}</span>
                        </div>
                      }
                    </div>
                  </mat-card>
                }

                <!-- GeoIP -->
                @if (domainResult.geoIp) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>location_on</mat-icon> GeoIP
                    </h3>
                    <div class="info-grid">
                      @for (entry of objectEntries(domainResult.geoIp); track entry[0]) {
                        <div class="info-item">
                          <span class="info-key">{{ formatKey(entry[0]) }}</span>
                          <span class="info-val mono-text">{{ entry[1] || 'N/A' }}</span>
                        </div>
                      }
                    </div>
                  </mat-card>
                }

                <!-- Open Ports -->
                @if (domainResult.openPorts && domainResult.openPorts.length > 0) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>router</mat-icon> Open Ports
                    </h3>
                    <table class="ports-table">
                      <thead>
                        <tr>
                          <th>Port</th>
                          <th>Service</th>
                          <th>State</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (p of domainResult.openPorts; track p.port) {
                          <tr>
                            <td class="mono-text port-num">{{ p.port }}</td>
                            <td>{{ p.service }}</td>
                            <td>
                              <span class="state-badge" [class.open]="p.state === 'open'">{{ p.state }}</span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </mat-card>
                }

                <!-- Technologies -->
                @if (domainResult.technologies && domainResult.technologies.length > 0) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>memory</mat-icon> Technologies
                    </h3>
                    <div class="tech-chips">
                      @for (tech of domainResult.technologies; track tech) {
                        <span class="tech-chip">{{ tech }}</span>
                      }
                    </div>
                  </mat-card>
                }

                <!-- Subdomains -->
                @if (domainResult.subdomains && domainResult.subdomains.length > 0) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>account_tree</mat-icon> Subdomains ({{ domainResult.subdomains.length }})
                    </h3>
                    <div class="subdomain-list">
                      @for (sub of domainResult.subdomains; track sub) {
                        <div class="subdomain-item mono-text">{{ sub }}</div>
                      }
                    </div>
                  </mat-card>
                }

                <!-- DNS Records -->
                @if (domainResult.dns) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>dns</mat-icon> DNS Records
                    </h3>
                    <div class="info-grid">
                      @for (entry of objectEntries(domainResult.dns); track entry[0]) {
                        <div class="info-item">
                          <span class="info-key">{{ entry[0] }}</span>
                          <span class="info-val mono-text">{{ formatDnsValue(entry[1]) }}</span>
                        </div>
                      }
                    </div>
                  </mat-card>
                }

                <!-- SSL Certs -->
                @if (domainResult.sslCerts) {
                  <mat-card class="domain-section">
                    <h3 class="section-title-inline">
                      <mat-icon>lock</mat-icon> SSL Certificate
                    </h3>
                    <div class="info-grid">
                      @for (entry of objectEntries(domainResult.sslCerts); track entry[0]) {
                        <div class="info-item">
                          <span class="info-key">{{ formatKey(entry[0]) }}</span>
                          <span class="info-val">{{ entry[1] || 'N/A' }}</span>
                        </div>
                      }
                    </div>
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ═══════════════════════════════════════════
             TAB 3: GOOGLE DORKS
             ═══════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">manage_search</mat-icon>
            Google Dorks
          </ng-template>

          <div class="tab-body">
            <mat-card class="input-card">
              <mat-card-content>
                <div class="input-row">
                  <mat-form-field appearance="outline" class="flex-input">
                    <mat-label>Target Domain</mat-label>
                    <input matInput [(ngModel)]="dorksTarget" placeholder="example.com"
                           (keyup.enter)="generateDorks()">
                    <mat-icon matPrefix>language</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="select-field">
                    <mat-label>Category</mat-label>
                    <mat-select [(ngModel)]="dorksCategory">
                      <mat-option value="All">All</mat-option>
                      <mat-option value="Sensitive Files">Sensitive Files</mat-option>
                      <mat-option value="Login Pages">Login Pages</mat-option>
                      <mat-option value="Vulnerabilities">Vulnerabilities</mat-option>
                      <mat-option value="Email Harvest">Email Harvest</mat-option>
                      <mat-option value="Dark Web">Dark Web</mat-option>
                      <mat-option value="Social Media">Social Media</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="action-btn"
                          (click)="generateDorks()" [disabled]="dorksLoading || !dorksTarget.trim()">
                    @if (dorksLoading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>auto_fix_high</mat-icon>
                    }
                    Generate
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            @if (dorksError) {
              <div class="error-banner">
                <mat-icon>error</mat-icon>
                {{ dorksError }}
              </div>
            }

            @if (dorksResult) {
              <div class="dorks-count">
                <mat-icon>search</mat-icon>
                {{ dorksResult.dorks.length }} dorks generated for
                <span class="mono-text highlight">{{ dorksResult.target }}</span>
                @if (dorksResult.category !== 'All') {
                  in category <span class="highlight">{{ dorksResult.category }}</span>
                }
              </div>
              <div class="dorks-grid">
                @for (dork of dorksResult.dorks; track dork.query) {
                  <mat-card class="dork-card">
                    <div class="dork-header">
                      <span class="dork-title">{{ dork.title }}</span>
                      <span class="risk-badge" [class]="'risk-' + (dork.risk || 'Medium').toLowerCase()">
                        {{ dork.risk || 'Medium' }}
                      </span>
                    </div>
                    <div class="dork-query-row">
                      <code class="dork-query">{{ dork.query }}</code>
                      <button mat-icon-button class="copy-btn" (click)="copyToClipboard(dork.query)"
                              [matTooltip]="copiedQuery === dork.query ? 'Copied!' : 'Copy query'">
                        <mat-icon>{{ copiedQuery === dork.query ? 'check' : 'content_copy' }}</mat-icon>
                      </button>
                    </div>
                    <p class="dork-desc">{{ dork.description }}</p>
                    @if (dork.category) {
                      <span class="dork-category-chip">{{ dork.category }}</span>
                    }
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- ═══════════════════════════════════════════
             TAB 4: WAYBACK MACHINE
             ═══════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">history</mat-icon>
            Wayback Machine
          </ng-template>

          <div class="tab-body">
            <mat-card class="input-card">
              <mat-card-content>
                <div class="input-row">
                  <mat-form-field appearance="outline" class="flex-input">
                    <mat-label>URL</mat-label>
                    <input matInput [(ngModel)]="waybackUrl" placeholder="https://example.com"
                           (keyup.enter)="searchWayback()">
                    <mat-icon matPrefix>link</mat-icon>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="action-btn"
                          (click)="searchWayback()" [disabled]="waybackLoading || !waybackUrl.trim()">
                    @if (waybackLoading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>travel_explore</mat-icon>
                    }
                    Search Archives
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            @if (waybackError) {
              <div class="error-banner">
                <mat-icon>error</mat-icon>
                {{ waybackError }}
              </div>
            }

            @if (waybackResult) {
              <!-- Summary -->
              <div class="wayback-summary">
                <mat-card class="summary-card">
                  <div class="summary-icon"><mat-icon>collections_bookmark</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value">{{ waybackResult.totalSnapshots | number }}</div>
                    <div class="summary-label">Total Snapshots</div>
                  </div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-icon"><mat-icon>first_page</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value date-val">{{ waybackResult.firstSnapshot | date:'mediumDate' }}</div>
                    <div class="summary-label">First Capture</div>
                  </div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-icon"><mat-icon>last_page</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value date-val">{{ waybackResult.lastSnapshot | date:'mediumDate' }}</div>
                    <div class="summary-label">Last Capture</div>
                  </div>
                </mat-card>
              </div>

              <!-- Snapshot List -->
              @if (waybackResult.snapshots.length > 0) {
                <h3 class="section-heading">
                  <mat-icon>timeline</mat-icon>
                  Archive Timeline
                </h3>
                <div class="snapshot-list">
                  @for (snap of waybackResult.snapshots; track snap.timestamp) {
                    <div class="snapshot-item">
                      <div class="snap-date-col">
                        <mat-icon class="snap-icon">schedule</mat-icon>
                        <span class="snap-date">{{ snap.captureDate | date:'medium' }}</span>
                      </div>
                      <span class="status-code-badge" [class]="getStatusClass(snap.statusCode)">
                        {{ snap.statusCode }}
                      </span>
                      <a [href]="snap.archiveUrl" target="_blank" rel="noopener" class="archive-link">
                        <mat-icon>open_in_new</mat-icon>
                        View Archive
                      </a>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </mat-tab>

        <!-- ═══════════════════════════════════════════
             TAB 5: SPIDERFOOT SCANNER
             ═══════════════════════════════════════════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">pest_control</mat-icon>
            SpiderFoot Scanner
          </ng-template>

          <div class="tab-body">
            <mat-card class="input-card">
              <mat-card-content>
                <div class="input-row">
                  <mat-form-field appearance="outline" class="flex-input">
                    <mat-label>Target</mat-label>
                    <input matInput [(ngModel)]="spiderTarget" placeholder="domain, IP, email, or name"
                           (keyup.enter)="startSpiderScan()">
                    <mat-icon matPrefix>track_changes</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="select-field">
                    <mat-label>Scan Type</mat-label>
                    <mat-select [(ngModel)]="spiderScanType">
                      <mat-option value="Quick">Quick</mat-option>
                      <mat-option value="Full">Full</mat-option>
                      <mat-option value="Passive">Passive</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="action-btn"
                          (click)="startSpiderScan()" [disabled]="spiderLoading || !spiderTarget.trim()">
                    @if (spiderLoading) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>play_arrow</mat-icon>
                    }
                    Start Scan
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            @if (spiderError) {
              <div class="error-banner">
                <mat-icon>error</mat-icon>
                {{ spiderError }}
              </div>
            }

            @if (spiderResult) {
              <!-- Scan Overview -->
              <div class="spider-overview">
                <mat-card class="summary-card">
                  <div class="summary-icon"><mat-icon>fingerprint</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value mono-text scan-id">{{ spiderResult.scanId }}</div>
                    <div class="summary-label">Scan ID</div>
                  </div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-icon"><mat-icon>info</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value" [class]="'status-' + spiderResult.status.toLowerCase()">
                      {{ spiderResult.status }}
                    </div>
                    <div class="summary-label">Status</div>
                  </div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-icon"><mat-icon>analytics</mat-icon></div>
                  <div class="summary-info">
                    <div class="summary-value">{{ spiderResult.findings.length }}</div>
                    <div class="summary-label">Total Findings</div>
                  </div>
                </mat-card>
              </div>

              <!-- Module Stats Bar Chart -->
              @if (spiderModuleEntries.length > 0) {
                <mat-card class="module-stats-card">
                  <h3 class="section-title-inline">
                    <mat-icon>bar_chart</mat-icon> Module Statistics
                  </h3>
                  <div class="module-bars">
                    @for (mod of spiderModuleEntries; track mod[0]) {
                      <div class="module-bar-row">
                        <span class="module-name">{{ mod[0] }}</span>
                        <div class="module-bar-track">
                          <div class="module-bar-fill"
                               [style.width.%]="getModuleBarWidth(mod[1])">
                            <span class="module-bar-value">{{ mod[1] }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </mat-card>
              }

              <!-- Findings by Module -->
              @if (spiderResult.findings.length > 0) {
                <h3 class="section-heading">
                  <mat-icon>view_list</mat-icon>
                  Findings by Module
                </h3>
                @for (group of groupedFindings; track group.module) {
                  <mat-card class="findings-group-card">
                    <div class="findings-group-header">
                      <mat-icon>extension</mat-icon>
                      <span class="group-module">{{ group.module }}</span>
                      <span class="group-count">{{ group.findings.length }} findings</span>
                    </div>
                    <div class="findings-list">
                      @for (f of group.findings; track f.data + f.type) {
                        <div class="finding-item">
                          <span class="finding-severity" [class]="'severity-' + (f.severity || 'Low').toLowerCase()">
                            {{ f.severity }}
                          </span>
                          <div class="finding-details">
                            <span class="finding-type">{{ f.type }}</span>
                            <span class="finding-data mono-text">{{ f.data }}</span>
                            @if (f.source) {
                              <span class="finding-source">Source: {{ f.source }}</span>
                            }
                          </div>
                          <span class="finding-date">{{ f.foundAt | date:'short' }}</span>
                        </div>
                      }
                    </div>
                  </mat-card>
                }
              }
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    /* ═════════════════════════════════════════════
       CONTAINER & HEADER
       ═════════════════════════════════════════════ */
    :host { display: block; }

    .osint-container {
      padding: 0 24px 48px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header { margin-bottom: 20px; }

    .page-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 24px; font-weight: 700; margin: 0 0 4px;
      color: #e0e6f0;
    }
    .page-title mat-icon {
      color: #667eea; font-size: 28px; width: 28px; height: 28px;
    }

    .page-subtitle {
      margin: 0; font-size: 13px; color: #5a6b80;
      letter-spacing: 0.5px;
    }

    /* ═════════════════════════════════════════════
       TABS
       ═════════════════════════════════════════════ */
    .tab-icon {
      margin-right: 6px; font-size: 20px; width: 20px; height: 20px;
    }

    ::ng-deep .osint-tabs .mat-mdc-tab-header {
      background: #0d1117;
      border-bottom: 1px solid rgba(102,126,234,0.15);
      border-radius: 8px 8px 0 0;
    }
    ::ng-deep .osint-tabs .mat-mdc-tab:not(.mdc-tab--active) .mdc-tab__text-label {
      color: #8892a4 !important;
    }
    ::ng-deep .osint-tabs .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
      color: #667eea !important;
    }
    ::ng-deep .osint-tabs .mdc-tab-indicator__content--underline {
      border-color: #667eea !important;
    }

    .tab-body {
      padding: 20px 0;
    }

    /* ═════════════════════════════════════════════
       INPUT CARDS
       ═════════════════════════════════════════════ */
    .input-card {
      margin-bottom: 20px;
    }

    .input-row {
      display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap;
    }

    .flex-input { flex: 1; min-width: 250px; }
    .flex-input ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .select-field { width: 180px; }
    .select-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .action-btn {
      height: 56px; min-width: 160px;
      display: flex; align-items: center; gap: 8px;
      font-weight: 600; letter-spacing: 0.3px;
    }
    .action-btn mat-spinner { margin-right: 4px; }

    /* ═════════════════════════════════════════════
       ERROR BANNER
       ═════════════════════════════════════════════ */
    .error-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px; border-radius: 8px;
      background: rgba(244, 67, 54, 0.1);
      color: #ff5252;
      margin-bottom: 20px;
      font-size: 14px;
    }

    /* ═════════════════════════════════════════════
       SUMMARY CARDS (shared)
       ═════════════════════════════════════════════ */
    .breach-summary, .wayback-summary, .spider-overview {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }

    .summary-card {
      display: flex; align-items: center; gap: 14px;
      padding: 18px !important;
    }

    .summary-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
    }
    .summary-icon mat-icon {
      font-size: 26px; width: 26px; height: 26px; color: #fff;
    }

    .breach-count-card .summary-icon { background: linear-gradient(135deg, #f5576c, #ff6b6b); }
    .records-card .summary-icon { background: linear-gradient(135deg, #fa709a, #fee140); }
    .status-card .summary-icon { background: linear-gradient(135deg, #4facfe, #00f2fe); }

    .summary-value {
      font-size: 24px; font-weight: 700; color: #e0e6f0; line-height: 1.2;
    }
    .summary-label { font-size: 12px; color: #8892a4; margin-top: 2px; }

    .text-danger { color: #ff5252 !important; }
    .text-safe { color: #00e676 !important; }
    .date-val { font-size: 16px; }
    .scan-id { font-size: 13px !important; word-break: break-all; }

    .status-running { color: #ffab40 !important; }
    .status-completed, .status-complete { color: #00e676 !important; }
    .status-failed { color: #ff5252 !important; }

    /* ═════════════════════════════════════════════
       SECTION HEADINGS
       ═════════════════════════════════════════════ */
    .section-heading {
      display: flex; align-items: center; gap: 8px;
      font-size: 17px; font-weight: 600; color: #e0e6f0;
      margin: 24px 0 14px;
    }
    .section-heading mat-icon { color: #667eea; }

    .section-title-inline {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 600; color: #e0e6f0;
      margin: 0 0 14px;
    }
    .section-title-inline mat-icon { color: #667eea; font-size: 20px; width: 20px; height: 20px; }

    /* ═════════════════════════════════════════════
       SEVERITY & RISK BADGES
       ═════════════════════════════════════════════ */
    .severity-badge, .risk-badge, .finding-severity {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.5px; text-transform: uppercase;
    }

    .severity-critical, .risk-critical { background: rgba(244,67,54,0.15); color: #ff5252; }
    .severity-high, .risk-high { background: rgba(255,152,0,0.15); color: #ffab40; }
    .severity-medium, .risk-medium { background: rgba(255,235,59,0.15); color: #ffd740; }
    .severity-low, .risk-low { background: rgba(76,175,80,0.15); color: #69f0ae; }
    .severity-info, .risk-info { background: rgba(33,150,243,0.15); color: #40c4ff; }

    /* ═════════════════════════════════════════════
       MONO TEXT
       ═════════════════════════════════════════════ */
    .mono-text {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
    }

    .highlight { color: #667eea; font-weight: 600; }

    /* ═════════════════════════════════════════════
       TAB 1: EMAIL BREACH CARDS
       ═════════════════════════════════════════════ */
    .breach-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 16px;
    }

    .breach-card {
      padding: 18px !important;
      border-left: 3px solid #667eea;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .breach-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .breach-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .breach-name { font-size: 16px; font-weight: 600; color: #e0e6f0; }

    .breach-meta {
      display: flex; align-items: center; gap: 12px;
      font-size: 12px; color: #8892a4; margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .breach-date, .pwn-count { white-space: nowrap; }

    .verified-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; color: #69f0ae; margin-bottom: 8px;
    }
    .verified-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .breach-desc {
      font-size: 13px; color: #8892a4; line-height: 1.5; margin: 0 0 10px;
    }

    .data-classes { display: flex; flex-wrap: wrap; gap: 6px; }
    .data-chip {
      padding: 3px 10px; border-radius: 12px; font-size: 11px;
      background: rgba(102,126,234,0.12); color: #a0b4f0;
      border: 1px solid rgba(102,126,234,0.2);
    }

    /* ═════════════════════════════════════════════
       TAB 2: DOMAIN INTEL
       ═════════════════════════════════════════════ */
    .domain-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 16px;
    }
    .full-width { grid-column: 1 / -1; }

    .domain-section {
      padding: 20px !important;
    }

    /* Threat Gauge */
    .threat-overview {
      display: flex; align-items: center; gap: 32px; flex-wrap: wrap;
    }
    .risk-gauge { text-align: center; }
    .gauge-svg { width: 140px; height: 80px; }
    .risk-level-label {
      font-size: 14px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; margin-top: 4px;
    }

    .threat-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .threat-tag {
      padding: 5px 14px; border-radius: 16px; font-size: 12px;
      background: rgba(244,67,54,0.1); color: #ff8a80;
      border: 1px solid rgba(244,67,54,0.2);
    }

    /* Info Grids */
    .info-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-key {
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      color: #667eea; font-weight: 600;
    }
    .info-val { font-size: 13px; color: #e0e6f0; word-break: break-all; }

    /* Ports Table */
    .ports-table {
      width: 100%; border-collapse: collapse;
    }
    .ports-table th {
      text-align: left; padding: 8px 12px;
      font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
      color: #667eea; border-bottom: 1px solid rgba(102,126,234,0.15);
    }
    .ports-table td {
      padding: 8px 12px; font-size: 13px; color: #e0e6f0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .port-num { color: #ffab40; font-weight: 600; }
    .state-badge {
      padding: 2px 8px; border-radius: 8px; font-size: 11px;
      background: rgba(128,128,128,0.15); color: #8892a4;
    }
    .state-badge.open { background: rgba(76,175,80,0.15); color: #69f0ae; }

    /* Tech Chips */
    .tech-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .tech-chip {
      padding: 5px 14px; border-radius: 16px; font-size: 12px;
      background: rgba(0,212,255,0.1); color: #00d4ff;
      border: 1px solid rgba(0,212,255,0.2);
    }

    /* Subdomains */
    .subdomain-list {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 6px;
    }
    .subdomain-item {
      padding: 6px 12px; border-radius: 4px;
      background: rgba(102,126,234,0.06);
      color: #a0b4f0; font-size: 13px;
    }

    /* ═════════════════════════════════════════════
       TAB 3: GOOGLE DORKS
       ═════════════════════════════════════════════ */
    .dorks-count {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; color: #8892a4; margin-bottom: 16px;
    }
    .dorks-count mat-icon { color: #667eea; }

    .dorks-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 14px;
    }

    .dork-card {
      padding: 18px !important;
      border-left: 3px solid #667eea;
      transition: transform 0.2s;
    }
    .dork-card:hover { transform: translateY(-2px); }

    .dork-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .dork-title { font-size: 14px; font-weight: 600; color: #e0e6f0; }

    .dork-query-row {
      display: flex; align-items: center; gap: 8px;
      background: #0d1117; border-radius: 6px;
      padding: 10px 12px; margin-bottom: 10px;
      border: 1px solid rgba(102,126,234,0.12);
    }
    .dork-query {
      flex: 1; font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 12px; color: #69f0ae; word-break: break-all;
      line-height: 1.5;
    }
    .copy-btn {
      flex-shrink: 0;
    }
    .copy-btn mat-icon { font-size: 18px; width: 18px; height: 18px; color: #667eea; }

    .dork-desc {
      font-size: 12px; color: #8892a4; line-height: 1.4; margin: 0 0 8px;
    }

    .dork-category-chip {
      padding: 3px 10px; border-radius: 12px; font-size: 11px;
      background: rgba(102,126,234,0.1); color: #667eea;
    }

    /* ═════════════════════════════════════════════
       TAB 4: WAYBACK MACHINE
       ═════════════════════════════════════════════ */
    .snapshot-list {
      display: flex; flex-direction: column; gap: 8px;
    }

    .snapshot-item {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 16px; border-radius: 8px;
      background: #1a1f2e;
      border: 1px solid rgba(255,255,255,0.04);
      transition: border-color 0.2s;
    }
    .snapshot-item:hover { border-color: rgba(102,126,234,0.3); }

    .snap-date-col {
      display: flex; align-items: center; gap: 8px; flex: 1;
    }
    .snap-icon { color: #667eea; font-size: 18px; width: 18px; height: 18px; }
    .snap-date { font-size: 13px; color: #e0e6f0; }

    .status-code-badge {
      padding: 3px 10px; border-radius: 8px; font-size: 12px;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-weight: 600;
    }
    .status-2xx { background: rgba(76,175,80,0.15); color: #69f0ae; }
    .status-3xx { background: rgba(255,235,59,0.15); color: #ffd740; }
    .status-4xx { background: rgba(255,152,0,0.15); color: #ffab40; }
    .status-5xx { background: rgba(244,67,54,0.15); color: #ff5252; }

    .archive-link {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #667eea; text-decoration: none;
      white-space: nowrap;
    }
    .archive-link:hover { text-decoration: underline; color: #8c9ef0; }
    .archive-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ═════════════════════════════════════════════
       TAB 5: SPIDERFOOT SCANNER
       ═════════════════════════════════════════════ */
    .module-stats-card {
      padding: 20px !important; margin-bottom: 20px;
    }

    .module-bars { display: flex; flex-direction: column; gap: 8px; }

    .module-bar-row {
      display: flex; align-items: center; gap: 12px;
    }
    .module-name {
      min-width: 160px; font-size: 13px; color: #e0e6f0;
      font-weight: 500; text-align: right;
    }
    .module-bar-track {
      flex: 1; height: 26px; background: rgba(128,128,128,0.08);
      border-radius: 4px; overflow: hidden;
    }
    .module-bar-fill {
      height: 100%; border-radius: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 8px; min-width: 28px;
      transition: width 0.5s ease;
    }
    .module-bar-value { font-size: 11px; font-weight: 600; color: #fff; }

    /* Findings */
    .findings-group-card {
      padding: 18px !important; margin-bottom: 12px;
    }

    .findings-group-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 14px; padding-bottom: 10px;
      border-bottom: 1px solid rgba(102,126,234,0.1);
    }
    .findings-group-header mat-icon { color: #667eea; }
    .group-module { font-size: 15px; font-weight: 600; color: #e0e6f0; }
    .group-count {
      margin-left: auto; font-size: 12px; color: #8892a4;
      padding: 2px 10px; border-radius: 10px;
      background: rgba(102,126,234,0.1);
    }

    .findings-list { display: flex; flex-direction: column; gap: 6px; }

    .finding-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 14px; border-radius: 6px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
    }
    .finding-item:hover { background: rgba(102,126,234,0.04); }

    .finding-severity {
      flex-shrink: 0; margin-top: 2px; font-size: 10px;
    }

    .finding-details {
      flex: 1; display: flex; flex-direction: column; gap: 2px;
    }
    .finding-type { font-size: 12px; color: #667eea; font-weight: 500; }
    .finding-data {
      font-size: 13px; color: #e0e6f0; word-break: break-all;
    }
    .finding-source { font-size: 11px; color: #5a6b80; }

    .finding-date { font-size: 11px; color: #5a6b80; white-space: nowrap; flex-shrink: 0; }

    /* ═════════════════════════════════════════════
       RESPONSIVE
       ═════════════════════════════════════════════ */
    @media (max-width: 900px) {
      .osint-container { padding: 0 12px 32px; }
      .domain-grid { grid-template-columns: 1fr; }
      .breach-grid { grid-template-columns: 1fr; }
      .dorks-grid { grid-template-columns: 1fr; }
      .input-row { flex-direction: column; }
      .flex-input { min-width: 0; width: 100%; }
      .select-field { width: 100%; }
      .action-btn { width: 100%; }
      .module-name { min-width: 100px; font-size: 12px; }
    }

    @media (max-width: 600px) {
      .breach-summary, .wayback-summary, .spider-overview {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OsintToolsComponent {

  /* ── Tab 1: Email Intel ── */
  emailInput = '';
  emailLoading = false;
  emailResult: EmailBreachResult | null = null;
  emailError = '';

  /* ── Tab 2: Domain/IP Intel ── */
  domainInput = '';
  domainLoading = false;
  domainResult: DomainIntelResult | null = null;
  domainError = '';

  /* ── Tab 3: Google Dorks ── */
  dorksTarget = '';
  dorksCategory = 'All';
  dorksLoading = false;
  dorksResult: GoogleDorksResult | null = null;
  dorksError = '';
  copiedQuery = '';

  /* ── Tab 4: Wayback Machine ── */
  waybackUrl = '';
  waybackLoading = false;
  waybackResult: WaybackResult | null = null;
  waybackError = '';

  /* ── Tab 5: SpiderFoot ── */
  spiderTarget = '';
  spiderScanType = 'Quick';
  spiderLoading = false;
  spiderResult: SpiderFootResult | null = null;
  spiderError = '';
  spiderModuleEntries: Array<[string, number]> = [];
  groupedFindings: Array<{ module: string; findings: SpiderFinding[] }> = [];
  private maxModuleCount = 1;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  /* ════════════════════════════════════════════
     Helpers
     ════════════════════════════════════════════ */

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('ausentinel_token')
    });
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }

  onTabChange(_event: unknown): void {
    // Noop - available for future tab-switch logic
  }

  objectEntries(obj: Record<string, unknown>): Array<[string, unknown]> {
    if (!obj) return [];
    return Object.entries(obj);
  }

  formatKey(key: string): string {
    // camelCase / PascalCase → Spaced Title
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  formatDnsValue(val: unknown): string {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val ?? 'N/A');
  }

  /* ════════════════════════════════════════════
     Tab 1: Email Breach Check
     ════════════════════════════════════════════ */
  checkEmailBreach(): void {
    if (!this.emailInput.trim()) return;
    this.emailLoading = true;
    this.emailError = '';
    this.emailResult = null;
    this.cdr.markForCheck();

    this.http.post<EmailBreachResult>(
      this.apiUrl('/osint/email-breach'),
      { email: this.emailInput.trim() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: res => {
        this.emailResult = res;
        this.emailLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.emailError = err.error?.message || err.error?.error || 'Failed to check email breaches';
        this.emailLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /* ════════════════════════════════════════════
     Tab 2: Domain / IP Intel
     ════════════════════════════════════════════ */
  analyzeDomain(): void {
    if (!this.domainInput.trim()) return;
    this.domainLoading = true;
    this.domainError = '';
    this.domainResult = null;
    this.cdr.markForCheck();

    this.http.post<DomainIntelResult>(
      this.apiUrl('/osint/domain-intel'),
      { target: this.domainInput.trim() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: res => {
        this.domainResult = res;
        this.domainLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.domainError = err.error?.message || err.error?.error || 'Domain analysis failed';
        this.domainLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Gauge helpers
  getGaugeColor(score: number): string {
    if (score >= 80) return '#ff5252';
    if (score >= 60) return '#ffab40';
    if (score >= 40) return '#ffd740';
    return '#69f0ae';
  }

  getGaugeDash(score: number): string {
    // Arc length ~ 157 (half circle with r=50)
    const total = 157;
    const filled = (score / 100) * total;
    return `${filled} ${total}`;
  }

  /* ════════════════════════════════════════════
     Tab 3: Google Dorks
     ════════════════════════════════════════════ */
  generateDorks(): void {
    if (!this.dorksTarget.trim()) return;
    this.dorksLoading = true;
    this.dorksError = '';
    this.dorksResult = null;
    this.cdr.markForCheck();

    this.http.post<GoogleDorksResult>(
      this.apiUrl('/osint/google-dorks'),
      { target: this.dorksTarget.trim(), category: this.dorksCategory },
      { headers: this.getHeaders() }
    ).subscribe({
      next: res => {
        this.dorksResult = res;
        this.dorksLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.dorksError = err.error?.message || err.error?.error || 'Failed to generate dorks';
        this.dorksLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedQuery = text;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedQuery = '';
        this.cdr.markForCheck();
      }, 2000);
    });
  }

  /* ════════════════════════════════════════════
     Tab 4: Wayback Machine
     ════════════════════════════════════════════ */
  searchWayback(): void {
    if (!this.waybackUrl.trim()) return;
    this.waybackLoading = true;
    this.waybackError = '';
    this.waybackResult = null;
    this.cdr.markForCheck();

    this.http.post<WaybackResult>(
      this.apiUrl('/osint/wayback'),
      { url: this.waybackUrl.trim() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: res => {
        this.waybackResult = res;
        this.waybackLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.waybackError = err.error?.message || err.error?.error || 'Wayback Machine search failed';
        this.waybackLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getStatusClass(code: number): string {
    if (code >= 200 && code < 300) return 'status-code-badge status-2xx';
    if (code >= 300 && code < 400) return 'status-code-badge status-3xx';
    if (code >= 400 && code < 500) return 'status-code-badge status-4xx';
    return 'status-code-badge status-5xx';
  }

  /* ════════════════════════════════════════════
     Tab 5: SpiderFoot Scanner
     ════════════════════════════════════════════ */
  startSpiderScan(): void {
    if (!this.spiderTarget.trim()) return;
    this.spiderLoading = true;
    this.spiderError = '';
    this.spiderResult = null;
    this.spiderModuleEntries = [];
    this.groupedFindings = [];
    this.cdr.markForCheck();

    this.http.post<SpiderFootResult>(
      this.apiUrl('/osint/spiderfoot'),
      { target: this.spiderTarget.trim(), scanType: this.spiderScanType },
      { headers: this.getHeaders() }
    ).subscribe({
      next: res => {
        this.spiderResult = res;
        this.processSpiderResults(res);
        this.spiderLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.spiderError = err.error?.message || err.error?.error || 'SpiderFoot scan failed';
        this.spiderLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private processSpiderResults(res: SpiderFootResult): void {
    // Module stats
    if (res.moduleStats) {
      this.spiderModuleEntries = Object.entries(res.moduleStats)
        .sort((a, b) => b[1] - a[1]);
      this.maxModuleCount = Math.max(1, ...this.spiderModuleEntries.map(e => e[1]));
    }

    // Group findings by module
    const groups = new Map<string, SpiderFinding[]>();
    for (const finding of res.findings) {
      const mod = finding.module || 'Unknown';
      if (!groups.has(mod)) {
        groups.set(mod, []);
      }
      groups.get(mod)!.push(finding);
    }
    this.groupedFindings = Array.from(groups.entries())
      .map(([module, findings]) => ({ module, findings }))
      .sort((a, b) => b.findings.length - a.findings.length);
  }

  getModuleBarWidth(count: number): number {
    return Math.max(5, (count / this.maxModuleCount) * 100);
  }
}
