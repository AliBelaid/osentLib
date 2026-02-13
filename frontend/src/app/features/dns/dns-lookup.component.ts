import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { DnsService } from '@core/services/dns.service';
import { CreateWatchlistEntryRequest } from '@core/models';

@Component({
  selector: 'app-dns-lookup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="dns-lookup-container">
      <h2>DNS Lookup Tool</h2>

      <!-- Search Card -->
      <mat-card class="search-card">
        <mat-card-content>
          <div class="search-form">
            <mat-form-field appearance="outline" class="domain-input">
              <mat-label>Domain Name</mat-label>
              <input matInput [(ngModel)]="domain" placeholder="example.com" (keyup.enter)="performLookup()">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="performLookup()" [disabled]="loading() || !domain">
              <mat-icon>dns</mat-icon>
              Lookup
            </button>
          </div>

          @if (loading()) {
            <div class="loading-section">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Performing DNS lookup...</p>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Results Card -->
      @if (result()) {
        <mat-card class="results-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>dns</mat-icon>
              DNS Lookup Results for {{ result()!.domain }}
            </mat-card-title>
            <div class="header-actions">
              <button mat-icon-button (click)="addToWatchlist()" matTooltip="Add to Watchlist">
                <mat-icon>add_alert</mat-icon>
              </button>
            </div>
          </mat-card-header>

          <mat-card-content>
            <!-- Risk Assessment Banner -->
            @if (result()!.isSuspicious) {
              <div class="risk-banner suspicious">
                <mat-icon>warning</mat-icon>
                <div>
                  <strong>Suspicious Domain Detected</strong>
                  <p>Risk Score: {{ result()!.riskScore }}/100</p>
                </div>
              </div>
            } @else if (result()!.riskScore > 20) {
              <div class="risk-banner moderate">
                <mat-icon>info</mat-icon>
                <div>
                  <strong>Moderate Risk</strong>
                  <p>Risk Score: {{ result()!.riskScore }}/100</p>
                </div>
              </div>
            } @else {
              <div class="risk-banner safe">
                <mat-icon>check_circle</mat-icon>
                <div>
                  <strong>Low Risk</strong>
                  <p>Risk Score: {{ result()!.riskScore }}/100</p>
                </div>
              </div>
            }

            @if (result()!.riskFactors.length > 0) {
              <div class="risk-factors">
                <strong>Risk Factors:</strong>
                <ul>
                  @for (factor of result()!.riskFactors; track factor) {
                    <li>{{ factor }}</li>
                  }
                </ul>
              </div>
            }

            <!-- DNS Records Tabs -->
            <mat-tab-group class="records-tabs">
              <!-- A Records -->
              <mat-tab label="A Records ({{ result()!.aRecords.length }})">
                <div class="tab-content">
                  @if (result()!.aRecords.length === 0) {
                    <p class="empty-message">No A records found</p>
                  } @else {
                    <div class="records-list">
                      @for (record of result()!.aRecords; track record) {
                        <div class="record-item">
                          <mat-icon>public</mat-icon>
                          <code>{{ record }}</code>
                        </div>
                      }
                    </div>

                    @if (result()!.ipAddress) {
                      <div class="ip-geolocation">
                        <h4>IP Geolocation</h4>
                        <div class="geo-grid">
                          <div class="geo-item">
                            <strong>IP Address:</strong>
                            <span>{{ result()!.ipAddress }}</span>
                          </div>
                          <div class="geo-item">
                            <strong>Country:</strong>
                            <span>{{ result()!.ipCountry || 'Unknown' }}</span>
                          </div>
                          <div class="geo-item">
                            <strong>City:</strong>
                            <span>{{ result()!.ipCity || 'Unknown' }}</span>
                          </div>
                          <div class="geo-item">
                            <strong>ISP:</strong>
                            <span>{{ result()!.ipIsp || 'Unknown' }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  }
                </div>
              </mat-tab>

              <!-- MX Records -->
              <mat-tab label="MX Records ({{ result()!.mxRecords.length }})">
                <div class="tab-content">
                  @if (result()!.mxRecords.length === 0) {
                    <p class="empty-message">No MX records found</p>
                  } @else {
                    <div class="records-list">
                      @for (record of result()!.mxRecords; track record) {
                        <div class="record-item">
                          <mat-icon>mail</mat-icon>
                          <code>{{ record }}</code>
                        </div>
                      }
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- TXT Records -->
              <mat-tab label="TXT Records ({{ result()!.txtRecords.length }})">
                <div class="tab-content">
                  @if (result()!.txtRecords.length === 0) {
                    <p class="empty-message">No TXT records found</p>
                  } @else {
                    <div class="records-list">
                      @for (record of result()!.txtRecords; track record) {
                        <div class="record-item txt">
                          <mat-icon>description</mat-icon>
                          <code>{{ record }}</code>
                        </div>
                      }
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- NS Records -->
              <mat-tab label="NS Records ({{ result()!.nsRecords.length }})">
                <div class="tab-content">
                  @if (result()!.nsRecords.length === 0) {
                    <p class="empty-message">No NS records found</p>
                  } @else {
                    <div class="records-list">
                      @for (record of result()!.nsRecords; track record) {
                        <div class="record-item">
                          <mat-icon>dns</mat-icon>
                          <code>{{ record }}</code>
                        </div>
                      }
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- WHOIS Info -->
              <mat-tab label="WHOIS Info">
                <div class="tab-content">
                  <div class="whois-grid">
                    <div class="whois-item">
                      <strong>Registrar:</strong>
                      <span>{{ result()!.whoisRegistrar || 'Not available' }}</span>
                    </div>
                    <div class="whois-item">
                      <strong>Organization:</strong>
                      <span>{{ result()!.whoisOrganization || 'Not available' }}</span>
                    </div>
                    <div class="whois-item">
                      <strong>Country:</strong>
                      <span>{{ result()!.whoisCountry || 'Not available' }}</span>
                    </div>
                    <div class="whois-item">
                      <strong>Created Date:</strong>
                      <span>{{ result()!.whoisCreatedDate ? (result()!.whoisCreatedDate | date:'medium') : 'Not available' }}</span>
                    </div>
                    <div class="whois-item">
                      <strong>Expiration Date:</strong>
                      <span>{{ result()!.whoisExpirationDate ? (result()!.whoisExpirationDate | date:'medium') : 'Not available' }}</span>
                    </div>
                  </div>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      }

      <!-- Lookup History -->
      @if (history().length > 0) {
        <mat-card class="history-card">
          <mat-card-header>
            <mat-card-title>Recent Lookups</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="history-list">
              @for (lookup of history(); track lookup.id) {
                <div class="history-item" (click)="viewLookup(lookup)">
                  <div class="history-info">
                    <strong>{{ lookup.domain }}</strong>
                    <span class="timestamp">{{ lookup.lookedUpAt | date:'short' }}</span>
                  </div>
                  <div class="history-meta">
                    @if (lookup.isSuspicious) {
                      <mat-chip color="warn">Suspicious</mat-chip>
                    }
                    <span class="risk-score" [style.color]="dnsService.getRiskScoreColor(lookup.riskScore)">
                      Risk: {{ lookup.riskScore }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .dns-lookup-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      margin: 0 0 24px 0;
    }

    .search-card {
      margin-bottom: 24px;
    }

    .search-form {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .domain-input {
      flex: 1;
    }

    .loading-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px;
    }

    .results-card {
      margin-bottom: 24px;
    }

    .results-card mat-card-header {
      display: flex;
      align-items: center;
    }

    .results-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .risk-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .risk-banner mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .risk-banner strong {
      display: block;
      font-size: 18px;
      margin-bottom: 4px;
    }

    .risk-banner p {
      margin: 0;
      font-size: 14px;
    }

    .risk-banner.safe {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .risk-banner.safe mat-icon {
      color: #4caf50;
    }

    .risk-banner.moderate {
      background: #fff3e0;
      color: #e65100;
    }

    .risk-banner.moderate mat-icon {
      color: #ff9800;
    }

    .risk-banner.suspicious {
      background: #ffebee;
      color: #c62828;
    }

    .risk-banner.suspicious mat-icon {
      color: #f44336;
    }

    .risk-factors {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 24px;
    }

    .risk-factors strong {
      display: block;
      margin-bottom: 8px;
    }

    .risk-factors ul {
      margin: 0;
      padding-left: 20px;
    }

    .risk-factors li {
      margin: 4px 0;
    }

    .records-tabs {
      margin-top: 24px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .empty-message {
      text-align: center;
      color: #999;
      padding: 24px;
    }

    .records-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .record-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .record-item.txt {
      align-items: flex-start;
    }

    .record-item mat-icon {
      color: #1976d2;
    }

    .record-item code {
      font-size: 14px;
      word-break: break-all;
    }

    .ip-geolocation {
      margin-top: 24px;
      padding: 16px;
      background: #e3f2fd;
      border-radius: 4px;
    }

    .ip-geolocation h4 {
      margin: 0 0 16px 0;
    }

    .geo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .geo-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .geo-item strong {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .whois-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .whois-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .whois-item strong {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .history-card {
      margin-bottom: 24px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .history-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .history-item:hover {
      background: #f5f5f5;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .history-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-info .timestamp {
      font-size: 12px;
      color: #666;
    }

    .history-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .risk-score {
      font-weight: 500;
      font-size: 14px;
    }
  `]
})
export class DnsLookupComponent {
  domain = '';
  loading = signal(false);
  result = signal<any>(null);
  history = this.dnsService.lookupHistory;

  constructor(
    public dnsService: DnsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.loadHistory();
  }

  performLookup(): void {
    if (!this.domain) return;

    this.loading.set(true);
    this.result.set(null);

    this.dnsService.performLookup(this.domain).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.result.set(result);
        this.snackBar.open('DNS lookup completed', 'Close', { duration: 2000 });
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open(error.error?.error || 'DNS lookup failed', 'Close', { duration: 5000 });
      }
    });
  }

  loadHistory(): void {
    this.dnsService.getLookupHistory().subscribe();
  }

  viewLookup(lookup: any): void {
    this.result.set(lookup);
    this.domain = lookup.domain;
  }

  addToWatchlist(): void {
    if (!this.result()) return;

    const domain = this.result()!.domain;
    const riskLevel = this.result()!.riskScore >= 70 ? 5 :
                      this.result()!.riskScore >= 40 ? 3 : 1;

    const request: CreateWatchlistEntryRequest = {
      domain,
      riskLevel,
      status: this.result()!.isSuspicious ? 'Blocked' : 'Monitor',
      description: `Added from DNS lookup (Risk: ${this.result()!.riskScore})`,
      tags: this.result()!.riskFactors
    };

    this.dnsService.addToWatchlist(request).subscribe({
      next: () => {
        this.snackBar.open('Domain added to watchlist', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(error.error?.error || 'Failed to add to watchlist', 'Close', { duration: 5000 });
      }
    });
  }
}
