import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

interface CountryProfile {
  code: string; name: string; flag: string; region: string;
  riskLevel: string; readinessScore: number;
  networkScore: number; incidentResponseScore: number; legislationScore: number;
  certMaturity: string; connectivityIndex: number; cybercrimeIndex: number;
  incidents: { title: string; date: string; severity: string; category: string; desc: string }[];
  topThreats: { type: string; count: number }[];
  aptGroups: string[];
  criticalSectors: string[];
}

@Component({
  selector: 'app-country-intel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatChipsModule,
    MatButtonModule, MatSelectModule, MatFormFieldModule, MatProgressBarModule,
    MatTooltipModule, TranslateModule
  ],
  template: `
    <div class="page-header">
      <h2 class="page-title">
        <mat-icon>flag</mat-icon>
        {{ 'cyber.countryIntel.title' | translate }}
      </h2>
      <mat-form-field appearance="outline" class="country-select">
        <mat-label>{{ 'cyber.countryIntel.selectCountry' | translate }}</mat-label>
        <mat-select [(ngModel)]="selectedCode" (selectionChange)="selectCountry($event.value)">
          @for (c of allCountries; track c.code) {
            <mat-option [value]="c.code">{{ c.flag }} {{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (selected) {
      <!-- Country Overview -->
      <mat-card class="overview-card">
        <div class="overview-left">
          <span class="country-flag-big">{{ selected.flag }}</span>
          <div>
            <h3 class="country-name">{{ selected.name }}</h3>
            <mat-chip class="region-tag">{{ selected.region }}</mat-chip>
          </div>
        </div>
        <div class="overview-center">
          <div class="gauge-circle" [style]="'--pct:' + (selected.readinessScore * 3.6) + 'deg'">
            <div class="gauge-inner">
              <span class="gauge-val">{{ selected.readinessScore }}</span>
              <span class="gauge-unit">/100</span>
            </div>
          </div>
          <div class="gauge-label">{{ 'cyber.countryIntel.readinessScore' | translate }}</div>
        </div>
        <div class="overview-right">
          <div class="risk-badge" [class]="'risk-' + selected.riskLevel">
            {{ selected.riskLevel | uppercase }}
          </div>
          <div class="risk-label">{{ 'cyber.countryIntel.riskLevel' | translate }}</div>
        </div>
      </mat-card>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <mat-card class="metric-card">
          <div class="m-gauge" [style]="'--pct:' + (selected.networkScore * 3.6) + 'deg'">
            <div class="m-inner"><span>{{ selected.networkScore }}</span></div>
          </div>
          <div class="m-label">{{ 'cyber.countryIntel.networkInfra' | translate }}</div>
        </mat-card>
        <mat-card class="metric-card">
          <div class="m-gauge ir-gauge" [style]="'--pct:' + (selected.incidentResponseScore * 3.6) + 'deg'">
            <div class="m-inner"><span>{{ selected.incidentResponseScore }}</span></div>
          </div>
          <div class="m-label">{{ 'cyber.countryIntel.incidentResponse' | translate }}</div>
        </mat-card>
        <mat-card class="metric-card">
          <div class="m-gauge lg-gauge" [style]="'--pct:' + (selected.legislationScore * 3.6) + 'deg'">
            <div class="m-inner"><span>{{ selected.legislationScore }}</span></div>
          </div>
          <div class="m-label">{{ 'cyber.countryIntel.legislation' | translate }}</div>
        </mat-card>
        <mat-card class="metric-card cert-card">
          <mat-icon class="cert-icon">verified_user</mat-icon>
          <div class="cert-level" [class]="'cert-' + selected.certMaturity">{{ selected.certMaturity | uppercase }}</div>
          <div class="m-label">{{ 'cyber.countryIntel.certMaturity' | translate }}</div>
        </mat-card>
        <mat-card class="metric-card">
          <div class="m-gauge cn-gauge" [style]="'--pct:' + (selected.connectivityIndex * 3.6) + 'deg'">
            <div class="m-inner"><span>{{ selected.connectivityIndex }}</span></div>
          </div>
          <div class="m-label">{{ 'cyber.countryIntel.connectivity' | translate }}</div>
        </mat-card>
        <mat-card class="metric-card">
          <div class="m-gauge cc-gauge" [style]="'--pct:' + (selected.cybercrimeIndex * 3.6) + 'deg'">
            <div class="m-inner"><span>{{ selected.cybercrimeIndex }}</span></div>
          </div>
          <div class="m-label">{{ 'cyber.countryIntel.cybercrimeIndex' | translate }}</div>
        </mat-card>
      </div>

      <!-- Bottom Row -->
      <div class="bottom-row">
        <!-- Recent Incidents -->
        <mat-card class="incidents-card">
          <mat-card-header>
            <mat-card-title class="section-hdr"><mat-icon>history</mat-icon> {{ 'cyber.countryIntel.recentIncidents' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="timeline">
              @for (inc of selected.incidents; track inc.title) {
                <div class="tl-item">
                  <div class="tl-marker">
                    <div class="tl-dot" [class]="'dot-' + inc.severity"></div>
                    @if (!$last) { <div class="tl-line"></div> }
                  </div>
                  <div class="tl-body">
                    <div class="tl-date">{{ inc.date }}</div>
                    <div class="tl-title">{{ inc.title }}</div>
                    <div class="tl-meta">
                      <span class="sev-badge" [class]="'sev-' + inc.severity">{{ inc.severity }}</span>
                      <mat-chip class="tl-cat">{{ inc.category }}</mat-chip>
                    </div>
                    <div class="tl-desc">{{ inc.desc }}</div>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Threat Landscape -->
        <mat-card class="threats-card">
          <mat-card-header>
            <mat-card-title class="section-hdr"><mat-icon>radar</mat-icon> {{ 'cyber.countryIntel.threatLandscape' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h4 class="sub-title">{{ 'cyber.countryIntel.topThreats' | translate }}</h4>
            @for (t of selected.topThreats; track t.type) {
              <div class="bar-row">
                <span class="bar-label">{{ t.type }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="getBarW(t.count, maxThreat)">
                    <span class="bar-value">{{ t.count }}</span>
                  </div>
                </div>
              </div>
            }
            <h4 class="sub-title mt">{{ 'cyber.countryIntel.activeApts' | translate }}</h4>
            <div class="apt-tags">
              @for (a of selected.aptGroups; track a) {
                <mat-chip class="apt-chip">{{ a }}</mat-chip>
              }
            </div>
            <h4 class="sub-title mt">{{ 'cyber.countryIntel.criticalSectors' | translate }}</h4>
            <div class="sector-list">
              @for (s of selected.criticalSectors; track s) {
                <div class="sector-item"><mat-icon class="sm-icon">warning</mat-icon> {{ s }}</div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Regional Comparison -->
      <mat-card class="comparison-card">
        <mat-card-header>
          <mat-card-title class="section-hdr"><mat-icon>compare</mat-icon> {{ 'cyber.countryIntel.regionalComparison' | translate }} - {{ selected.region }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="comp-table">
            <div class="comp-header">
              <span class="comp-col-country">{{ 'cyber.countryIntel.country' | translate }}</span>
              <span class="comp-col">{{ 'cyber.countryIntel.riskScore' | translate }}</span>
              <span class="comp-col">{{ 'cyber.countryIntel.incidents30d' | translate }}</span>
              <span class="comp-col">{{ 'cyber.countryIntel.certStatus' | translate }}</span>
              <span class="comp-col">{{ 'cyber.countryIntel.readinessScore' | translate }}</span>
            </div>
            @for (c of regionalCountries; track c.code) {
              <div class="comp-row" [class.comp-selected]="c.code === selected.code">
                <span class="comp-col-country">{{ c.flag }} {{ c.name }}</span>
                <span class="comp-col"><span class="risk-dot" [class]="'risk-' + getRiskClass(c.readinessScore)"></span> {{ 100 - c.readinessScore }}</span>
                <span class="comp-col">{{ c.incidentResponseScore }}</span>
                <span class="comp-col"><span class="cert-pill" [class]="'cert-' + c.certMaturity">{{ c.certMaturity }}</span></span>
                <span class="comp-col">
                  <div class="mini-bar-track">
                    <div class="mini-bar-fill" [style.width.%]="c.readinessScore"></div>
                  </div>
                  {{ c.readinessScore }}
                </span>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    :host { display: block; padding: 0 16px 32px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .page-title { display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 600; margin: 0; }
    .country-select { width: 280px; }
    .country-select ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    /* Overview */
    .overview-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 24px 32px !important; margin-bottom: 20px; flex-wrap: wrap; gap: 20px;
    }
    .overview-left { display: flex; align-items: center; gap: 16px; }
    .country-flag-big { font-size: 48px; }
    .country-name { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
    .region-tag { font-size: 11px !important; height: 22px !important; min-height: 22px !important; }
    .overview-center { text-align: center; }
    .gauge-circle {
      width: 110px; height: 110px; border-radius: 50%; margin: 0 auto 8px;
      background: conic-gradient(#667eea var(--pct), rgba(255,255,255,0.06) 0deg);
      display: flex; align-items: center; justify-content: center;
    }
    .gauge-inner {
      width: 88px; height: 88px; border-radius: 50%; background: #1a1f2e;
      display: flex; align-items: center; justify-content: center; gap: 2px;
    }
    .gauge-val { font-size: 28px; font-weight: 700; }
    .gauge-unit { font-size: 13px; opacity: 0.4; }
    .gauge-label { font-size: 12px; font-weight: 500; opacity: 0.7; }
    .overview-right { text-align: center; }
    .risk-badge {
      font-size: 14px; font-weight: 700; padding: 8px 20px; border-radius: 8px;
      letter-spacing: 1px; margin-bottom: 4px;
    }
    .risk-critical { background: rgba(255,23,68,0.15); color: #ff1744; border: 1px solid rgba(255,23,68,0.3); }
    .risk-high { background: rgba(244,67,54,0.15); color: #f44336; border: 1px solid rgba(244,67,54,0.3); }
    .risk-medium { background: rgba(255,145,0,0.15); color: #ff9100; border: 1px solid rgba(255,145,0,0.3); }
    .risk-low { background: rgba(0,230,118,0.15); color: #00e676; border: 1px solid rgba(0,230,118,0.3); }
    .risk-label { font-size: 11px; opacity: 0.6; }

    /* Metrics */
    .metrics-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 20px; }
    .metric-card { display: flex; flex-direction: column; align-items: center; padding: 20px 12px !important; }
    .m-gauge {
      width: 80px; height: 80px; border-radius: 50%; margin-bottom: 8px;
      background: conic-gradient(#667eea var(--pct), rgba(255,255,255,0.06) 0deg);
      display: flex; align-items: center; justify-content: center;
    }
    .ir-gauge { background: conic-gradient(#00d4ff var(--pct), rgba(255,255,255,0.06) 0deg); }
    .lg-gauge { background: conic-gradient(#b388ff var(--pct), rgba(255,255,255,0.06) 0deg); }
    .cn-gauge { background: conic-gradient(#00e676 var(--pct), rgba(255,255,255,0.06) 0deg); }
    .cc-gauge { background: conic-gradient(#ff1744 var(--pct), rgba(255,255,255,0.06) 0deg); }
    .m-inner {
      width: 62px; height: 62px; border-radius: 50%; background: #1a1f2e;
      display: flex; align-items: center; justify-content: center;
    }
    .m-inner span { font-size: 18px; font-weight: 700; }
    .m-label { font-size: 11px; font-weight: 500; opacity: 0.7; text-align: center; }
    .cert-card { justify-content: center; gap: 6px; }
    .cert-icon { font-size: 36px; width: 36px; height: 36px; color: #667eea; }
    .cert-level { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
    .cert-advanced { color: #00e676; }
    .cert-operational { color: #667eea; }
    .cert-developing { color: #ff9100; }
    .cert-nascent { color: #f44336; }

    /* Bottom Row */
    .bottom-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 20px; }
    .section-hdr { display: flex; align-items: center; gap: 6px; font-size: 15px; }

    /* Timeline */
    .timeline { padding-left: 4px; }
    .tl-item { display: flex; gap: 12px; }
    .tl-marker { display: flex; flex-direction: column; align-items: center; width: 16px; }
    .tl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot-critical { background: #ff1744; box-shadow: 0 0 6px rgba(255,23,68,0.4); }
    .dot-high { background: #f44336; }
    .dot-medium { background: #ff9100; }
    .dot-low { background: #00e676; }
    .tl-line { width: 2px; flex: 1; background: rgba(255,255,255,0.06); min-height: 20px; }
    .tl-body { flex: 1; padding-bottom: 14px; }
    .tl-date { font-size: 10px; opacity: 0.4; margin-bottom: 2px; }
    .tl-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .tl-meta { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
    .sev-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 3px; }
    .sev-critical { background: rgba(255,23,68,0.15); color: #ff1744; }
    .sev-high { background: rgba(244,67,54,0.15); color: #f44336; }
    .sev-medium { background: rgba(255,145,0,0.15); color: #ff9100; }
    .sev-low { background: rgba(0,230,118,0.15); color: #00e676; }
    .tl-cat { font-size: 9px !important; height: 18px !important; min-height: 18px !important; padding: 0 6px !important; }
    .tl-desc { font-size: 11px; opacity: 0.6; line-height: 1.4; }

    /* Threats */
    .sub-title { font-size: 12px; font-weight: 600; margin: 0 0 8px; color: #667eea; }
    .mt { margin-top: 16px; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
    .bar-label { min-width: 100px; font-size: 12px; font-weight: 500; }
    .bar-track { flex: 1; height: 22px; background: rgba(128,128,128,0.1); border-radius: 4px; overflow: hidden; }
    .bar-fill {
      height: 100%; border-radius: 4px; min-width: 24px;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px; transition: width 0.5s;
      background: linear-gradient(90deg, #f5576c, #ff6b6b);
    }
    .bar-value { font-size: 10px; font-weight: 600; color: #fff; }
    .apt-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .apt-chip { font-size: 11px !important; height: 24px !important; min-height: 24px !important; background: rgba(255,107,107,0.12) !important; color: #ff6b6b !important; border-color: rgba(255,107,107,0.2) !important; }
    .sector-list { display: flex; flex-direction: column; gap: 4px; }
    .sector-item { display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 4px 0; }
    .sm-icon { font-size: 16px; width: 16px; height: 16px; color: #ff9100; }

    /* Comparison */
    .comparison-card { margin-bottom: 20px; }
    .comp-table { overflow-x: auto; }
    .comp-header, .comp-row {
      display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr;
      gap: 12px; padding: 10px 12px; align-items: center;
    }
    .comp-header { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.5; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .comp-row { font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
    .comp-row:hover { background: rgba(102,126,234,0.04); }
    .comp-selected { background: rgba(102,126,234,0.08) !important; border-left: 3px solid #667eea; }
    .comp-col { display: flex; align-items: center; gap: 6px; }
    .risk-dot { width: 8px; height: 8px; border-radius: 50%; }
    .risk-dot.risk-low { background: #00e676; }
    .risk-dot.risk-medium { background: #ff9100; }
    .risk-dot.risk-high { background: #f44336; }
    .cert-pill { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cert-pill.cert-advanced { background: rgba(0,230,118,0.1); color: #00e676; }
    .cert-pill.cert-operational { background: rgba(102,126,234,0.1); color: #667eea; }
    .cert-pill.cert-developing { background: rgba(255,145,0,0.1); color: #ff9100; }
    .cert-pill.cert-nascent { background: rgba(244,67,54,0.1); color: #f44336; }
    .mini-bar-track { width: 50px; height: 6px; background: rgba(128,128,128,0.15); border-radius: 3px; overflow: hidden; display: inline-block; }
    .mini-bar-fill { height: 100%; border-radius: 3px; background: #667eea; }

    @media (max-width: 1100px) {
      .metrics-grid { grid-template-columns: repeat(3, 1fr); }
      .bottom-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .overview-card { flex-direction: column; text-align: center; }
    }
    @media (max-width: 600px) {
      .metrics-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class CountryIntelComponent implements OnInit {
  allCountries: CountryProfile[] = [];
  selected: CountryProfile | null = null;
  selectedCode = 'NG';
  regionalCountries: CountryProfile[] = [];
  maxThreat = 1;

  ngOnInit() {
    this.allCountries = this.buildProfiles();
    this.selectCountry('NG');
  }

  selectCountry(code: string) {
    this.selected = this.allCountries.find(c => c.code === code) || null;
    if (this.selected) {
      this.maxThreat = Math.max(1, ...this.selected.topThreats.map(t => t.count));
      this.regionalCountries = this.allCountries.filter(c => c.region === this.selected!.region);
    }
  }

  getBarW(v: number, max: number) { return max > 0 ? Math.max(5, (v / max) * 100) : 5; }
  getRiskClass(score: number) { return score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high'; }

  private buildProfiles(): CountryProfile[] {
    const data: Partial<CountryProfile>[] = [
      { code: 'NG', name: 'Nigeria', flag: '\u{1F1F3}\u{1F1EC}', region: 'West Africa', riskLevel: 'high', readinessScore: 52, networkScore: 58, incidentResponseScore: 45, legislationScore: 62, certMaturity: 'operational', connectivityIndex: 55, cybercrimeIndex: 72 },
      { code: 'KE', name: 'Kenya', flag: '\u{1F1F0}\u{1F1EA}', region: 'East Africa', riskLevel: 'medium', readinessScore: 65, networkScore: 68, incidentResponseScore: 62, legislationScore: 70, certMaturity: 'operational', connectivityIndex: 63, cybercrimeIndex: 48 },
      { code: 'ZA', name: 'South Africa', flag: '\u{1F1FF}\u{1F1E6}', region: 'Southern Africa', riskLevel: 'medium', readinessScore: 74, networkScore: 78, incidentResponseScore: 72, legislationScore: 75, certMaturity: 'advanced', connectivityIndex: 76, cybercrimeIndex: 55 },
      { code: 'EG', name: 'Egypt', flag: '\u{1F1EA}\u{1F1EC}', region: 'North Africa', riskLevel: 'medium', readinessScore: 71, networkScore: 74, incidentResponseScore: 68, legislationScore: 72, certMaturity: 'advanced', connectivityIndex: 70, cybercrimeIndex: 42 },
      { code: 'ET', name: 'Ethiopia', flag: '\u{1F1EA}\u{1F1F9}', region: 'East Africa', riskLevel: 'high', readinessScore: 38, networkScore: 35, incidentResponseScore: 30, legislationScore: 42, certMaturity: 'developing', connectivityIndex: 28, cybercrimeIndex: 35 },
      { code: 'GH', name: 'Ghana', flag: '\u{1F1EC}\u{1F1ED}', region: 'West Africa', riskLevel: 'medium', readinessScore: 58, networkScore: 55, incidentResponseScore: 52, legislationScore: 65, certMaturity: 'operational', connectivityIndex: 52, cybercrimeIndex: 60 },
      { code: 'MA', name: 'Morocco', flag: '\u{1F1F2}\u{1F1E6}', region: 'North Africa', riskLevel: 'low', readinessScore: 78, networkScore: 80, incidentResponseScore: 75, legislationScore: 82, certMaturity: 'advanced', connectivityIndex: 74, cybercrimeIndex: 32 },
      { code: 'TZ', name: 'Tanzania', flag: '\u{1F1F9}\u{1F1FF}', region: 'East Africa', riskLevel: 'medium', readinessScore: 45, networkScore: 42, incidentResponseScore: 40, legislationScore: 50, certMaturity: 'developing', connectivityIndex: 38, cybercrimeIndex: 38 },
      { code: 'SN', name: 'Senegal', flag: '\u{1F1F8}\u{1F1F3}', region: 'West Africa', riskLevel: 'medium', readinessScore: 55, networkScore: 52, incidentResponseScore: 48, legislationScore: 58, certMaturity: 'operational', connectivityIndex: 48, cybercrimeIndex: 45 },
      { code: 'RW', name: 'Rwanda', flag: '\u{1F1F7}\u{1F1FC}', region: 'East Africa', riskLevel: 'low', readinessScore: 72, networkScore: 70, incidentResponseScore: 68, legislationScore: 78, certMaturity: 'advanced', connectivityIndex: 65, cybercrimeIndex: 22 },
      { code: 'TN', name: 'Tunisia', flag: '\u{1F1F9}\u{1F1F3}', region: 'North Africa', riskLevel: 'medium', readinessScore: 68, networkScore: 70, incidentResponseScore: 62, legislationScore: 72, certMaturity: 'operational', connectivityIndex: 68, cybercrimeIndex: 38 },
      { code: 'UG', name: 'Uganda', flag: '\u{1F1FA}\u{1F1EC}', region: 'East Africa', riskLevel: 'high', readinessScore: 42, networkScore: 40, incidentResponseScore: 35, legislationScore: 48, certMaturity: 'developing', connectivityIndex: 35, cybercrimeIndex: 42 },
      { code: 'CM', name: 'Cameroon', flag: '\u{1F1E8}\u{1F1F2}', region: 'Central Africa', riskLevel: 'high', readinessScore: 35, networkScore: 32, incidentResponseScore: 28, legislationScore: 38, certMaturity: 'nascent', connectivityIndex: 30, cybercrimeIndex: 48 },
      { code: 'CD', name: 'DR Congo', flag: '\u{1F1E8}\u{1F1E9}', region: 'Central Africa', riskLevel: 'critical', readinessScore: 22, networkScore: 18, incidentResponseScore: 15, legislationScore: 25, certMaturity: 'nascent', connectivityIndex: 15, cybercrimeIndex: 55 },
      { code: 'AO', name: 'Angola', flag: '\u{1F1E6}\u{1F1F4}', region: 'Southern Africa', riskLevel: 'high', readinessScore: 40, networkScore: 38, incidentResponseScore: 32, legislationScore: 42, certMaturity: 'developing', connectivityIndex: 35, cybercrimeIndex: 45 },
      { code: 'MZ', name: 'Mozambique', flag: '\u{1F1F2}\u{1F1FF}', region: 'Southern Africa', riskLevel: 'high', readinessScore: 32, networkScore: 28, incidentResponseScore: 25, legislationScore: 35, certMaturity: 'nascent', connectivityIndex: 22, cybercrimeIndex: 40 },
      { code: 'BW', name: 'Botswana', flag: '\u{1F1E7}\u{1F1FC}', region: 'Southern Africa', riskLevel: 'medium', readinessScore: 60, networkScore: 58, incidentResponseScore: 55, legislationScore: 62, certMaturity: 'operational', connectivityIndex: 55, cybercrimeIndex: 28 },
      { code: 'DZ', name: 'Algeria', flag: '\u{1F1E9}\u{1F1FF}', region: 'North Africa', riskLevel: 'medium', readinessScore: 58, networkScore: 60, incidentResponseScore: 52, legislationScore: 62, certMaturity: 'operational', connectivityIndex: 58, cybercrimeIndex: 40 },
      { code: 'LY', name: 'Libya', flag: '\u{1F1F1}\u{1F1FE}', region: 'North Africa', riskLevel: 'critical', readinessScore: 25, networkScore: 22, incidentResponseScore: 18, legislationScore: 28, certMaturity: 'nascent', connectivityIndex: 25, cybercrimeIndex: 62 },
      { code: 'GA', name: 'Gabon', flag: '\u{1F1EC}\u{1F1E6}', region: 'Central Africa', riskLevel: 'medium', readinessScore: 45, networkScore: 42, incidentResponseScore: 38, legislationScore: 48, certMaturity: 'developing', connectivityIndex: 40, cybercrimeIndex: 35 },
    ];

    const threatTemplates: Record<string, { type: string; count: number }[]> = {
      high: [{ type: 'Phishing', count: 45 }, { type: 'Ransomware', count: 32 }, { type: 'BEC', count: 28 }, { type: 'Malware', count: 22 }, { type: 'DDoS', count: 15 }],
      medium: [{ type: 'Phishing', count: 30 }, { type: 'Malware', count: 20 }, { type: 'DDoS', count: 14 }, { type: 'BEC', count: 12 }, { type: 'Ransomware', count: 8 }],
      low: [{ type: 'Phishing', count: 15 }, { type: 'Malware', count: 10 }, { type: 'BEC', count: 6 }, { type: 'DDoS', count: 5 }, { type: 'Ransomware', count: 3 }],
      critical: [{ type: 'Ransomware', count: 55 }, { type: 'Phishing', count: 48 }, { type: 'Malware', count: 40 }, { type: 'DDoS', count: 30 }, { type: 'BEC', count: 25 }],
    };
    const incTemplates = [
      { title: 'Government portal defacement', severity: 'high', category: 'Web Attack', desc: 'Official government website defaced with political messaging.' },
      { title: 'Banking trojan campaign', severity: 'critical', category: 'Malware', desc: 'Targeted banking trojan distributed via SMS phishing links.' },
      { title: 'Telecom data breach', severity: 'high', category: 'Data Breach', desc: 'Customer records exposed through unsecured API endpoint.' },
      { title: 'Ransomware on health systems', severity: 'critical', category: 'Ransomware', desc: 'Hospital management systems encrypted, demanding cryptocurrency.' },
      { title: 'DDoS on election infrastructure', severity: 'medium', category: 'DDoS', desc: 'Voter registration portal targeted during election period.' },
    ];
    const aptPool = ['APT28', 'Lazarus', 'SilverTerrier', 'MuddyWater', 'GALLIUM', 'Scattered Spider', 'Charming Kitten', 'Sandworm'];
    const sectorPool = ['Government', 'Finance & Banking', 'Telecommunications', 'Energy & Utilities', 'Healthcare', 'Education', 'Transport'];

    return data.map(d => ({
      ...d,
      topThreats: threatTemplates[d.riskLevel!] || threatTemplates['medium'],
      incidents: incTemplates.slice(0, 3 + Math.floor(Math.random() * 2)).map((inc, i) => ({ ...inc, date: `${2026 - Math.floor(i / 3)}-${String(1 + i).padStart(2, '0')}-${String(10 + i * 3).padStart(2, '0')}` })),
      aptGroups: aptPool.slice(0, 2 + Math.floor(Math.random() * 3)),
      criticalSectors: sectorPool.slice(0, 3 + Math.floor(Math.random() * 2)),
    } as CountryProfile));
  }
}
