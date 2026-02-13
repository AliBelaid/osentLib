import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { ImportService } from '@core/services/import.service';
import { ImportJobDto, ImportTemplateType } from '@core/models';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>upload_file</mat-icon>
      Import Data
    </h2>

    <mat-dialog-content>
      <mat-stepper [linear]="true" #stepper>
        <!-- Step 1: Select Import Type -->
        <mat-step [completed]="selectedType() !== null">
          <ng-template matStepLabel>Select Import Type</ng-template>
          <div class="step-content">
            <p>Choose the type of data you want to import:</p>

            <div class="import-types">
              @for (type of importTypes; track type.type) {
                <div
                  class="import-type-card"
                  [class.selected]="selectedType()?.type === type.type"
                  (click)="selectType(type)">
                  <mat-icon>{{ getTypeIcon(type.type) }}</mat-icon>
                  <h3>{{ type.label }}</h3>
                  <p>{{ type.description }}</p>
                  @if (type.requiredRole) {
                    <span class="role-badge">{{ type.requiredRole }}</span>
                  }
                </div>
              }
            </div>

            <div class="stepper-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="!selectedType()">
                Next
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 2: Download Template -->
        <mat-step [completed]="templateDownloaded()">
          <ng-template matStepLabel>Download Template</ng-template>
          <div class="step-content">
            <div class="template-section">
              <mat-icon class="large-icon">description</mat-icon>
              <h3>Download CSV Template</h3>
              <p>Download the template file for <strong>{{ selectedType()?.label }}</strong> to ensure your data is formatted correctly.</p>

              <button mat-raised-button color="accent" (click)="downloadTemplate()">
                <mat-icon>download</mat-icon>
                Download Template
              </button>

              @if (templateDownloaded()) {
                <div class="success-message">
                  <mat-icon>check_circle</mat-icon>
                  Template downloaded successfully
                </div>
              }
            </div>

            <div class="stepper-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!templateDownloaded()">
                Next
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 3: Upload File -->
        <mat-step [completed]="selectedFile() !== null">
          <ng-template matStepLabel>Upload File</ng-template>
          <div class="step-content">
            <div class="upload-section">
              <mat-icon class="large-icon">cloud_upload</mat-icon>
              <h3>Upload Your CSV File</h3>
              <p>Select the CSV file you've prepared for import.</p>

              <input
                type="file"
                #fileInput
                accept=".csv,.txt"
                (change)="onFileSelected($event)"
                style="display: none;">

              <button mat-raised-button color="primary" (click)="fileInput.click()">
                <mat-icon>attach_file</mat-icon>
                Choose File
              </button>

              @if (selectedFile()) {
                <div class="file-info">
                  <mat-icon>insert_drive_file</mat-icon>
                  <div>
                    <strong>{{ selectedFile()!.name }}</strong>
                    <span>{{ formatFileSize(selectedFile()!.size) }}</span>
                  </div>
                  <button mat-icon-button (click)="clearFile()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }

              @if (fileError()) {
                <div class="error-message">
                  <mat-icon>error</mat-icon>
                  {{ fileError() }}
                </div>
              }
            </div>

            <div class="stepper-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!selectedFile()">
                Next
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 4: Confirm & Import -->
        <mat-step>
          <ng-template matStepLabel>Confirm & Import</ng-template>
          <div class="step-content">
            @if (!importing() && !importJob()) {
              <div class="confirm-section">
                <mat-icon class="large-icon">check_circle_outline</mat-icon>
                <h3>Ready to Import</h3>
                <p>Please review your import settings:</p>

                <div class="import-summary">
                  <div class="summary-item">
                    <strong>Import Type:</strong>
                    <span>{{ selectedType()?.label }}</span>
                  </div>
                  <div class="summary-item">
                    <strong>File Name:</strong>
                    <span>{{ selectedFile()?.name }}</span>
                  </div>
                  <div class="summary-item">
                    <strong>File Size:</strong>
                    <span>{{ formatFileSize(selectedFile()?.size || 0) }}</span>
                  </div>
                </div>

                <div class="warning-box">
                  <mat-icon>warning</mat-icon>
                  <p>This operation will create new records in the database. Make sure your data is accurate before proceeding.</p>
                </div>
              </div>

              <div class="stepper-actions">
                <button mat-button matStepperPrevious>Back</button>
                <button mat-raised-button color="primary" (click)="startImport()">
                  <mat-icon>upload</mat-icon>
                  Start Import
                </button>
              </div>
            }

            @if (importing()) {
              <div class="importing-section">
                <mat-icon class="large-icon spinning">sync</mat-icon>
                <h3>Importing...</h3>
                <p>Your file is being processed. This may take a few moments.</p>
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              </div>
            }

            @if (importJob() && !importing()) {
              <div class="success-section">
                <mat-icon class="large-icon success">check_circle</mat-icon>
                <h3>Import Started Successfully</h3>
                <p>Your import job has been created and is being processed in the background.</p>

                <div class="job-details">
                  <div class="detail-item">
                    <strong>Job ID:</strong>
                    <span>{{ importJob()!.id }}</span>
                  </div>
                  <div class="detail-item">
                    <strong>Status:</strong>
                    <span>{{ importJob()!.status }}</span>
                  </div>
                </div>

                <p class="info-text">You can track the progress in the Import Jobs page.</p>
              </div>

              <div class="stepper-actions">
                <button mat-raised-button color="primary" (click)="close()">
                  Close
                </button>
              </div>
            }
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 600px;
      min-height: 500px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .step-content {
      padding: 24px 0;
    }

    .import-types {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 24px 0;
    }

    .import-type-card {
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }

    .import-type-card:hover {
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .import-type-card.selected {
      border-color: #1976d2;
      background: #e3f2fd;
    }

    .import-type-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
      margin-bottom: 8px;
    }

    .import-type-card h3 {
      margin: 8px 0;
      font-size: 18px;
    }

    .import-type-card p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .role-badge {
      display: inline-block;
      background: #ff9800;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 8px;
    }

    .template-section,
    .upload-section,
    .confirm-section,
    .importing-section,
    .success-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px;
    }

    .large-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #1976d2;
    }

    .large-icon.success {
      color: #4caf50;
    }

    .large-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      width: 100%;
    }

    .file-info mat-icon {
      color: #1976d2;
    }

    .file-info div {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .file-info span {
      font-size: 14px;
      color: #666;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4caf50;
      font-weight: 500;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-weight: 500;
    }

    .import-summary {
      width: 100%;
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
    }

    .summary-item,
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }

    .warning-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      border-radius: 4px;
      width: 100%;
    }

    .warning-box mat-icon {
      color: #ff9800;
    }

    .warning-box p {
      margin: 0;
    }

    .job-details {
      width: 100%;
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
    }

    .info-text {
      font-size: 14px;
      color: #666;
      font-style: italic;
    }

    .stepper-actions {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      justify-content: flex-end;
    }
  `]
})
export class ImportDialogComponent {
  importTypes: ImportTemplateType[] = [
    {
      type: 'articles',
      label: 'Articles',
      description: 'Import news articles with metadata'
    },
    {
      type: 'users',
      label: 'Users',
      description: 'Import user accounts',
      requiredRole: 'Admin'
    },
    {
      type: 'sources',
      label: 'Sources',
      description: 'Import news sources',
      requiredRole: 'Admin'
    },
    {
      type: 'keywords',
      label: 'Keyword Lists',
      description: 'Import keyword lists for searching'
    }
  ];

  selectedType = signal<ImportTemplateType | null>(null);
  templateDownloaded = signal(false);
  selectedFile = signal<File | null>(null);
  fileError = signal<string | null>(null);
  importing = signal(false);
  importJob = signal<ImportJobDto | null>(null);

  constructor(
    private dialogRef: MatDialogRef<ImportDialogComponent>,
    private importService: ImportService,
    private snackBar: MatSnackBar
  ) {}

  selectType(type: ImportTemplateType): void {
    this.selectedType.set(type);
  }

  downloadTemplate(): void {
    if (!this.selectedType()) return;

    this.importService.downloadTemplateToFile(this.selectedType()!.type);
    this.templateDownloaded.set(true);
    this.snackBar.open('Template downloaded', 'Close', { duration: 2000 });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      this.fileError.set('Only CSV files are allowed');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      this.fileError.set('File size must be less than 50 MB');
      return;
    }

    this.selectedFile.set(file);
    this.fileError.set(null);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  startImport(): void {
    if (!this.selectedType() || !this.selectedFile()) return;

    this.importing.set(true);

    const type = this.selectedType()!.type;
    const file = this.selectedFile()!;

    let importObservable;
    switch (type) {
      case 'articles':
        importObservable = this.importService.importArticles(file);
        break;
      case 'users':
        importObservable = this.importService.importUsers(file);
        break;
      case 'sources':
        importObservable = this.importService.importSources(file);
        break;
      case 'keywords':
        importObservable = this.importService.importKeywordLists(file);
        break;
      default:
        return;
    }

    importObservable.subscribe({
      next: (job) => {
        this.importing.set(false);
        this.importJob.set(job);
        this.snackBar.open('Import started successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.importing.set(false);
        this.snackBar.open(error.error?.error || 'Import failed', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.importJob());
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
}
