import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslateModule } from '@ngx-translate/core';
import { ImportService } from '@core/services/import.service';
import { ImportJobDto } from '@core/models';
import { ImportDialogComponent } from './import-dialog.component';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-import-jobs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatExpansionModule,
    TranslateModule
  ],
  template: `
    <div class="import-jobs-container">
      <div class="header">
        <h2>Import Jobs</h2>
        <button mat-raised-button color="primary" (click)="openImportDialog()">
          <mat-icon>add</mat-icon>
          New Import
        </button>
      </div>

      @if (importJobs().length === 0) {
        <mat-card class="empty-state">
          <mat-icon>inbox</mat-icon>
          <h3>No Import Jobs</h3>
          <p>You haven't created any import jobs yet. Click "New Import" to get started.</p>
        </mat-card>
      } @else {
        <mat-card>
          <table mat-table [dataSource]="importJobs()" class="jobs-table">
            <!-- ID Column -->
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let job">{{ job.id }}</td>
            </ng-container>

            <!-- File Name Column -->
            <ng-container matColumnDef="fileName">
              <th mat-header-cell *matHeaderCellDef>File Name</th>
              <td mat-cell *matCellDef="let job">
                <div class="file-name">
                  <mat-icon>{{ getTypeIcon(job.importType) }}</mat-icon>
                  <span>{{ job.fileName }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Type Column -->
            <ng-container matColumnDef="importType">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let job">
                <mat-chip>{{ job.importType }}</mat-chip>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let job">
                <mat-chip [color]="importService.getStatusColor(job.status)">
                  <mat-icon>{{ importService.getStatusIcon(job.status) }}</mat-icon>
                  {{ job.status }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Progress Column -->
            <ng-container matColumnDef="progress">
              <th mat-header-cell *matHeaderCellDef>Progress</th>
              <td mat-cell *matCellDef="let job">
                @if (job.status === 'processing') {
                  <div class="progress-cell">
                    <mat-progress-bar
                      mode="determinate"
                      [value]="job.progressPercent">
                    </mat-progress-bar>
                    <span class="progress-text">{{ job.progressPercent }}%</span>
                  </div>
                } @else if (job.status === 'completed') {
                  <div class="stats">
                    <span class="success">✓ {{ job.successCount }}</span>
                    @if (job.failedCount > 0) {
                      <span class="failed">✗ {{ job.failedCount }}</span>
                    }
                  </div>
                } @else if (job.status === 'failed') {
                  <span class="error-text">Failed</span>
                } @else {
                  <span class="pending-text">Pending</span>
                }
              </td>
            </ng-container>

            <!-- Created At Column -->
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let job">{{ job.createdAt | date:'short' }}</td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let job">
                <button mat-icon-button [matTooltip]="'View Details'" (click)="viewDetails(job)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button [matTooltip]="'Refresh'" (click)="refreshJob(job.id)">
                  <mat-icon>refresh</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="job-row"></tr>
          </table>
        </mat-card>

        <!-- Job Details Panel -->
        @if (selectedJob()) {
          <mat-card class="details-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>{{ importService.getStatusIcon(selectedJob()!.status) }}</mat-icon>
                Job #{{ selectedJob()!.id }} Details
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="details-grid">
                <div class="detail-item">
                  <strong>File Name:</strong>
                  <span>{{ selectedJob()!.fileName }}</span>
                </div>
                <div class="detail-item">
                  <strong>Import Type:</strong>
                  <span>{{ selectedJob()!.importType }}</span>
                </div>
                <div class="detail-item">
                  <strong>Status:</strong>
                  <mat-chip [color]="importService.getStatusColor(selectedJob()!.status)">
                    {{ selectedJob()!.status }}
                  </mat-chip>
                </div>
                <div class="detail-item">
                  <strong>Total Rows:</strong>
                  <span>{{ selectedJob()!.totalRows }}</span>
                </div>
                <div class="detail-item">
                  <strong>Processed:</strong>
                  <span>{{ selectedJob()!.processedRows }}</span>
                </div>
                <div class="detail-item">
                  <strong>Success:</strong>
                  <span class="success">{{ selectedJob()!.successCount }}</span>
                </div>
                <div class="detail-item">
                  <strong>Failed:</strong>
                  <span class="failed">{{ selectedJob()!.failedCount }}</span>
                </div>
                <div class="detail-item">
                  <strong>Progress:</strong>
                  <span>{{ selectedJob()!.progressPercent }}%</span>
                </div>
                <div class="detail-item">
                  <strong>Created At:</strong>
                  <span>{{ selectedJob()!.createdAt | date:'medium' }}</span>
                </div>
                @if (selectedJob()!.startedAt) {
                  <div class="detail-item">
                    <strong>Started At:</strong>
                    <span>{{ selectedJob()!.startedAt | date:'medium' }}</span>
                  </div>
                }
                @if (selectedJob()!.completedAt) {
                  <div class="detail-item">
                    <strong>Completed At:</strong>
                    <span>{{ selectedJob()!.completedAt | date:'medium' }}</span>
                  </div>
                }
              </div>

              @if (selectedJob()!.errorMessage) {
                <mat-expansion-panel class="error-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>error</mat-icon>
                      Error Message
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <p class="error-text">{{ selectedJob()!.errorMessage }}</p>
                </mat-expansion-panel>
              }

              @if (selectedJob()!.errorDetails) {
                <mat-expansion-panel class="error-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>list</mat-icon>
                      Error Details
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <pre class="error-details">{{ selectedJob()!.errorDetails }}</pre>
                </mat-expansion-panel>
              }
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .import-jobs-container {
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
      color: #e0e6f0;
    }

    .empty-state p {
      margin: 0;
      color: #8892a4;
    }

    .jobs-table {
      width: 100%;
    }

    .job-row:hover {
      background: rgba(102, 126, 234, 0.08);
    }

    .file-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .file-name mat-icon {
      color: #667eea;
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 150px;
    }

    .progress-cell mat-progress-bar {
      flex: 1;
    }

    .progress-text {
      font-size: 12px;
      font-weight: 500;
      min-width: 40px;
    }

    .stats {
      display: flex;
      gap: 12px;
    }

    .success {
      color: #4caf50;
      font-weight: 500;
    }

    .failed {
      color: #f44336;
      font-weight: 500;
    }

    .error-text {
      color: #f44336;
    }

    .pending-text {
      color: #999;
    }

    .details-card {
      margin-top: 24px;
    }

    .details-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item strong {
      font-size: 12px;
      color: #8892a4;
      text-transform: uppercase;
    }

    .detail-item span {
      font-size: 16px;
    }

    .error-panel {
      margin-top: 16px;
    }

    .error-panel mat-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-panel mat-icon {
      color: #f44336;
    }

    .error-details {
      background: #1a1f2e;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
  `]
})
export class ImportJobsComponent implements OnInit {
  importJobs = this.importService.importJobs;
  selectedJob = signal<ImportJobDto | null>(null);
  displayedColumns = ['id', 'fileName', 'importType', 'status', 'progress', 'createdAt', 'actions'];

  private pollingSubscription?: Subscription;

  constructor(
    public importService: ImportService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadJobs();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadJobs(): void {
    this.importService.getMyImportJobs().subscribe();
  }

  refreshJob(jobId: number): void {
    this.importService.getImportJob(jobId).subscribe(job => {
      if (this.selectedJob()?.id === jobId) {
        this.selectedJob.set(job);
      }
    });
  }

  viewDetails(job: ImportJobDto): void {
    this.selectedJob.set(job);
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      width: '700px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadJobs();
      }
    });
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'articles':
        return 'article';
      case 'users':
        return 'people';
      case 'sources':
        return 'source';
      case 'keywords':
        return 'label';
      default:
        return 'help';
    }
  }

  private startPolling(): void {
    // Poll every 5 seconds for active jobs
    this.pollingSubscription = interval(5000)
      .pipe(
        switchMap(() => {
          const hasActiveJobs = this.importJobs().some(
            job => job.status === 'pending' || job.status === 'processing'
          );
          if (hasActiveJobs) {
            return this.importService.getMyImportJobs();
          }
          return [];
        })
      )
      .subscribe();
  }

  private stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
  }
}
