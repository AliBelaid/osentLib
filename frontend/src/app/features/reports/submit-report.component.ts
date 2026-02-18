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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BulletinService } from '../../core/services/bulletin.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { CountryDto } from '../../core/models';

@Component({
  selector: 'app-submit-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule, TranslateModule
  ],
  template: `
    <div class="page-container">
      <div class="report-header">
        <mat-icon class="header-icon">assignment</mat-icon>
        <div>
          <h2>{{ 'submitReport.title' | translate }}</h2>
          <p class="subtitle">{{ 'submitReport.subtitle' | translate }}</p>
        </div>
      </div>

      <mat-card class="report-card">
        <mat-card-content>
          <form #reportForm="ngForm" (ngSubmit)="submit()">
            <div class="form-grid">

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'submitReport.reportType' | translate }}</mat-label>
                <mat-select [(ngModel)]="reportType" name="reportType" required>
                  <mat-option value="emergency">{{ 'submitReport.typeEmergency' | translate }}</mat-option>
                  <mat-option value="intelligence">{{ 'submitReport.typeIntelligence' | translate }}</mat-option>
                  <mat-option value="news">{{ 'submitReport.typeNews' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'submitReport.reportTitle' | translate }}</mat-label>
                <input matInput [(ngModel)]="title" name="title" required maxlength="300">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'submitReport.reportContent' | translate }}</mat-label>
                <textarea matInput [(ngModel)]="content" name="content" required
                          rows="6" maxlength="5000"></textarea>
              </mat-form-field>

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
                    <mat-option [value]="1">{{ 'submitReport.urgencyLow' | translate }}</mat-option>
                    <mat-option [value]="2">{{ 'submitReport.urgencyMedium' | translate }}</mat-option>
                    <mat-option [value]="3">{{ 'submitReport.urgencyHigh' | translate }}</mat-option>
                    <mat-option [value]="4">{{ 'submitReport.urgencyCritical' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="submit-area">
                <button mat-raised-button class="submit-btn" type="submit"
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
      margin-bottom: 24px;
    }
    .header-icon {
      font-size: 36px; width: 36px; height: 36px;
      color: #667eea;
      filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.4));
    }
    .report-header h2 {
      margin: 0; font-size: 24px; font-weight: 700;
      color: var(--text-heading);
    }
    .subtitle {
      margin: 4px 0 0; font-size: 13px;
      color: var(--text-secondary);
    }

    .report-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-default) !important;
      border-radius: 12px !important;
      max-width: 800px;
    }

    .form-grid {
      display: flex; flex-direction: column; gap: 8px;
      padding: 16px 0;
    }

    .full-width { width: 100%; }

    .form-row {
      display: flex; gap: 16px;
    }
    .half-width { flex: 1; }

    .submit-area {
      display: flex; justify-content: flex-end;
      margin-top: 16px;
    }

    .submit-btn {
      background: linear-gradient(135deg, #667eea, #5a67d8) !important;
      color: #fff !important;
      font-weight: 600 !important;
      padding: 0 32px !important;
      height: 44px !important;
      border-radius: 8px !important;
      display: flex; align-items: center; gap: 8px;
    }
    .submit-btn:disabled {
      opacity: 0.6;
    }

    ::ng-deep .report-card .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
  `]
})
export class SubmitReportComponent implements OnInit {
  reportType = '';
  title = '';
  content = '';
  affectedCountry = '';
  urgency = 2;
  countries = signal<CountryDto[]>([]);
  submitting = signal(false);

  constructor(
    private bulletinService: BulletinService,
    private userService: UserService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.userService.listCountries().subscribe(c => this.countries.set(c));
    this.affectedCountry = this.auth.user()?.countryCode ?? '';
  }

  submit() {
    if (this.submitting()) return;
    this.submitting.set(true);

    this.bulletinService.submitReport({
      title: this.title,
      content: this.content,
      reportType: this.reportType,
      urgency: this.urgency,
      affectedCountry: this.affectedCountry || undefined
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open(
          this.translate.instant('submitReport.success'),
          'OK', { duration: 5000 }
        );
        this.resetForm();
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open(
          this.translate.instant('submitReport.error'),
          'OK', { duration: 5000 }
        );
      }
    });
  }

  private resetForm() {
    this.reportType = '';
    this.title = '';
    this.content = '';
    this.urgency = 2;
  }
}
