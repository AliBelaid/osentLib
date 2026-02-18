import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { DnsService } from '@core/services/dns.service';
import { DomainWatchlistDto, CreateWatchlistEntryRequest, UpdateWatchlistEntryRequest } from '@core/models';

@Component({
  selector: 'app-watchlist-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ entry ? 'Edit' : 'Add' }} Watchlist Entry</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Domain</mat-label>
        <input matInput [(ngModel)]="domain" [disabled]="!!entry" required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description</mat-label>
        <textarea matInput [(ngModel)]="description" rows="2"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="status">
          <mat-option value="Monitor">Monitor</mat-option>
          <mat-option value="Blocked">Blocked</mat-option>
          <mat-option value="Trusted">Trusted</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Risk Level (1-5)</mat-label>
        <mat-select [(ngModel)]="riskLevel">
          <mat-option [value]="1">1 - Low</mat-option>
          <mat-option [value]="2">2 - Moderate</mat-option>
          <mat-option [value]="3">3 - Elevated</mat-option>
          <mat-option [value]="4">4 - High</mat-option>
          <mat-option [value]="5">5 - Critical</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Tags (comma-separated)</mat-label>
        <input matInput [(ngModel)]="tagsText">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes</mat-label>
        <textarea matInput [(ngModel)]="notes" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
        [mat-dialog-close]="getFormData()"
        [disabled]="!domain || !status || !riskLevel">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 16px; }`]
})
export class WatchlistDialogComponent {
  entry?: DomainWatchlistDto;
  domain = '';
  description = '';
  status = 'Monitor';
  riskLevel = 3;
  tagsText = '';
  notes = '';

  ngOnInit() {
    if (this.entry) {
      this.domain = this.entry.domain;
      this.description = this.entry.description || '';
      this.status = this.entry.status;
      this.riskLevel = this.entry.riskLevel;
      this.tagsText = this.entry.tags.join(', ');
      this.notes = this.entry.notes || '';
    }
  }

  getFormData(): any {
    const tags = this.tagsText.split(',').map(t => t.trim()).filter(t => t);

    if (this.entry) {
      return {
        description: this.description || undefined,
        status: this.status,
        riskLevel: this.riskLevel,
        tags,
        notes: this.notes || undefined
      };
    } else {
      return {
        domain: this.domain,
        description: this.description || undefined,
        status: this.status,
        riskLevel: this.riskLevel,
        tags,
        notes: this.notes || undefined
      };
    }
  }
}

@Component({
  selector: 'app-domain-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="watchlist-container">
      <div class="header">
        <h2>Domain Watchlist</h2>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="filter-select">
            <mat-label>Status Filter</mat-label>
            <mat-select [(ngModel)]="statusFilter" (ngModelChange)="loadWatchlist()">
              <mat-option [value]="null">All</mat-option>
              <mat-option value="Monitor">Monitor</mat-option>
              <mat-option value="Blocked">Blocked</mat-option>
              <mat-option value="Trusted">Trusted</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="openDialog()">
            <mat-icon>add</mat-icon>
            Add Domain
          </button>
        </div>
      </div>

      <mat-card>
        <table mat-table [dataSource]="watchlist()" class="watchlist-table">
          <!-- Domain Column -->
          <ng-container matColumnDef="domain">
            <th mat-header-cell *matHeaderCellDef>Domain</th>
            <td mat-cell *matCellDef="let entry">
              <div class="domain-cell">
                <mat-icon>language</mat-icon>
                <strong>{{ entry.domain }}</strong>
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let entry">
              <mat-chip [color]="dnsService.getStatusColor(entry.status)">
                {{ entry.status }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Risk Level Column -->
          <ng-container matColumnDef="riskLevel">
            <th mat-header-cell *matHeaderCellDef>Risk Level</th>
            <td mat-cell *matCellDef="let entry">
              <mat-chip [color]="dnsService.getRiskLevelColor(entry.riskLevel)">
                {{ dnsService.getRiskLevelLabel(entry.riskLevel) }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Tags Column -->
          <ng-container matColumnDef="tags">
            <th mat-header-cell *matHeaderCellDef>Tags</th>
            <td mat-cell *matCellDef="let entry">
              @if (entry.tags.length > 0) {
                <mat-chip-set>
                  @for (tag of entry.tags.slice(0, 3); track tag) {
                    <mat-chip>{{ tag }}</mat-chip>
                  }
                  @if (entry.tags.length > 3) {
                    <mat-chip>+{{ entry.tags.length - 3 }}</mat-chip>
                  }
                </mat-chip-set>
              } @else {
                <span class="no-tags">No tags</span>
              }
            </td>
          </ng-container>

          <!-- Detections Column -->
          <ng-container matColumnDef="detections">
            <th mat-header-cell *matHeaderCellDef>Detections</th>
            <td mat-cell *matCellDef="let entry">
              <div class="detection-cell">
                <mat-icon [matTooltip]="'Detected ' + entry.detectionCount + ' times'">
                  {{ entry.detectionCount > 0 ? 'visibility' : 'visibility_off' }}
                </mat-icon>
                <span>{{ entry.detectionCount }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Added By Column -->
          <ng-container matColumnDef="addedBy">
            <th mat-header-cell *matHeaderCellDef>Added By</th>
            <td mat-cell *matCellDef="let entry">
              <span class="username">{{ entry.addedByUsername || 'Unknown' }}</span>
            </td>
          </ng-container>

          <!-- Created At Column -->
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let entry">
              {{ entry.createdAt | date:'short' }}
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let entry">
              <button mat-icon-button [matTooltip]="'Edit'" (click)="openDialog(entry)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [matTooltip]="'Delete'" (click)="deleteEntry(entry)" color="warn">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="watchlist-row"></tr>
        </table>

        @if (watchlist().length === 0) {
          <div class="empty-state">
            <mat-icon>shield</mat-icon>
            <h3>No Domains in Watchlist</h3>
            <p>Add domains to monitor, block, or trust them.</p>
          </div>
        }
      </mat-card>

      <!-- Stats Card -->
      <mat-card class="stats-card">
        <mat-card-header>
          <mat-card-title>Watchlist Statistics</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="stats-grid">
            <div class="stat-item">
              <mat-icon>visibility</mat-icon>
              <div>
                <strong>{{ getCount('Monitor') }}</strong>
                <span>Monitored</span>
              </div>
            </div>
            <div class="stat-item">
              <mat-icon>block</mat-icon>
              <div>
                <strong>{{ getCount('Blocked') }}</strong>
                <span>Blocked</span>
              </div>
            </div>
            <div class="stat-item">
              <mat-icon>verified</mat-icon>
              <div>
                <strong>{{ getCount('Trusted') }}</strong>
                <span>Trusted</span>
              </div>
            </div>
            <div class="stat-item">
              <mat-icon>list</mat-icon>
              <div>
                <strong>{{ watchlist().length }}</strong>
                <span>Total</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .watchlist-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h2 {
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .filter-select {
      width: 180px;
    }

    .watchlist-table {
      width: 100%;
    }

    .watchlist-row:hover {
      background: rgba(102, 126, 234, 0.08);
    }

    .domain-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .domain-cell mat-icon {
      color: #667eea;
    }

    .detection-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .detection-cell mat-icon {
      color: var(--text-secondary);
    }

    .no-tags {
      color: #999;
      font-style: italic;
      font-size: 14px;
    }

    .username {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 24px;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 96px;
      width: 96px;
      height: 96px;
      color: #999;
      margin-bottom: 24px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: var(--text-primary);
    }

    .empty-state p {
      margin: 0;
      color: var(--text-secondary);
    }

    .stats-card {
      margin-top: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 24px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--bg-card);
      border-radius: 8px;
    }

    .stat-item mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #667eea;
    }

    .stat-item div {
      display: flex;
      flex-direction: column;
    }

    .stat-item strong {
      font-size: 24px;
      color: var(--text-primary);
    }

    .stat-item span {
      font-size: 14px;
      color: var(--text-secondary);
    }
  `]
})
export class DomainWatchlistComponent implements OnInit {
  watchlist = this.dnsService.watchlist;
  statusFilter: string | null = null;
  displayedColumns = ['domain', 'status', 'riskLevel', 'tags', 'detections', 'addedBy', 'createdAt', 'actions'];

  constructor(
    public dnsService: DnsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadWatchlist();
  }

  loadWatchlist(): void {
    this.dnsService.getWatchlist(this.statusFilter || undefined).subscribe();
  }

  openDialog(entry?: DomainWatchlistDto): void {
    const dialogRef = this.dialog.open(WatchlistDialogComponent, {
      width: '600px'
    });

    if (entry) {
      dialogRef.componentInstance.entry = entry;
    }

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (entry) {
          this.dnsService.updateWatchlist(entry.id, result).subscribe(() => {
            this.snackBar.open('Watchlist entry updated', 'Close', { duration: 2000 });
          });
        } else {
          this.dnsService.addToWatchlist(result).subscribe(() => {
            this.snackBar.open('Domain added to watchlist', 'Close', { duration: 2000 });
          });
        }
      }
    });
  }

  deleteEntry(entry: DomainWatchlistDto): void {
    if (confirm(`Delete ${entry.domain} from watchlist?`)) {
      this.dnsService.deleteWatchlist(entry.id).subscribe(() => {
        this.snackBar.open('Watchlist entry deleted', 'Close', { duration: 2000 });
      });
    }
  }

  getCount(status: string): number {
    return this.watchlist().filter(w => w.status === status).length;
  }
}
