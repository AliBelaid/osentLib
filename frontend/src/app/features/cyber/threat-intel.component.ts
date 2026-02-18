import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';

interface ThreatFeedItem {
  id: string;
  source: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  tags: string[];
  timestamp: Date;
  affectedCountries: string[];
}

interface AptGroup {
  name: string;
  aliases: string[];
  originCountry: string;
  originFlag: string;
  targetRegions: string[];
  tactics: string[];
  isActive: boolean;
  lastSeen: string;
  threatLevel: number;
}

interface IocIndicator {
  type: 'IP' | 'Domain' | 'Hash' | 'URL';
  value: string;
  confidence: number;
  source: string;
  firstSeen: string;
  tags: string[];
}

interface BarItem {
  label: string;
  count: number;
}

@Component({
  selector: 'app-threat-intel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatChipsModule,
    MatButtonModule, MatButtonToggleModule, MatTooltipModule, MatBadgeModule,
    MatProgressBarModule, TranslateModule
  ],
  template: `
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">
        <mat-icon>policy</mat-icon>
        {{ 'cyber.threatIntel.title' | translate }}
      </h2>
      <div class="header-right">
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span class="live-text">{{ 'cyber.threatIntel.lastUpdated' | translate }}: {{ lastUpdated | date:'HH:mm:ss' }}</span>
        </div>
        <mat-button-toggle-group [(ngModel)]="selectedPeriod" class="period-toggle">
          <mat-button-toggle value="24h">24h</mat-button-toggle>
          <mat-button-toggle value="7d">7d</mat-button-toggle>
          <mat-button-toggle value="30d">30d</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <mat-card class="stat-card">
        <div class="stat-icon feeds-icon"><mat-icon>rss_feed</mat-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ totalFeeds }}</div>
          <div class="stat-label">{{ 'cyber.threatIntel.totalFeeds' | translate }}</div>
        </div>
      </mat-card>
      <mat-card class="stat-card">
        <div class="stat-icon apt-icon"><mat-icon>groups</mat-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ activeAptCount }}</div>
          <div class="stat-label">{{ 'cyber.threatIntel.activeApts' | translate }}</div>
        </div>
      </mat-card>
      <mat-card class="stat-card">
        <div class="stat-icon ioc-icon"><mat-icon>bug_report</mat-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ iocIndicators.length }}</div>
          <div class="stat-label">{{ 'cyber.threatIntel.iocsDetected' | translate }}</div>
        </div>
      </mat-card>
      <mat-card class="stat-card">
        <div class="stat-icon critical-icon"><mat-icon>crisis_alert</mat-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ criticalCount }}</div>
          <div class="stat-label">{{ 'cyber.threatIntel.criticalAlerts' | translate }}</div>
        </div>
      </mat-card>
    </div>

    <!-- Feed + APT Groups Row -->
    <div class="main-row">
      <!-- Live Threat Feed -->
      <mat-card class="feed-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>dynamic_feed</mat-icon>
            {{ 'cyber.threatIntel.liveFeed' | translate }}
            <span class="feed-count">{{ threatFeeds.length }}</span>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="feed-list">
            @for (item of threatFeeds; track item.id) {
              <div class="feed-item" [class]="'feed-severity-' + item.severity">
                <div class="feed-severity-dot" [class]="'dot-' + item.severity"></div>
                <div class="feed-body">
                  <div class="feed-title">{{ item.title }}</div>
                  <div class="feed-meta">
                    <span class="feed-source">{{ item.source }}</span>
                    <span class="feed-time">{{ getRelativeTime(item.timestamp) }}</span>
                  </div>
                  <div class="feed-tags">
                    @for (tag of item.tags; track tag) {
                      <mat-chip class="feed-tag">{{ tag }}</mat-chip>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- APT Groups -->
      <mat-card class="apt-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>groups</mat-icon>
            {{ 'cyber.threatIntel.aptGroups' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="apt-list">
            @for (apt of aptGroups; track apt.name) {
              <div class="apt-item">
                <div class="apt-header">
                  <div class="apt-name-row">
                    <span class="apt-name">{{ apt.name }}</span>
                    <span class="apt-status" [class.active]="apt.isActive" [class.dormant]="!apt.isActive">
                      {{ apt.isActive ? ('cyber.threatIntel.active' | translate) : ('cyber.threatIntel.dormant' | translate) }}
                    </span>
                  </div>
                  <div class="apt-origin">
                    <span class="apt-flag">{{ apt.originFlag }}</span>
                    <span>{{ apt.originCountry }}</span>
                  </div>
                </div>
                <div class="apt-targets">
                  @for (region of apt.targetRegions; track region) {
                    <mat-chip class="region-chip">{{ region }}</mat-chip>
                  }
                </div>
                <div class="apt-tactics">
                  <div class="tactics-bar">
                    @for (tactic of apt.tactics; track tactic) {
                      <span class="tactic-segment" [matTooltip]="tactic">{{ tactic.substring(0, 3) }}</span>
                    }
                  </div>
                </div>
                <div class="apt-footer">
                  <span class="apt-aliases">{{ apt.aliases.join(', ') }}</span>
                  <span class="apt-last-seen">{{ apt.lastSeen }}</span>
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <!-- Attack Vectors -->
      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>security</mat-icon>
            {{ 'cyber.threatIntel.attackVectors' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @for (item of attackVectors; track item.label) {
            <div class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <div class="bar-fill vector-bar" [style.width.%]="getBarWidth(item.count, maxVectorCount)">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Target Sectors -->
      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>business</mat-icon>
            {{ 'cyber.threatIntel.targetSectors' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @for (item of targetSectors; track item.label) {
            <div class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <div class="bar-fill sector-bar" [style.width.%]="getBarWidth(item.count, maxSectorCount)">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>

    <!-- IOC Table -->
    <mat-card class="ioc-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>fingerprint</mat-icon>
          {{ 'cyber.threatIntel.iocIndicators' | translate }}
          <span class="feed-count">{{ iocIndicators.length }}</span>
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="ioc-table">
          <div class="ioc-header-row">
            <span class="ioc-col-type">{{ 'cyber.threatIntel.type' | translate }}</span>
            <span class="ioc-col-value">{{ 'cyber.threatIntel.value' | translate }}</span>
            <span class="ioc-col-confidence">{{ 'cyber.threatIntel.confidence' | translate }}</span>
            <span class="ioc-col-source">{{ 'cyber.threatIntel.source' | translate }}</span>
            <span class="ioc-col-seen">{{ 'cyber.threatIntel.firstSeen' | translate }}</span>
            <span class="ioc-col-tags">{{ 'cyber.threatIntel.tags' | translate }}</span>
          </div>
          @for (ioc of iocIndicators; track ioc.value) {
            <div class="ioc-row" [class]="'confidence-' + getConfidenceClass(ioc.confidence)">
              <span class="ioc-col-type">
                <span class="ioc-type-badge" [class]="'type-' + ioc.type.toLowerCase()">{{ ioc.type }}</span>
              </span>
              <span class="ioc-col-value ioc-value">{{ ioc.value }}</span>
              <span class="ioc-col-confidence">
                <div class="confidence-bar-track">
                  <div class="confidence-bar-fill" [style.width.%]="ioc.confidence"
                       [class]="'conf-' + getConfidenceClass(ioc.confidence)"></div>
                </div>
                <span class="confidence-text">{{ ioc.confidence }}%</span>
              </span>
              <span class="ioc-col-source">{{ ioc.source }}</span>
              <span class="ioc-col-seen">{{ ioc.firstSeen }}</span>
              <span class="ioc-col-tags">
                @for (tag of ioc.tags; track tag) {
                  <mat-chip class="ioc-tag">{{ tag }}</mat-chip>
                }
              </span>
            </div>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    :host { display: block; padding: 0 16px 32px; }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
    }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 24px; font-weight: 600; margin: 0;
    }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .live-indicator {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 20px;
      background: rgba(0, 230, 118, 0.08);
      border: 1px solid rgba(0, 230, 118, 0.2);
    }
    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .live-text { font-size: 12px; color: #00e676; font-weight: 500; }
    .period-toggle { height: 36px; }

    /* Stats */
    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;
    }
    .stat-card {
      display: flex; flex-direction: row; align-items: center; gap: 16px;
      padding: 20px !important;
    }
    .stat-icon {
      width: 52px; height: 52px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: #fff; }
    .feeds-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
    .apt-icon { background: linear-gradient(135deg, #f5576c, #ff6b6b); }
    .ioc-icon { background: linear-gradient(135deg, #4facfe, #00f2fe); }
    .critical-icon { background: linear-gradient(135deg, #ff9a44, #fc6076); }
    .stat-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
    .stat-label { font-size: 13px; opacity: 0.7; }

    /* Main Row */
    .main-row {
      display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 20px;
    }

    /* Feed Card */
    .feed-card mat-card-title,
    .apt-card mat-card-title,
    .chart-card mat-card-title,
    .ioc-card mat-card-title {
      display: flex; align-items: center; gap: 6px; font-size: 16px;
    }
    .feed-count {
      margin-left: auto; font-size: 12px; font-weight: 600;
      background: rgba(102, 126, 234, 0.15); color: #667eea;
      padding: 2px 10px; border-radius: 12px;
    }
    .feed-list { max-height: 420px; overflow-y: auto; }
    .feed-item {
      display: flex; gap: 12px; padding: 12px; margin: 4px 0;
      border-radius: 8px; border-left: 3px solid transparent;
      transition: background 0.2s;
    }
    .feed-item:hover { background: rgba(102, 126, 234, 0.04); }
    .feed-severity-critical { border-left-color: #ff1744; }
    .feed-severity-high { border-left-color: #f44336; }
    .feed-severity-medium { border-left-color: #ff9100; }
    .feed-severity-low { border-left-color: #00e676; }
    .feed-severity-dot {
      width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0;
    }
    .dot-critical { background: #ff1744; box-shadow: 0 0 8px rgba(255, 23, 68, 0.5); animation: pulse 1.5s infinite; }
    .dot-high { background: #f44336; box-shadow: 0 0 6px rgba(244, 67, 54, 0.4); }
    .dot-medium { background: #ff9100; }
    .dot-low { background: #00e676; }
    .feed-body { flex: 1; min-width: 0; }
    .feed-title { font-size: 13px; font-weight: 500; line-height: 1.4; margin-bottom: 4px; }
    .feed-meta { display: flex; gap: 8px; font-size: 11px; opacity: 0.6; margin-bottom: 6px; }
    .feed-source { font-weight: 600; color: #667eea; opacity: 1; }
    .feed-tags { display: flex; gap: 4px; flex-wrap: wrap; }
    .feed-tag {
      font-size: 10px !important; height: 20px !important;
      padding: 0 8px !important; min-height: 20px !important;
    }

    /* APT Card */
    .apt-list { max-height: 420px; overflow-y: auto; }
    .apt-item {
      padding: 12px; margin: 4px 0; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.04);
      transition: all 0.2s;
    }
    .apt-item:hover { border-color: rgba(102, 126, 234, 0.2); background: rgba(102, 126, 234, 0.03); }
    .apt-header { margin-bottom: 8px; }
    .apt-name-row { display: flex; align-items: center; justify-content: space-between; }
    .apt-name { font-weight: 700; font-size: 14px; color: #ff6b6b; }
    .apt-status {
      font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
      padding: 2px 8px; border-radius: 4px;
    }
    .apt-status.active { background: rgba(0, 230, 118, 0.1); color: #00e676; }
    .apt-status.dormant { background: rgba(136, 146, 164, 0.1); color: var(--text-secondary); }
    .apt-origin { display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: 0.7; margin-top: 2px; }
    .apt-flag { font-size: 14px; }
    .apt-targets { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
    .region-chip {
      font-size: 10px !important; height: 20px !important;
      padding: 0 8px !important; min-height: 20px !important;
      background: rgba(0, 212, 255, 0.1) !important; color: #00d4ff !important;
      border-color: rgba(0, 212, 255, 0.2) !important;
    }
    .apt-tactics { margin-bottom: 6px; }
    .tactics-bar { display: flex; gap: 2px; }
    .tactic-segment {
      flex: 1; text-align: center; font-size: 9px; font-weight: 600;
      padding: 3px 2px; border-radius: 3px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
      color: #b388ff; letter-spacing: 0.5px; cursor: help;
    }
    .apt-footer { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.5; }
    .apt-aliases { font-style: italic; }

    /* Charts */
    .charts-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;
    }
    .bar-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    .bar-label { min-width: 120px; font-size: 13px; font-weight: 500; }
    .bar-track {
      flex: 1; height: 26px; background: rgba(128,128,128,0.1);
      border-radius: 4px; overflow: hidden;
    }
    .bar-fill {
      height: 100%; border-radius: 4px; min-width: 28px;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 8px; transition: width 0.6s ease;
    }
    .bar-value { font-size: 11px; font-weight: 600; color: #fff; }
    .vector-bar { background: linear-gradient(90deg, #f5576c, #ff6b6b); }
    .sector-bar { background: linear-gradient(90deg, #667eea, #764ba2); }

    /* IOC Table */
    .ioc-card { margin-bottom: 20px; }
    .ioc-table { overflow-x: auto; }
    .ioc-header-row, .ioc-row {
      display: grid;
      grid-template-columns: 80px 1fr 140px 120px 100px 1fr;
      gap: 12px; padding: 10px 12px; align-items: center;
    }
    .ioc-header-row {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1px; opacity: 0.5; border-bottom: 1px solid var(--border-default);
    }
    .ioc-row {
      font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
      transition: background 0.2s;
    }
    .ioc-row:hover { background: rgba(102, 126, 234, 0.04); }
    .ioc-value {
      font-family: 'Consolas', 'Fira Code', monospace; font-size: 11px;
      color: #00d4ff; word-break: break-all;
    }
    .ioc-type-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 4px; letter-spacing: 0.5px;
    }
    .type-ip { background: rgba(102, 126, 234, 0.15); color: #667eea; }
    .type-domain { background: rgba(0, 212, 255, 0.15); color: #00d4ff; }
    .type-hash { background: rgba(179, 136, 255, 0.15); color: #b388ff; }
    .type-url { background: rgba(255, 145, 0, 0.15); color: #ff9100; }
    .confidence-bar-track {
      width: 60px; height: 6px; background: rgba(128,128,128,0.15);
      border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;
    }
    .confidence-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
    .conf-high { background: #00e676; }
    .conf-medium { background: #ff9100; }
    .conf-low { background: #f44336; }
    .confidence-text { font-size: 11px; font-weight: 600; margin-left: 6px; }
    .ioc-col-confidence { display: flex; align-items: center; }
    .ioc-tag {
      font-size: 9px !important; height: 18px !important;
      padding: 0 6px !important; min-height: 18px !important;
    }
    .ioc-col-tags { display: flex; gap: 3px; flex-wrap: wrap; }
    .ioc-col-seen { font-size: 11px; opacity: 0.6; }

    @media (max-width: 1100px) {
      .main-row { grid-template-columns: 1fr; }
      .charts-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .ioc-header-row, .ioc-row {
        grid-template-columns: 70px 1fr 100px 100px;
      }
      .ioc-col-seen, .ioc-col-tags { display: none; }
    }
    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class ThreatIntelComponent implements OnInit, OnDestroy {
  threatFeeds: ThreatFeedItem[] = [];
  aptGroups: AptGroup[] = [];
  iocIndicators: IocIndicator[] = [];
  attackVectors: BarItem[] = [];
  targetSectors: BarItem[] = [];

  selectedPeriod = '24h';
  lastUpdated = new Date();
  totalFeeds = 0;
  activeAptCount = 0;
  criticalCount = 0;

  maxVectorCount = 1;
  maxSectorCount = 1;

  private refreshInterval: any;

  ngOnInit() {
    this.generateMockData();
    this.refreshInterval = setInterval(() => {
      this.lastUpdated = new Date();
      this.addNewThreatFeed();
    }, 6000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  private generateMockData() {
    this.threatFeeds = this.generateFeeds();
    this.aptGroups = this.generateAptGroups();
    this.iocIndicators = this.generateIocs();
    this.attackVectors = [
      { label: 'Ransomware', count: 342 },
      { label: 'Phishing', count: 589 },
      { label: 'DDoS', count: 267 },
      { label: 'Supply Chain', count: 128 },
      { label: 'Malware', count: 445 },
      { label: 'Zero-Day', count: 67 },
      { label: 'BEC', count: 198 },
      { label: 'Credential Theft', count: 312 }
    ];
    this.targetSectors = [
      { label: 'Government', count: 487 },
      { label: 'Finance', count: 392 },
      { label: 'Telecom', count: 334 },
      { label: 'Energy', count: 245 },
      { label: 'Healthcare', count: 189 },
      { label: 'Education', count: 156 },
      { label: 'Transport', count: 123 },
      { label: 'Agriculture', count: 87 }
    ];

    this.totalFeeds = this.threatFeeds.length;
    this.activeAptCount = this.aptGroups.filter(a => a.isActive).length;
    this.criticalCount = this.threatFeeds.filter(f => f.severity === 'critical').length;
    this.maxVectorCount = Math.max(1, ...this.attackVectors.map(v => v.count));
    this.maxSectorCount = Math.max(1, ...this.targetSectors.map(s => s.count));
  }

  private generateFeeds(): ThreatFeedItem[] {
    const sources = ['AU-CERT', 'AfricaCERT', 'MISP-Africa', 'OTX AlienVault', 'VirusTotal', 'Mandiant', 'CrowdStrike', 'Recorded Future'];
    const titles = [
      'New ransomware variant targeting West African banking sector',
      'Phishing campaign impersonating AU Commission detected',
      'Critical vulnerability in widely-used telecom infrastructure',
      'DDoS attacks surge against government portals in East Africa',
      'Supply chain compromise found in regional logistics software',
      'APT group deploying new backdoor in Nigerian energy sector',
      'Credential harvesting operation targeting diplomatic emails',
      'Malware-laced documents distributed via social media in Sahel region',
      'Zero-day exploit targeting mobile banking platforms in Kenya',
      'Business email compromise ring targeting South African corporates',
      'Critical infrastructure SCADA systems exposed in North Africa',
      'Watering hole attack targeting African Union staff portals',
      'New botnet recruiting IoT devices across Sub-Saharan Africa',
      'Data breach at East African telecommunications provider',
      'Cryptocurrency mining malware spreading via cracked software in West Africa',
      'Spyware campaign targeting civil society organizations in Central Africa',
      'DNS hijacking attacks redirecting traffic from African domains',
      'Social engineering attacks on African banking SWIFT systems',
      'Critical patch required for widely deployed African e-government platform',
      'Insider threat detected at Southern African data center'
    ];
    const severities: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];
    const categories = ['Ransomware', 'Phishing', 'DDoS', 'Malware', 'Supply Chain', 'Zero-Day', 'BEC', 'APT'];
    const tags = ['Ransomware', 'Phishing', 'C2', 'Exfiltration', 'Lateral Movement', 'Persistence', 'Exploitation', 'Recon', 'Credential Access', 'DDoS'];

    return titles.map((title, i) => ({
      id: `TF-${1000 + i}`,
      source: sources[i % sources.length],
      title,
      severity: severities[Math.floor(Math.random() * 4)],
      category: categories[i % categories.length],
      tags: [tags[i % tags.length], tags[(i + 3) % tags.length]],
      timestamp: new Date(Date.now() - Math.random() * 86400000),
      affectedCountries: ['NG', 'KE', 'ZA', 'EG', 'ET'].slice(0, Math.floor(Math.random() * 3) + 1)
    }));
  }

  private generateAptGroups(): AptGroup[] {
    return [
      {
        name: 'SilverTerrier', aliases: ['SilverTerrier', 'TMT'], originCountry: 'Nigeria', originFlag: '\u{1F1F3}\u{1F1EC}',
        targetRegions: ['West Africa', 'Global'], tactics: ['Phishing', 'BEC', 'Fraud', 'Social Engineering'],
        isActive: true, lastSeen: '2 days ago', threatLevel: 4
      },
      {
        name: 'APT28', aliases: ['Fancy Bear', 'Sofacy'], originCountry: 'Russia', originFlag: '\u{1F1F7}\u{1F1FA}',
        targetRegions: ['North Africa', 'East Africa'], tactics: ['Spearphishing', 'Zero-Day', 'C2', 'Exfiltration'],
        isActive: true, lastSeen: '5 days ago', threatLevel: 5
      },
      {
        name: 'Lazarus Group', aliases: ['Hidden Cobra', 'ZINC'], originCountry: 'North Korea', originFlag: '\u{1F1F0}\u{1F1F5}',
        targetRegions: ['Southern Africa', 'East Africa'], tactics: ['Malware', 'Ransomware', 'Supply Chain', 'Cryptocurrency'],
        isActive: true, lastSeen: '1 day ago', threatLevel: 5
      },
      {
        name: 'MuddyWater', aliases: ['MERCURY', 'Static Kitten'], originCountry: 'Iran', originFlag: '\u{1F1EE}\u{1F1F7}',
        targetRegions: ['North Africa', 'East Africa'], tactics: ['Spearphishing', 'PowerShell', 'Backdoor', 'Tunneling'],
        isActive: true, lastSeen: '1 week ago', threatLevel: 4
      },
      {
        name: 'GALLIUM', aliases: ['Granite Typhoon'], originCountry: 'China', originFlag: '\u{1F1E8}\u{1F1F3}',
        targetRegions: ['Southern Africa', 'Central Africa'], tactics: ['Web Shell', 'Lateral Movement', 'Credential Theft', 'Persistence'],
        isActive: true, lastSeen: '3 days ago', threatLevel: 4
      },
      {
        name: 'Sandworm', aliases: ['Voodoo Bear', 'IRIDIUM'], originCountry: 'Russia', originFlag: '\u{1F1F7}\u{1F1FA}',
        targetRegions: ['North Africa'], tactics: ['Wiper', 'ICS/SCADA', 'Destructive', 'Supply Chain'],
        isActive: false, lastSeen: '2 months ago', threatLevel: 5
      },
      {
        name: 'Scattered Spider', aliases: ['UNC3944', 'Roasted 0ktapus'], originCountry: 'International', originFlag: '\u{1F310}',
        targetRegions: ['Southern Africa', 'West Africa'], tactics: ['SIM Swap', 'Social Engineering', 'MFA Bypass', 'Cloud'],
        isActive: true, lastSeen: '4 days ago', threatLevel: 3
      },
      {
        name: 'Charming Kitten', aliases: ['APT35', 'Phosphorus'], originCountry: 'Iran', originFlag: '\u{1F1EE}\u{1F1F7}',
        targetRegions: ['North Africa', 'East Africa'], tactics: ['Credential Harvest', 'Impersonation', 'Malware', 'Phishing'],
        isActive: false, lastSeen: '3 weeks ago', threatLevel: 3
      }
    ];
  }

  private generateIocs(): IocIndicator[] {
    return [
      { type: 'IP', value: '185.220.101.34', confidence: 95, source: 'AU-CERT', firstSeen: '2h ago', tags: ['C2', 'APT28'] },
      { type: 'Domain', value: 'au-commission-portal.click', confidence: 92, source: 'MISP-Africa', firstSeen: '4h ago', tags: ['Phishing'] },
      { type: 'Hash', value: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5', confidence: 88, source: 'VirusTotal', firstSeen: '6h ago', tags: ['Ransomware'] },
      { type: 'URL', value: 'hxxps://login-au[.]org/verify', confidence: 97, source: 'OTX', firstSeen: '1h ago', tags: ['Credential Harvest'] },
      { type: 'IP', value: '91.234.56.78', confidence: 78, source: 'CrowdStrike', firstSeen: '12h ago', tags: ['Botnet', 'DDoS'] },
      { type: 'Domain', value: 'afdb-secure-update.info', confidence: 85, source: 'AfricaCERT', firstSeen: '8h ago', tags: ['Supply Chain'] },
      { type: 'Hash', value: 'e7d8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', confidence: 91, source: 'Mandiant', firstSeen: '3h ago', tags: ['Lazarus', 'Malware'] },
      { type: 'IP', value: '203.0.113.42', confidence: 72, source: 'Recorded Future', firstSeen: '1d ago', tags: ['Scanner'] },
      { type: 'Domain', value: 'ecobank-verification.xyz', confidence: 94, source: 'AU-CERT', firstSeen: '5h ago', tags: ['BEC', 'Phishing'] },
      { type: 'URL', value: 'hxxps://swift-africa[.]net/update.exe', confidence: 99, source: 'Mandiant', firstSeen: '30m ago', tags: ['Malware', 'Banking'] },
      { type: 'Hash', value: 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9', confidence: 65, source: 'VirusTotal', firstSeen: '2d ago', tags: ['PUP'] },
      { type: 'IP', value: '45.33.32.156', confidence: 82, source: 'OTX', firstSeen: '10h ago', tags: ['Exfiltration'] }
    ];
  }

  addNewThreatFeed() {
    const sources = ['AU-CERT', 'AfricaCERT', 'MISP-Africa', 'OTX AlienVault'];
    const titles = [
      'New phishing kit targeting African mobile banking users',
      'Suspicious DNS queries from government network detected',
      'Malware beacon traffic identified from East African ISP',
      'Credential dump containing African diplomatic accounts found on dark web'
    ];
    const severities: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];
    const tags = ['Phishing', 'DNS', 'Malware', 'Credential Theft', 'APT', 'Botnet'];

    const newItem: ThreatFeedItem = {
      id: `TF-${2000 + this.threatFeeds.length}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      title: titles[Math.floor(Math.random() * titles.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      category: 'Mixed',
      tags: [tags[Math.floor(Math.random() * tags.length)], tags[Math.floor(Math.random() * tags.length)]],
      timestamp: new Date(),
      affectedCountries: ['NG']
    };

    this.threatFeeds = [newItem, ...this.threatFeeds.slice(0, 49)];
    this.totalFeeds = this.threatFeeds.length;
    this.criticalCount = this.threatFeeds.filter(f => f.severity === 'critical').length;
  }

  getBarWidth(value: number, max: number): number {
    return max > 0 ? Math.max(5, (value / max) * 100) : 5;
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 85) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  getRelativeTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
