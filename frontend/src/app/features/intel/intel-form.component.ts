import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { IntelReportService } from '@core/services/intel-report.service';
import { AuthService } from '@core/services/auth.service';
import { CountryDto, CreateIntelReportRequest } from '@core/models';

@Component({
  selector: 'app-intel-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, TranslateModule
  ],
  template: `
    <div class="form-container">
      <div class="form-header">
        <button mat-icon-button routerLink="/intelligence" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="form-title">{{ isEdit ? ('intel.editReport' | translate) : ('intel.newReport' | translate) }}</h2>
      </div>

      <div class="form-card">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'intel.reportTitle' | translate }}</mat-label>
          <input matInput [(ngModel)]="form.title" maxlength="300">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'intel.reportContent' | translate }}</mat-label>
          <textarea matInput [(ngModel)]="form.content" rows="8"></textarea>
        </mat-form-field>

        <div class="row-fields">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>{{ 'intel.reportType' | translate }}</mat-label>
            <mat-select [(ngModel)]="form.type">
              <mat-option value="threat">{{ 'intel.typeThreat' | translate }}</mat-option>
              <mat-option value="incident">{{ 'intel.typeIncident' | translate }}</mat-option>
              <mat-option value="surveillance">{{ 'intel.typeSurveillance' | translate }}</mat-option>
              <mat-option value="report">{{ 'intel.typeReport' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>{{ 'intel.severity' | translate }}</mat-label>
            <mat-select [(ngModel)]="form.severity">
              <mat-option [value]="0">0 - {{ 'intel.sevInfo' | translate }}</mat-option>
              <mat-option [value]="1">1 - {{ 'intel.sevLow' | translate }}</mat-option>
              <mat-option [value]="2">2 - {{ 'intel.sevModerate' | translate }}</mat-option>
              <mat-option [value]="3">3 - {{ 'intel.sevElevated' | translate }}</mat-option>
              <mat-option [value]="4">4 - {{ 'intel.sevHigh' | translate }}</mat-option>
              <mat-option [value]="5">5 - {{ 'intel.sevCritical' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'intel.sourceInfo' | translate }}</mat-label>
          <input matInput [(ngModel)]="form.sourceInfo" placeholder="e.g. HUMINT, SIGINT, Open Source...">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'intel.affectedCountries' | translate }}</mat-label>
          <mat-select [(ngModel)]="form.affectedCountryCodes" multiple>
            @for (c of countries; track c.code) {
              <mat-option [value]="c.code">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- File Upload -->
        <div class="upload-section">
          <h4>{{ 'intel.attachments' | translate }}</h4>
          <div class="drop-zone" (click)="fileInput.click()"
               (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
            <input #fileInput type="file" multiple hidden (change)="onFilesSelected($event)">
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <p>{{ 'intel.dragDrop' | translate }}</p>
          </div>
          @if (selectedFiles.length > 0) {
            <div class="file-list">
              @for (f of selectedFiles; track f.name; let i = $index) {
                <div class="file-item">
                  <mat-icon>description</mat-icon>
                  <span>{{ f.name }}</span>
                  <span class="file-size">{{ (f.size / 1024) | number:'1.0-0' }} KB</span>
                  <button mat-icon-button (click)="removeFile(i)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <div class="form-actions">
          <button mat-button routerLink="/intelligence">{{ 'common.cancel' | translate }}</button>
          <button mat-raised-button class="submit-btn" (click)="save()" [disabled]="saving">
            <mat-icon>{{ isEdit ? 'save' : 'send' }}</mat-icon>
            {{ isEdit ? ('common.save' | translate) : ('intel.createReport' | translate) }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg-page); padding: 32px 40px; color: var(--text-secondary); }

    .form-container { max-width: 1400px; margin: 0 auto; }
    .form-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .back-btn { color: var(--text-secondary); }
    .form-title { margin: 0; font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg, #667eea, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .form-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: 12px; padding: 32px; }
    .full-width { width: 100%; }
    .row-fields { display: flex; gap: 16px; }
    .half-width { flex: 1; }

    .upload-section { margin: 16px 0; }
    .upload-section h4 { margin: 0 0 12px; color: var(--text-primary); font-weight: 600; }
    .drop-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; border: 2px dashed rgba(102,126,234,0.3); border-radius: 12px; cursor: pointer; transition: border-color 0.3s, background 0.3s; }
    .drop-zone:hover { border-color: #667eea; background: rgba(102,126,234,0.05); }
    .upload-icon { font-size: 40px; width: 40px; height: 40px; color: #667eea; margin-bottom: 8px; }
    .drop-zone p { margin: 0; font-size: 0.85rem; color: var(--text-tertiary); }

    .file-list { margin-top: 12px; }
    .file-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(102,126,234,0.05); border: 1px solid rgba(102,126,234,0.15); margin-bottom: 8px; }
    .file-item mat-icon { font-size: 20px; width: 20px; height: 20px; color: #667eea; }
    .file-item span { font-size: 0.85rem; color: var(--text-primary); }
    .file-size { color: var(--text-tertiary) !important; font-size: 0.75rem !important; margin-inline-start: auto; }

    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-default); }
    .submit-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #667eea, #764ba2) !important; color: #fff !important; }

    @media (max-width: 600px) {
      :host { padding: 16px; }
      .row-fields { flex-direction: column; }
    }
  `]
})
export class IntelFormComponent implements OnInit {
  isEdit = false;
  editId = '';
  saving = false;
  countries: CountryDto[] = [];
  selectedFiles: File[] = [];

  form = {
    title: '',
    content: '',
    type: 'report',
    severity: 0,
    sourceInfo: '',
    affectedCountryCodes: [] as string[]
  };

  constructor(
    private intelService: IntelReportService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load countries
    this.http.get<CountryDto[]>(`${environment.apiUrl}/user/countries`).subscribe(c => this.countries = c);

    // Check for edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editId = id;
      this.intelService.get(id).subscribe(r => {
        this.form.title = r.title;
        this.form.content = r.content;
        this.form.type = r.type;
        this.form.severity = r.severity;
        this.form.sourceInfo = r.sourceInfo || '';
        this.form.affectedCountryCodes = r.affectedCountryCodes || [];
      });
    } else {
      // New report: pre-select the user's profile country as an affected country
      const userCountry = this.auth.user()?.countryCode;
      if (userCountry) {
        this.form.affectedCountryCodes = [userCountry];
      }
    }

    // Pre-populate from query params
    const qp = this.route.snapshot.queryParams;
    if (qp['title']) this.form.title = qp['title'];
    if (qp['content']) this.form.content = qp['content'];
    if (qp['type']) this.form.type = qp['type'];
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles.push(...Array.from(input.files));
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.selectedFiles.push(...Array.from(event.dataTransfer.files));
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  save() {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.snackBar.open('Title and content are required', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    const request: CreateIntelReportRequest = {
      title: this.form.title,
      content: this.form.content,
      type: this.form.type,
      severity: this.form.severity,
      sourceInfo: this.form.sourceInfo || undefined,
      affectedCountryCodes: this.form.affectedCountryCodes.length > 0 ? this.form.affectedCountryCodes : undefined
    };

    const action$ = this.isEdit
      ? this.intelService.update(this.editId, request)
      : this.intelService.create(request);

    action$.subscribe({
      next: (report) => {
        // Upload files sequentially
        if (this.selectedFiles.length > 0) {
          this.uploadFiles(report.id, 0);
        } else {
          this.snackBar.open(this.isEdit ? 'Report updated' : 'Report created', 'OK', { duration: 3000 });
          this.router.navigate(['/intelligence', report.id]);
        }
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Error saving report', 'OK', { duration: 5000 });
      }
    });
  }

  private uploadFiles(reportId: string, index: number) {
    if (index >= this.selectedFiles.length) {
      this.saving = false;
      this.snackBar.open('Report saved with attachments', 'OK', { duration: 3000 });
      this.router.navigate(['/intelligence', reportId]);
      return;
    }

    this.intelService.uploadAttachment(reportId, this.selectedFiles[index]).subscribe({
      next: () => this.uploadFiles(reportId, index + 1),
      error: () => this.uploadFiles(reportId, index + 1) // continue even if one fails
    });
  }
}
