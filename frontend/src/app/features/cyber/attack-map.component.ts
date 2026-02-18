import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, NgZone, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import * as L from 'leaflet';

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */
interface Attack {
  id: number;
  sourceCountry: string; sourceFlag: string; sourceCode: string;
  targetCountry: string; targetFlag: string; targetCode: string;
  type: string; severity: number; timestamp: Date; port: number;
}

interface GeoCoord {
  name: string; code: string; flag: string;
  lat: number; lng: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-attack-map',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatChipsModule,
    MatButtonModule, MatTooltipModule, TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">
        <mat-icon>language</mat-icon>
        {{ 'cyber.attackMap.title' | translate }}
      </h2>
      <div class="header-right">
        <div class="live-badge">
          <span class="live-dot-red"></span>
          <span class="live-text">{{ 'cyber.attackMap.live' | translate }}</span>
        </div>
        <div class="attack-counter">
          <span class="counter-value">{{ totalAttacks | number }}</span>
          <span class="counter-label">{{ 'cyber.attackMap.attacksLast24h' | translate }}</span>
        </div>
        <div class="apm-counter">
          <span class="apm-value">{{ attacksPerMinute }}</span>
          <span class="apm-label">attacks / min</span>
        </div>
      </div>
    </div>

    <!-- Main layout: map left, sidebar right -->
    <div class="main-row">
      <!-- Leaflet map area -->
      <div class="map-col">
        <mat-card class="map-card">
          <div class="map-wrapper">
            <div #mapContainer class="leaflet-host"></div>

            <!-- Region overlays -->
            <div class="map-overlay top-left">
              <div class="overlay-stat">
                <span class="ov-value">{{ regionStats[0]?.count || 0 }}</span>
                <span class="ov-label">North Africa</span>
              </div>
              <div class="overlay-stat">
                <span class="ov-value">{{ regionStats[1]?.count || 0 }}</span>
                <span class="ov-label">West Africa</span>
              </div>
            </div>
            <div class="map-overlay top-right-overlay">
              <div class="overlay-stat">
                <span class="ov-value">{{ regionStats[2]?.count || 0 }}</span>
                <span class="ov-label">East Africa</span>
              </div>
              <div class="overlay-stat">
                <span class="ov-value">{{ regionStats[3]?.count || 0 }}</span>
                <span class="ov-label">Central Africa</span>
              </div>
            </div>
            <div class="map-overlay bottom-right-overlay">
              <div class="overlay-stat">
                <span class="ov-value">{{ regionStats[4]?.count || 0 }}</span>
                <span class="ov-label">Southern Africa</span>
              </div>
            </div>

            <!-- Global sources legend -->
            <div class="map-overlay global-legend">
              <div class="legend-title">Global Attack Sources</div>
              @for (gs of globalSources; track gs.code) {
                <div class="legend-row">
                  <span class="legend-dot" [style.background]="gs.color"></span>
                  <span class="legend-name">{{ gs.flag }} {{ gs.name }}</span>
                  <span class="legend-count">{{ gs.attacks }}</span>
                </div>
              }
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Sidebar panels -->
      <div class="sidebar-col">
        <!-- Live Attack Feed -->
        <mat-card class="feed-card">
          <mat-card-header>
            <mat-card-title class="section-hdr">
              <mat-icon>dynamic_feed</mat-icon>
              {{ 'cyber.attackMap.liveAttacks' | translate }}
              <span class="feed-count">{{ attacks.length }}</span>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="attack-feed">
              @for (atk of attacks.slice(0, 25); track atk.id) {
                <div class="atk-item" [class]="'atk-sev-' + atk.severity">
                  <div class="atk-severity-bar"></div>
                  <div class="atk-body">
                    <div class="atk-route">
                      <span class="atk-from">{{ atk.sourceFlag }} {{ atk.sourceCountry }}</span>
                      <mat-icon class="atk-arrow">east</mat-icon>
                      <span class="atk-to">{{ atk.targetFlag }} {{ atk.targetCountry }}</span>
                    </div>
                    <div class="atk-details">
                      <mat-chip class="atk-type" [class]="'chip-' + getTypeClass(atk.type)">{{ atk.type }}</mat-chip>
                      <span class="atk-port">:{{ atk.port }}</span>
                      <span class="atk-time">{{ getRelativeTime(atk.timestamp) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Top Sources -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title class="section-hdr"><mat-icon>upload</mat-icon> {{ 'cyber.attackMap.topSources' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (s of topSources; track s.label) {
              <div class="bar-row">
                <span class="bar-label">{{ s.flag }} {{ s.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill src-bar" [style.width.%]="getBarW(s.count, maxSource)">
                    <span class="bar-value">{{ s.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Attack Types -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title class="section-hdr"><mat-icon>security</mat-icon> {{ 'cyber.attackMap.attackTypes' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (t of attackTypes; track t.label) {
              <div class="bar-row">
                <span class="bar-label">{{ t.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill type-bar" [style.width.%]="getBarW(t.count, maxType)">
                    <span class="bar-value">{{ t.count }}</span>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Hourly Heatmap -->
        <mat-card class="heatmap-card">
          <mat-card-header>
            <mat-card-title class="section-hdr"><mat-icon>grid_on</mat-icon> {{ 'cyber.attackMap.hourlyHeatmap' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="heatmap-grid">
              @for (h of hourlyData; track h.hour) {
                <div class="heatmap-cell" [style.background]="getHeatColor(h.count)"
                     [matTooltip]="h.hour + ':00 -- ' + h.count + ' attacks'">
                  <span class="heat-label">{{ h.hour }}</span>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    /* ---- host ---- */
    :host {
      display: block; padding: 0 16px 32px;
      background: var(--bg-page); min-height: 100vh;
    }

    /* ---- header ---- */
    .page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .page-title { display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 600; margin: 0; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .live-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px;
      background: rgba(255,23,68,0.1); border: 1px solid rgba(255,23,68,0.3);
    }
    .live-dot-red {
      width: 10px; height: 10px; border-radius: 50%; background: #ff1744;
      box-shadow: 0 0 10px rgba(255,23,68,0.6); animation: pulse 1.2s infinite;
    }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
    .live-text { font-size: 12px; font-weight: 700; color: #ff1744; letter-spacing: 2px; }
    .attack-counter {
      display: flex; flex-direction: column; align-items: flex-end;
      padding: 6px 14px; border-radius: 10px;
      background: rgba(102,126,234,0.08); border: 1px solid rgba(102,126,234,0.2);
    }
    .counter-value { font-size: 20px; font-weight: 700; color: #667eea; }
    .counter-label { font-size: 10px; opacity: 0.6; }
    .apm-counter {
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 14px; border-radius: 10px;
      background: rgba(255,145,0,0.08); border: 1px solid rgba(255,145,0,0.25);
    }
    .apm-value { font-size: 20px; font-weight: 700; color: #ff9100; }
    .apm-label { font-size: 10px; opacity: 0.6; color: #ff9100; }

    /* ---- main layout: map 65 % + sidebar 35 % ---- */
    .main-row { display: flex; gap: 16px; }
    .map-col  { flex: 0 0 65%; min-width: 0; }
    .sidebar-col {
      flex: 0 0 calc(35% - 16px); min-width: 0;
      display: flex; flex-direction: column; gap: 16px;
    }

    /* ---- map card ---- */
    .map-card { padding: 0 !important; overflow: hidden; margin-bottom: 0; }
    .map-wrapper { position: relative; }
    .leaflet-host { width: 100%; height: 620px; background: var(--bg-page); }

    /* ---- overlays on top of map ---- */
    .map-overlay {
      position: absolute; padding: 8px 12px; border-radius: 8px;
      background: var(--bg-input); border: 1px solid var(--border-default);
      backdrop-filter: blur(8px); z-index: 800; pointer-events: auto;
    }
    .top-left { top: 12px; left: 12px; }
    .top-right-overlay { top: 12px; right: 12px; }
    .bottom-right-overlay { bottom: 12px; right: 12px; }
    .global-legend { bottom: 12px; left: 12px; }
    .overlay-stat { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
    .ov-value { font-size: 16px; font-weight: 700; color: #667eea; min-width: 32px; }
    .ov-label { font-size: 10px; opacity: 0.6; }

    .legend-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85); margin-bottom: 6px; }
    .legend-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 10px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-name { flex: 1; color: rgba(255,255,255,0.7); }
    .legend-count { font-weight: 600; color: rgba(255,255,255,0.5); font-size: 9px; }

    /* ---- sidebar cards ---- */
    .section-hdr { display: flex; align-items: center; gap: 6px; font-size: 15px; }
    .feed-count {
      margin-left: auto; font-size: 11px; font-weight: 600;
      background: rgba(255,23,68,0.12); color: #ff1744;
      padding: 2px 8px; border-radius: 10px;
    }

    /* Feed */
    .attack-feed { max-height: 300px; overflow-y: auto; }
    .atk-item {
      display: flex; gap: 8px; padding: 8px; margin: 3px 0; border-radius: 6px;
      border-left: 3px solid transparent; transition: background 0.2s;
    }
    .atk-item:hover { background: rgba(102,126,234,0.04); }
    .atk-sev-5, .atk-sev-4 { border-left-color: #ff1744; }
    .atk-sev-3 { border-left-color: #ff9100; }
    .atk-sev-2, .atk-sev-1 { border-left-color: #00e676; }
    .atk-body { flex: 1; }
    .atk-route { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
    .atk-arrow { font-size: 14px; width: 14px; height: 14px; color: #667eea; }
    .atk-details { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .atk-type { font-size: 9px !important; height: 18px !important; min-height: 18px !important; padding: 0 6px !important; }
    .atk-port { font-family: 'Consolas', monospace; font-size: 10px; color: #00d4ff; }
    .atk-time { font-size: 10px; opacity: 0.4; margin-left: auto; }

    .chip-ransomware { background: rgba(255,23,68,0.2) !important; color: #ff1744 !important; }
    .chip-ddos { background: rgba(255,145,0,0.2) !important; color: #ff9100 !important; }
    .chip-phishing { background: rgba(255,214,0,0.2) !important; color: #ffd600 !important; }
    .chip-malware { background: rgba(213,0,249,0.2) !important; color: #d500f9 !important; }
    .chip-databreach { background: rgba(0,229,255,0.2) !important; color: #00e5ff !important; }

    /* Stats */
    .bar-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
    .bar-label { min-width: 100px; font-size: 12px; font-weight: 500; }
    .bar-track { flex: 1; height: 22px; background: rgba(128,128,128,0.1); border-radius: 4px; overflow: hidden; }
    .bar-fill {
      height: 100%; border-radius: 4px; min-width: 24px;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px; transition: width 0.5s;
    }
    .bar-value { font-size: 10px; font-weight: 600; color: #fff; }
    .src-bar { background: linear-gradient(90deg, #f5576c, #ff6b6b); }
    .type-bar { background: linear-gradient(90deg, #667eea, #764ba2); }

    /* Heatmap */
    .heatmap-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; }
    .heatmap-cell {
      aspect-ratio: 1; border-radius: 4px; display: flex;
      align-items: center; justify-content: center; cursor: help;
      transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.03);
    }
    .heatmap-cell:hover { transform: scale(1.15); z-index: 1; }
    .heat-label { font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.7); }

    /* ---- Leaflet attack-line animation (injected on SVG overlay) ---- */
    /* pulsing endpoint markers */
    :host ::ng-deep .pulse-marker {
      border-radius: 50%;
      animation: leaflet-pulse 1.6s ease-out infinite;
    }
    @keyframes leaflet-pulse {
      0%   { transform: scale(1);   opacity: 1; }
      70%  { transform: scale(2.5); opacity: 0; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    /* animated attack polyline via SVG class */
    :host ::ng-deep .attack-line {
      stroke-dasharray: 12 8;
      animation: dash-flow 1s linear infinite;
    }
    @keyframes dash-flow {
      to { stroke-dashoffset: -40; }
    }

    /* glow filter for SVG overlay lines */
    :host ::ng-deep .attack-line-glow {
      filter: url(#attackGlow);
    }

    /* fade-out class added before removal */
    :host ::ng-deep .attack-line-fade {
      transition: opacity 1s ease-out;
      opacity: 0 !important;
    }

    @media (max-width: 1100px) {
      .main-row { flex-direction: column; }
      .map-col, .sidebar-col { flex: 1 1 100%; }
    }
    @media (max-width: 600px) {
      .page-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class AttackMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  /* ---------- public state for template ---------- */
  attacks: Attack[] = [];
  totalAttacks = 2847;
  attacksPerMinute = 0;

  regionStats = [
    { region: 'North Africa', count: 145 },
    { region: 'West Africa', count: 210 },
    { region: 'East Africa', count: 178 },
    { region: 'Central Africa', count: 95 },
    { region: 'Southern Africa', count: 132 },
  ];

  topSources: { label: string; flag: string; count: number }[] = [];
  attackTypes: { label: string; count: number }[] = [];
  hourlyData: { hour: number; count: number }[] = [];
  maxSource = 1;
  maxType = 1;

  globalSources = [
    { name: 'Russia',   code: 'RU', flag: '\u{1F1F7}\u{1F1FA}', color: '#ff1744', attacks: 487 },
    { name: 'China',    code: 'CN', flag: '\u{1F1E8}\u{1F1F3}', color: '#ff9100', attacks: 412 },
    { name: 'N. Korea', code: 'KP', flag: '\u{1F1F0}\u{1F1F5}', color: '#ffd600', attacks: 234 },
    { name: 'USA',      code: 'US', flag: '\u{1F1FA}\u{1F1F8}', color: '#00e5ff', attacks: 189 },
    { name: 'Iran',     code: 'IR', flag: '\u{1F1EE}\u{1F1F7}', color: '#d500f9', attacks: 298 },
    { name: 'Brazil',   code: 'BR', flag: '\u{1F1E7}\u{1F1F7}', color: '#00e676', attacks: 145 },
  ];

  /* ---------- private state ---------- */
  private map!: L.Map;
  private attackLayerGroup!: L.LayerGroup;
  private pulseLayerGroup!: L.LayerGroup;

  private attackId = 0;
  private recentAttackTimestamps: number[] = [];

  private intervals: ReturnType<typeof setInterval>[] = [];

  /* source coords (lat, lng) */
  private sourceCoords: GeoCoord[] = [
    { name: 'Russia',    code: 'RU', flag: '\u{1F1F7}\u{1F1FA}', lat: 55.75, lng: 37.62 },
    { name: 'China',     code: 'CN', flag: '\u{1F1E8}\u{1F1F3}', lat: 39.90, lng: 116.40 },
    { name: 'N. Korea',  code: 'KP', flag: '\u{1F1F0}\u{1F1F5}', lat: 39.02, lng: 125.75 },
    { name: 'USA',       code: 'US', flag: '\u{1F1FA}\u{1F1F8}', lat: 38.90, lng: -77.04 },
    { name: 'Iran',      code: 'IR', flag: '\u{1F1EE}\u{1F1F7}', lat: 35.69, lng: 51.39 },
    { name: 'Brazil',    code: 'BR', flag: '\u{1F1E7}\u{1F1F7}', lat: -15.78, lng: -47.93 },
    { name: 'India',     code: 'IN', flag: '\u{1F1EE}\u{1F1F3}', lat: 28.61, lng: 77.21 },
    { name: 'Turkey',    code: 'TR', flag: '\u{1F1F9}\u{1F1F7}', lat: 39.93, lng: 32.86 },
  ];

  /* target coords in Africa (lat, lng) */
  private targetCoords: GeoCoord[] = [
    { name: 'Nigeria',      code: 'NG', flag: '\u{1F1F3}\u{1F1EC}', lat: 9.08,   lng: 7.49 },
    { name: 'South Africa', code: 'ZA', flag: '\u{1F1FF}\u{1F1E6}', lat: -25.75, lng: 28.19 },
    { name: 'Kenya',        code: 'KE', flag: '\u{1F1F0}\u{1F1EA}', lat: -1.29,  lng: 36.82 },
    { name: 'Egypt',        code: 'EG', flag: '\u{1F1EA}\u{1F1EC}', lat: 30.04,  lng: 31.24 },
    { name: 'Ethiopia',     code: 'ET', flag: '\u{1F1EA}\u{1F1F9}', lat: 9.02,   lng: 38.75 },
    { name: 'Ghana',        code: 'GH', flag: '\u{1F1EC}\u{1F1ED}', lat: 5.56,   lng: -0.19 },
    { name: 'Morocco',      code: 'MA', flag: '\u{1F1F2}\u{1F1E6}', lat: 33.97,  lng: -6.85 },
    { name: 'Tanzania',     code: 'TZ', flag: '\u{1F1F9}\u{1F1FF}', lat: -6.16,  lng: 35.74 },
    { name: 'Algeria',      code: 'DZ', flag: '\u{1F1E9}\u{1F1FF}', lat: 36.75,  lng: 3.06 },
    { name: 'Tunisia',      code: 'TN', flag: '\u{1F1F9}\u{1F1F3}', lat: 36.81,  lng: 10.17 },
    { name: 'Sudan',        code: 'SD', flag: '\u{1F1F8}\u{1F1E9}', lat: 15.50,  lng: 32.56 },
    { name: 'DR Congo',     code: 'CD', flag: '\u{1F1E8}\u{1F1E9}', lat: -4.32,  lng: 15.31 },
    { name: 'Angola',       code: 'AO', flag: '\u{1F1E6}\u{1F1F4}', lat: -8.84,  lng: 13.23 },
    { name: 'Mozambique',   code: 'MZ', flag: '\u{1F1F2}\u{1F1FF}', lat: -25.97, lng: 32.57 },
    { name: 'Senegal',      code: 'SN', flag: '\u{1F1F8}\u{1F1F3}', lat: 14.69,  lng: -17.44 },
    { name: 'Cameroon',     code: 'CM', flag: '\u{1F1E8}\u{1F1F2}', lat: 3.87,   lng: 11.52 },
    { name: 'Uganda',       code: 'UG', flag: '\u{1F1FA}\u{1F1EC}', lat: 0.35,   lng: 32.58 },
    { name: 'Rwanda',       code: 'RW', flag: '\u{1F1F7}\u{1F1FC}', lat: -1.94,  lng: 29.87 },
    { name: 'Libya',        code: 'LY', flag: '\u{1F1F1}\u{1F1FE}', lat: 32.90,  lng: 13.18 },
    { name: 'Botswana',     code: 'BW', flag: '\u{1F1E7}\u{1F1FC}', lat: -24.65, lng: 25.91 },
  ];

  private attackTypesList = [
    'DDoS', 'Brute Force', 'Phishing', 'Malware',
    'Port Scan', 'SQLi', 'XSS', 'Ransomware', 'Data Breach'
  ];

  private attackTypeColorMap: Record<string, string> = {
    'Ransomware':  '#ff1744',
    'DDoS':        '#ff9100',
    'Phishing':    '#ffd600',
    'Malware':     '#d500f9',
    'Data Breach': '#00e5ff',
    'Brute Force': '#ff6d00',
    'Port Scan':   '#76ff03',
    'SQLi':        '#00b0ff',
    'XSS':         '#ffab40',
  };

  private regionMap: Record<string, number> = {
    'EG': 0, 'LY': 0, 'TN': 0, 'DZ': 0, 'MA': 0,
    'NG': 1, 'GH': 1, 'SN': 1,
    'KE': 2, 'ET': 2, 'TZ': 2, 'UG': 2, 'RW': 2,
    'CM': 3, 'CD': 3,
    'ZA': 4, 'AO': 4, 'MZ': 4, 'BW': 4, 'SD': 2,
  };

  constructor(private http: HttpClient, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  /* ================================================================ */
  /*  Lifecycle                                                        */
  /* ================================================================ */
  ngOnInit(): void {
    this.generateInitialData();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadGeoJson();

    // add permanent pulsing markers for every target country
    this.targetCoords.forEach(t => this.addPulseMarker(t.lat, t.lng, '#667eea', 6));

    // generate initial attacks silently (no animation)
    for (let i = 0; i < 20; i++) { this.simulateAttack(false); }

    // start simulation timers outside Angular zone so change detection
    // is only triggered when we explicitly call it
    this.zone.runOutsideAngular(() => {
      this.intervals.push(
        setInterval(() => { this.simulateAttack(true); this.cdr.detectChanges(); }, 2000 + Math.random() * 1000)
      );
      this.intervals.push(
        setInterval(() => {
          this.totalAttacks += Math.floor(Math.random() * 3) + 1;
          this.cdr.detectChanges();
        }, 3500)
      );
      this.intervals.push(
        setInterval(() => {
          const now = Date.now();
          this.recentAttackTimestamps = this.recentAttackTimestamps.filter(t => now - t < 60000);
          this.attacksPerMinute = this.recentAttackTimestamps.length;
          this.cdr.detectChanges();
        }, 1000)
      );
    });
  }

  ngOnDestroy(): void {
    this.intervals.forEach(id => clearInterval(id));
    if (this.map) { this.map.remove(); }
  }

  /* ================================================================ */
  /*  Map init                                                         */
  /* ================================================================ */
  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [2, 20],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,            // we need SVG overlay for CSS animations
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.attackLayerGroup = L.layerGroup().addTo(this.map);
    this.pulseLayerGroup  = L.layerGroup().addTo(this.map);

    // Inject an SVG filter for the glow effect on attack lines.
    // We append it once to the map pane's SVG element after tiles load.
    this.map.whenReady(() => {
      setTimeout(() => this.injectSvgGlowFilter(), 300);
    });
  }

  /** Append a reusable glow <filter> to the Leaflet overlay SVG */
  private injectSvgGlowFilter(): void {
    const svgEl = this.mapEl.nativeElement.querySelector('.leaflet-overlay-pane svg');
    if (!svgEl) { return; }
    // Only add once
    if (svgEl.querySelector('#attackGlow')) { return; }
    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    const filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', 'attackGlow');
    const blur = document.createElementNS(ns, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'blur');
    const merge = document.createElementNS(ns, 'feMerge');
    const mn1 = document.createElementNS(ns, 'feMergeNode');
    mn1.setAttribute('in', 'blur');
    const mn2 = document.createElementNS(ns, 'feMergeNode');
    mn2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svgEl.insertBefore(defs, svgEl.firstChild);
  }

  /* ================================================================ */
  /*  GeoJSON                                                          */
  /* ================================================================ */
  private loadGeoJson(): void {
    this.http.get<any>('/assets/geo/africa.geojson').subscribe({
      next: (data) => {
        L.geoJSON(data, {
          style: () => ({
            color: 'rgba(102,126,234,0.3)',
            weight: 1,
            fillColor: 'rgba(102,126,234,0.06)',
            fillOpacity: 1,
          }),
        }).addTo(this.map);
      },
      error: () => {
        // GeoJSON not critical -- map still functions with tiles
      }
    });
  }

  /* ================================================================ */
  /*  Pulse markers                                                    */
  /* ================================================================ */
  private addPulseMarker(lat: number, lng: number, color: string, size: number): void {
    const html = `
      <div style="position:relative;width:${size * 2}px;height:${size * 2}px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.8;"></div>
        <div class="pulse-marker" style="position:absolute;inset:0;border-radius:50%;background:${color};"></div>
      </div>`;
    const icon = L.divIcon({
      className: '',
      html,
      iconSize: [size * 2, size * 2],
      iconAnchor: [size, size],
    });
    L.marker([lat, lng], { icon, interactive: false }).addTo(this.pulseLayerGroup);
  }

  /* ================================================================ */
  /*  Attack simulation                                                */
  /* ================================================================ */
  simulateAttack(animate = true): void {
    const src = this.sourceCoords[Math.floor(Math.random() * this.sourceCoords.length)];
    const tgt = this.targetCoords[Math.floor(Math.random() * this.targetCoords.length)];
    const type = this.attackTypesList[Math.floor(Math.random() * this.attackTypesList.length)];
    const ports = [22, 80, 443, 3389, 8080, 445, 3306, 1433, 5432, 8443];
    const severity = Math.floor(Math.random() * 5) + 1;

    const atk: Attack = {
      id: ++this.attackId,
      sourceCountry: src.name, sourceFlag: src.flag, sourceCode: src.code,
      targetCountry: tgt.name, targetFlag: tgt.flag, targetCode: tgt.code,
      type, severity,
      timestamp: new Date(),
      port: ports[Math.floor(Math.random() * ports.length)],
    };

    this.attacks = [atk, ...this.attacks.slice(0, 49)];
    this.totalAttacks++;
    this.recentAttackTimestamps.push(Date.now());

    // update global source counter
    const gs = this.globalSources.find(g => g.code === src.code);
    if (gs) { gs.attacks++; }

    // update region
    const ri = this.regionMap[tgt.code];
    if (ri !== undefined && this.regionStats[ri]) { this.regionStats[ri].count++; }

    // draw on map
    if (animate && this.map) {
      this.drawAttackLine(src, tgt, type, severity);
    }
  }

  /* ================================================================ */
  /*  Draw attack arc on map                                           */
  /* ================================================================ */
  private drawAttackLine(src: GeoCoord, tgt: GeoCoord, type: string, severity: number): void {
    const color = this.attackTypeColorMap[type] || '#667eea';

    // Build curved path with intermediate control point
    const midLat = (src.lat + tgt.lat) / 2;
    const midLng = (src.lng + tgt.lng) / 2;
    const dLat = tgt.lat - src.lat;
    const dLng = tgt.lng - src.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    // perpendicular offset proportional to distance for a nice arc
    const curveStrength = Math.min(dist * 0.35, 30);
    const ctrlLat = midLat + (-dLng / dist) * curveStrength;
    const ctrlLng = midLng + (dLat / dist) * curveStrength;

    // Sample the quadratic bezier into a polyline (20 segments)
    const pts: L.LatLngExpression[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const omt = 1 - t;
      const lat = omt * omt * src.lat + 2 * omt * t * ctrlLat + t * t * tgt.lat;
      const lng = omt * omt * src.lng + 2 * omt * t * ctrlLng + t * t * tgt.lng;
      pts.push([lat, lng]);
    }

    // Glow underlay (thicker, lower opacity)
    const glowLine = L.polyline(pts, {
      color,
      weight: 6,
      opacity: 0.15,
      className: 'attack-line-glow',
      interactive: false,
    });

    // Main animated line
    const mainLine = L.polyline(pts, {
      color,
      weight: 2,
      opacity: 0.85,
      className: 'attack-line',
      interactive: false,
    });

    glowLine.addTo(this.attackLayerGroup);
    mainLine.addTo(this.attackLayerGroup);

    // Pulsing impact marker at target
    const impactSize = 4 + severity;
    this.addImpactPulse(tgt.lat, tgt.lng, color, impactSize);

    // Fade and remove after ~4 seconds
    setTimeout(() => {
      const glowEl = glowLine.getElement();
      const mainEl = mainLine.getElement();
      if (glowEl) { glowEl.classList.add('attack-line-fade'); }
      if (mainEl) { mainEl.classList.add('attack-line-fade'); }

      setTimeout(() => {
        this.attackLayerGroup.removeLayer(glowLine);
        this.attackLayerGroup.removeLayer(mainLine);
      }, 1000);
    }, 4000);
  }

  /** Temporary pulsing circle at the attack target */
  private addImpactPulse(lat: number, lng: number, color: string, size: number): void {
    const html = `
      <div class="pulse-marker"
           style="width:${size * 2}px;height:${size * 2}px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};">
      </div>`;
    const icon = L.divIcon({
      className: '',
      html,
      iconSize: [size * 2, size * 2],
      iconAnchor: [size, size],
    });
    const marker = L.marker([lat, lng], { icon, interactive: false }).addTo(this.attackLayerGroup);
    setTimeout(() => { this.attackLayerGroup.removeLayer(marker); }, 3500);
  }

  /* ================================================================ */
  /*  Initial sidebar data (same as original)                          */
  /* ================================================================ */
  private generateInitialData(): void {
    this.topSources = [
      { label: 'Russia',   flag: '\u{1F1F7}\u{1F1FA}', count: 487 },
      { label: 'China',    flag: '\u{1F1E8}\u{1F1F3}', count: 412 },
      { label: 'Iran',     flag: '\u{1F1EE}\u{1F1F7}', count: 298 },
      { label: 'N. Korea', flag: '\u{1F1F0}\u{1F1F5}', count: 234 },
      { label: 'USA',      flag: '\u{1F1FA}\u{1F1F8}', count: 189 },
      { label: 'Brazil',   flag: '\u{1F1E7}\u{1F1F7}', count: 145 },
    ];
    this.attackTypes = [
      { label: 'DDoS',        count: 534 },
      { label: 'Brute Force', count: 423 },
      { label: 'Phishing',    count: 387 },
      { label: 'Malware',     count: 312 },
      { label: 'Port Scan',   count: 278 },
      { label: 'Ransomware',  count: 198 },
    ];
    this.hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(30 + Math.random() * 120 + (i >= 8 && i <= 18 ? 60 : 0)),
    }));
    this.maxSource = Math.max(1, ...this.topSources.map(s => s.count));
    this.maxType   = Math.max(1, ...this.attackTypes.map(t => t.count));
  }

  /* ================================================================ */
  /*  Template helpers                                                 */
  /* ================================================================ */
  getTypeClass(type: string): string {
    const map: Record<string, string> = {
      'Ransomware': 'ransomware', 'DDoS': 'ddos', 'Phishing': 'phishing',
      'Malware': 'malware', 'Data Breach': 'databreach',
    };
    return map[type] || '';
  }

  getRelativeTime(d: Date): string {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  getBarW(v: number, max: number): number {
    return max > 0 ? Math.max(5, (v / max) * 100) : 5;
  }

  getHeatColor(count: number): string {
    const max = 180;
    const ratio = Math.min(count / max, 1);
    if (ratio < 0.3) return `rgba(102,126,234,${0.1 + ratio})`;
    if (ratio < 0.6) return `rgba(255,145,0,${0.2 + ratio * 0.5})`;
    return `rgba(255,23,68,${0.3 + ratio * 0.5})`;
  }
}
