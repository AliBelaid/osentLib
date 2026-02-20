import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { BulletinService } from '../../core/services/bulletin.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { CountryDto } from '../../core/models';

// Arabic-speaking African countries
const RTL_COUNTRIES = new Set(['DZ', 'EG', 'LY', 'MA', 'MR', 'SD', 'SO', 'TN', 'DJ', 'KM', 'ER']);

@Component({
  selector: 'app-submit-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatChipsModule, TranslateModule
  ],
  template: `
    <div class="page-container" [dir]="isRtl ? 'rtl' : 'ltr'">

      <!-- Header -->
      <div class="report-header">
        <div class="header-icon-wrap">
          <mat-icon class="header-icon">assignment</mat-icon>
        </div>
        <div>
          <h2>{{ 'submitReport.title' | translate }}</h2>
          <p class="subtitle">{{ 'submitReport.subtitle' | translate }}</p>
        </div>
      </div>

      <!-- Emergency level banner -->
      @if (urgency === 4) {
        <div class="emergency-banner">
          <mat-icon>warning</mat-icon>
          <span>{{ 'submitReport.emergencyBanner' | translate }}</span>
        </div>
      }

      <mat-card class="report-card">
        <mat-card-content>
          <form #reportForm="ngForm" (ngSubmit)="submit()">
            <div class="form-grid">

              <!-- Report Type -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'submitReport.reportType' | translate }}</mat-label>
                <mat-select [(ngModel)]="reportType" name="reportType" required>
                  <mat-option value="emergency">🚨 {{ 'submitReport.typeEmergency' | translate }}</mat-option>
                  <mat-option value="security">🛡️ {{ 'submitReport.typeSecurity' | translate }}</mat-option>
                  <mat-option value="intelligence">🔍 {{ 'submitReport.typeIntelligence' | translate }}</mat-option>
                  <mat-option value="incident">⚡ {{ 'submitReport.typeIncident' | translate }}</mat-option>
                  <mat-option value="news">📰 {{ 'submitReport.typeNews' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Title -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'submitReport.reportTitle' | translate }}</mat-label>
                <input matInput [(ngModel)]="title" name="title" required maxlength="300">
              </mat-form-field>

              <!-- Content -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'submitReport.reportContent' | translate }}</mat-label>
                <textarea matInput [(ngModel)]="content" name="content" required
                          rows="7" maxlength="5000"></textarea>
                <mat-hint align="end">{{ content.length }}/5000</mat-hint>
              </mat-form-field>

              <!-- Country + Emergency Level -->
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>{{ 'submitReport.affectedCountry' | translate }}</mat-label>
                  <mat-select [(ngModel)]="affectedCountry" name="affectedCountry">
                    @for (c of countries(); track c.code) {
                      <mat-option [value]="c.code">{{ c.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>{{ 'submitReport.urgencyLevel' | translate }}</mat-label>
                  <mat-select [(ngModel)]="urgency" name="urgency" required>
                    <mat-option [value]="1">🟢 {{ 'submitReport.urgencyLow' | translate }}</mat-option>
                    <mat-option [value]="2">🟡 {{ 'submitReport.urgencyNormal' | translate }}</mat-option>
                    <mat-option [value]="3">🟠 {{ 'submitReport.urgencyHigh' | translate }}</mat-option>
                    <mat-option [value]="4">🔴 {{ 'submitReport.urgencyEmergency' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <!-- File Attachment -->
              <div class="attachment-section">
                <div class="section-label">
                  <mat-icon>attach_file</mat-icon>
                  {{ 'submitReport.attachment' | translate }}
                  <span class="optional-tag">{{ 'submitReport.optional' | translate }}</span>
                </div>
                @if (!attachedFile) {
                  <label class="drop-zone" (click)="fileInput.click()"
                         (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                    <mat-icon class="upload-icon">cloud_upload</mat-icon>
                    <p>{{ 'submitReport.dropFile' | translate }}</p>
                    <p class="file-hint">PDF, DOC, DOCX, JPG, PNG — max 10MB</p>
                    <input #fileInput type="file" hidden
                           accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                           (change)="onFileSelect($event)">
                  </label>
                } @else {
                  <div class="file-preview">
                    <mat-icon class="file-icon">insert_drive_file</mat-icon>
                    <div class="file-info">
                      <span class="file-name">{{ attachedFile.name }}</span>
                      <span class="file-size">{{ formatSize(attachedFile.size) }}</span>
                    </div>
                    <button mat-icon-button type="button" class="remove-btn" (click)="removeFile()">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <!-- Submit -->
              <div class="submit-area">
                <button mat-raised-button class="submit-btn"
                        [class.emergency-btn]="urgency === 4"
                        type="submit"
                        [disabled]="!reportForm.valid || submitting()">
                  @if (submitting()) {
                    <mat-spinner diameter="20" />
                  } @else {
                    <mat-icon>send</mat-icon>
                  }
                  <span>{{ 'submitReport.submit' | translate }}</span>
                </button>
              </div>

            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .report-header {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 20px;
    }
    .header-icon-wrap {
      width: 52px; height: 52px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(0,212,255,0.1));
      border: 1px solid rgba(102,126,234,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .header-icon {
      font-size: 28px; width: 28px; height: 28px; color: #667eea;
    }
    .report-header h2 {
      margin: 0; font-size: 22px; font-weight: 700; color: var(--text-heading);
    }
    .subtitle { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }

    .emergency-banner {
      display: flex; align-items: center; gap: 10px;
      background: rgba(244, 67, 54, 0.12); border: 1px solid rgba(244, 67, 54, 0.4);
      border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;
      color: #f44336; font-weight: 600; font-size: 14px;
      animation: pulseRed 1.5s ease-in-out infinite;
    }
    @keyframes pulseRed {
      0%, 100% { border-color: rgba(244, 67, 54, 0.4); }
      50% { border-color: rgba(244, 67, 54, 0.8); }
    }

    .report-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-default) !important;
      border-radius: 12px !important;
    }
    .form-grid {
      display: flex; flex-direction: column; gap: 8px;
      padding: 16px 0;
    }
    .full-width { width: 100%; }
    .form-row { display: flex; gap: 16px; }
    .half-width { flex: 1; }

    /* Attachment */
    .attachment-section { margin: 8px 0 16px; }
    .section-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: var(--text-primary);
      margin-bottom: 10px;
    }
    .section-label mat-icon { font-size: 18px; width: 18px; height: 18px; color: #667eea; }
    .optional-tag {
      font-size: 11px; color: var(--text-tertiary); font-weight: 400;
      background: rgba(102,126,234,0.1); padding: 2px 6px; border-radius: 4px;
    }
    .drop-zone {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 28px 32px; border: 2px dashed rgba(102,126,234,0.3); border-radius: 12px;
      cursor: pointer; transition: all 0.2s;
    }
    .drop-zone:hover { border-color: #667eea; background: rgba(102,126,234,0.04); }
    .upload-icon { font-size: 36px; width: 36px; height: 36px; color: #667eea; margin-bottom: 6px; }
    .drop-zone p { margin: 2px 0; font-size: 13px; color: var(--text-secondary); }
    .file-hint { font-size: 11px !important; color: var(--text-tertiary) !important; }

    .file-preview {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: 8px;
      background: rgba(102,126,234,0.06); border: 1px solid rgba(102,126,234,0.2);
    }
    .file-icon { font-size: 24px; width: 24px; height: 24px; color: #667eea; }
    .file-info { flex: 1; display: flex; flex-direction: column; }
    .file-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .file-size { font-size: 11px; color: var(--text-tertiary); }
    .remove-btn { color: var(--text-tertiary); }
    .remove-btn:hover { color: #f44336; }

    /* Submit */
    .submit-area { display: flex; justify-content: flex-end; margin-top: 16px; }
    .submit-btn {
      background: linear-gradient(135deg, #667eea, #5a67d8) !important;
      color: #fff !important; font-weight: 600 !important;
      padding: 0 32px !important; height: 44px !important;
      border-radius: 8px !important; display: flex; align-items: center; gap: 8px;
    }
    .emergency-btn {
      background: linear-gradient(135deg, #f44336, #c62828) !important;
      animation: pulseBtn 1s ease-in-out infinite;
    }
    @keyframes pulseBtn {
      0%, 100% { box-shadow: 0 0 0 0 rgba(244,67,54,0.4); }
      50% { box-shadow: 0 0 0 8px rgba(244,67,54,0); }
    }
    .submit-btn:disabled { opacity: 0.6; animation: none !important; }

    ::ng-deep .report-card .mat-mdc-form-field-subscript-wrapper { display: none; }
    ::ng-deep .report-card mat-hint { display: block; text-align: end; font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
  `]
})
export class SubmitReportComponent implements OnInit {
  reportType = '';
  title = '';
  content = '';
  affectedCountry = '';
  urgency = 2;
  attachedFile: File | null = null;

  countries = signal<CountryDto[]>([]);
  submitting = signal(false);

  get isRtl(): boolean {
    return RTL_COUNTRIES.has(this.affectedCountry || this.auth.user()?.countryCode || '');
  }

  constructor(
    private bulletinService: BulletinService,
    private userService: UserService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userService.listCountries().subscribe(c => this.countries.set(c));
    this.affectedCountry = this.auth.user()?.countryCode ?? '';
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setFile(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open(this.translate.instant('submitReport.fileTooLarge'), 'OK', { duration: 4000 });
      return;
    }
    this.attachedFile = file;
  }

  removeFile() { this.attachedFile = null; }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  submit() {
    if (this.submitting()) return;
    this.submitting.set(true);

    this.bulletinService.submitReport({
      title: this.title,
      content: this.content,
      reportType: this.reportType,
      urgency: this.urgency,
      affectedCountry: this.affectedCountry || undefined,
      attachment: this.attachedFile ?? undefined
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open(this.translate.instant('submitReport.success'), 'OK', { duration: 5000 });
        this.resetForm();
        this.router.navigate(['/cyber/incidents']);
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open(this.translate.instant('submitReport.error'), 'OK', { duration: 5000 });
      }
    });
  }

  private resetForm() {
    this.reportType = '';
    this.title = '';
    this.content = '';
    this.urgency = 2;
    this.attachedFile = null;
  }
}
