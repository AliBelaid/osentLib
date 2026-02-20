import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { IntelReportService } from '@core/services/intel-report.service';
import {
  IntelReportDto, IntelTimelineEntryDto, IntelReportLinkDto,
  IntelReportSummaryDto
} from '@core/models';

@Component({
  selector: 'app-intel-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, TranslateModule
  ],
  template: `
    @if (report) {
      <div class="detail-container">
        <!-- Header -->
        <div class="detail-header">
          <button mat-icon-button routerLink="/intelligence" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-info">
            <div class="badges-row">
              <span class="status-badge" [ngClass]="{'status-active': report.status === 'active', 'status-closed': report.status === 'closed'}">
                <span class="status-dot"></span>
                {{ report.status | uppercase }}
              </span>
              <span class="type-chip">{{ report.type | uppercase }}</span>
              <span class="severity-chip" [ngClass]="{
                'sev-chip-critical': report.severity >= 5,
                'sev-chip-high': report.severity === 4,
                'sev-chip-elevated': report.severity === 3,
                'sev-chip-moderate': report.severity === 2,
                'sev-chip-low': report.severity <= 1
              }">SEV {{ report.severity }}</span>
            </div>
            <h1 class="report-title">{{ report.title }}</h1>
            <div class="report-meta">
              <mat-icon class="meta-icon">person_outline</mat-icon>
              <span>{{ report.createdByName }}</span>
              <span class="meta-sep">//</span>
              <mat-icon class="meta-icon">flag</mat-icon>
              <span>{{ report.countryCode }}</span>
              <span class="meta-sep">//</span>
              <mat-icon class="meta-icon">schedule</mat-icon>
              <span>{{ report.createdAt | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
          </div>
          <div class="header-actions">
            @if (canEdit) {
              <button mat-button class="action-btn action-edit" [routerLink]="['/intelligence', report.id, 'edit']">
                <mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}
              </button>
            }
            @if (canChangeStatus) {
              @if (report.status === 'active') {
                <button mat-button class="action-btn action-close" (click)="changeStatus('closed')">
                  <mat-icon>lock</mat-icon> {{ 'intel.closeReport' | translate }}
                </button>
              } @else {
                <button mat-button class="action-btn action-reopen" (click)="changeStatus('active')">
                  <mat-icon>lock_open</mat-icon> {{ 'intel.reopenReport' | translate }}
                </button>
              }
            }
            @if (canDelete) {
              <button mat-button class="action-btn action-delete" (click)="deleteReport()">
                <mat-icon>delete_outline</mat-icon> {{ 'common.delete' | translate }}
              </button>
            }
          </div>
        </div>

        <!-- Content Section -->
        <div class="content-section">
          <div class="section-card">
            <h3 class="section-title"><mat-icon>article</mat-icon> {{ 'intel.reportContent' | translate }}</h3>
            <div class="report-content">{{ report.content }}</div>
            @if (report.sourceInfo) {
              <div class="source-info">
                <mat-icon>source</mat-icon>
                <strong>{{ 'intel.sourceInfo' | translate }}:</strong> {{ report.sourceInfo }}
              </div>
            }
          </div>

          <!-- Affected Countries -->
          @if (report.affectedCountryCodes.length > 0) {
            <div class="section-card">
              <h3 class="section-title"><mat-icon>flag</mat-icon> {{ 'intel.affectedCountries' | translate }}</h3>
              <mat-chip-set>
                @for (cc of report.affectedCountryCodes; track cc) {
                  <mat-chip>{{ cc }}</mat-chip>
                }
              </mat-chip-set>
            </div>
          }

          <!-- Attachments -->
          @if (report.attachments.length > 0) {
            <div class="section-card">
              <h3 class="section-title"><mat-icon>attach_file</mat-icon> {{ 'intel.attachments' | translate }} ({{ report.attachments.length }})</h3>
              @for (a of report.attachments; track a.id) {
                <div class="attachment-item">
                  <mat-icon>description</mat-icon>
                  <span class="att-name">{{ a.fileName }}</span>
                  <span class="att-size">{{ (a.sizeBytes / 1024) | number:'1.0-0' }} KB</span>
                  <a [href]="intelService.downloadAttachmentUrl(report.id, a.id)" target="_blank" mat-icon-button>
                    <mat-icon>download</mat-icon>
                  </a>
                  @if (canEdit) {
                    <button mat-icon-button (click)="deleteAttachment(a.id)" color="warn">
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Upload attachment (inline) -->
          @if (canEdit) {
            <div class="section-card upload-inline">
              <input #fileInput type="file" hidden (change)="uploadAttachment($event)">
              <button mat-button class="action-btn action-edit" (click)="fileInput.click()">
                <mat-icon>upload_file</mat-icon> {{ 'intel.uploadAttachment' | translate }}
              </button>
            </div>
          }
        </div>

        <!-- Linked Reports -->
        <div class="section-card">
          <h3 class="section-title"><mat-icon>link</mat-icon> {{ 'intel.linkedReports' | translate }} ({{ links.length }})</h3>
          @for (l of links; track l.id) {
            <div class="link-item">
              <span class="link-type">{{ l.linkType | uppercase }}</span>
              <a class="link-title" [routerLink]="['/intelligence', l.sourceReportId === report.id ? l.targetReportId : l.sourceReportId]">
                {{ l.sourceReportId === report.id ? l.targetReportTitle : l.sourceReportTitle }}
              </a>
              <span class="link-meta">by {{ l.createdByName }} &mdash; {{ l.createdAt | date:'dd MMM yyyy' }}</span>
              @if (canEdit) {
                <button mat-icon-button (click)="deleteLink(l.id)" color="warn">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </div>
          }

          @if (canEdit) {
            <div class="link-form">
              @if (!showLinkSearch) {
                <button mat-button class="action-btn action-edit" (click)="showLinkSearch = true">
                  <mat-icon>add_link</mat-icon> {{ 'intel.linkReport' | translate }}
                </button>
              } @else {
                <div class="link-search-panel">
                  <mat-form-field appearance="outline" class="link-search-field">
                    <mat-label>{{ 'intel.searchReports' | translate }}</mat-label>
                    <input matInput [(ngModel)]="linkSearchQuery" (keyup.enter)="searchReports()">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="link-type-field">
                    <mat-label>{{ 'intel.linkType' | translate }}</mat-label>
                    <mat-select [(ngModel)]="linkType">
                      <mat-option value="related">Related</mat-option>
                      <mat-option value="follow-up">Follow-up</mat-option>
                      <mat-option value="duplicate">Duplicate</mat-option>
                      <mat-option value="supersedes">Supersedes</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-icon-button (click)="searchReports()"><mat-icon>search</mat-icon></button>
                  <button mat-icon-button (click)="showLinkSearch = false"><mat-icon>close</mat-icon></button>
                </div>
                @for (sr of searchResults; track sr.id) {
                  <div class="search-result-item" (click)="createLink(sr.id)">
                    <span class="sr-type">{{ sr.type }}</span>
                    <span class="sr-title">{{ sr.title }}</span>
                    <span class="sr-date">{{ sr.createdAt | date:'dd MMM' }}</span>
                  </div>
                }
              }
            </div>
          }
        </div>

        <!-- Timeline -->
        <div class="section-card timeline-section">
          <h3 class="section-title"><mat-icon>timeline</mat-icon> {{ 'intel.timeline' | translate }} ({{ timeline.length }})</h3>

          <div class="timeline">
            @for (entry of timeline; track entry.id) {
              <div class="timeline-entry" [ngClass]="{
                'entry-creation': entry.entryType === 'creation',
                'entry-status': entry.entryType === 'status_change',
                'entry-comment': entry.entryType === 'comment'
              }">
                <div class="timeline-dot-line">
                  <div class="timeline-dot">
                    @if (entry.entryType === 'creation') { <mat-icon>add_circle</mat-icon> }
                    @else if (entry.entryType === 'status_change') { <mat-icon>swap_horiz</mat-icon> }
                    @else { <mat-icon>chat_bubble</mat-icon> }
                  </div>
                  <div class="timeline-line"></div>
                </div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <strong>{{ entry.userName }}</strong>
                    <span class="entry-type-label">{{ entry.entryType }}</span>
                    <span class="timeline-date">{{ entry.createdAt | date:'dd MMM yyyy, HH:mm' }}</span>
                  </div>
                  <p class="timeline-text">{{ entry.content }}</p>
                  @if (entry.attachments.length > 0) {
                    <div class="timeline-attachments">
                      @for (a of entry.attachments; track a.id) {
                        <span class="timeline-att">
                          <mat-icon>attach_file</mat-icon> {{ a.fileName }}
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Add Comment -->
          <div class="add-comment">
            <mat-form-field appearance="outline" class="comment-field">
              <mat-label>{{ 'intel.addComment' | translate }}</mat-label>
              <textarea matInput [(ngModel)]="newComment" rows="3"></textarea>
            </mat-form-field>
            <div class="comment-actions">
              <input #timelineFileInput type="file" hidden (change)="onTimelineFileSelected($event)">
              <button mat-icon-button (click)="timelineFileInput.click()" class="attach-btn">
                <mat-icon>attach_file</mat-icon>
              </button>
              @if (timelineFile) {
                <span class="timeline-file-name">{{ timelineFile.name }}</span>
              }
              <button mat-raised-button class="submit-comment-btn" (click)="addComment()" [disabled]="!newComment.trim()">
                <mat-icon>send</mat-icon> {{ 'intel.postComment' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg-page); padding: 32px 40px; color: var(--text-secondary); }

    .detail-container { max-width: 960px; margin: 0 auto; }

    .detail-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border-default); }
    .back-btn { color: var(--text-secondary); margin-top: 4px; }
    .header-info { flex: 1; }
    .badges-row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .report-title { margin: 0 0 10px; font-size: 1.6rem; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
    .report-meta { display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-tertiary); flex-wrap: wrap; }
    .meta-icon { font-size: 15px; width: 15px; height: 15px; color: var(--text-secondary); }
    .meta-sep { margin: 0 4px; color: var(--text-primary); }
    .header-actions { display: flex; flex-direction: column; gap: 8px; }

    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-active { color: #00e676; background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); }
    .status-active .status-dot { background: #00e676; box-shadow: 0 0 6px rgba(0,230,118,0.7); }
    .status-closed { color: #78909c; background: rgba(120,144,156,0.1); border: 1px solid rgba(120,144,156,0.3); }
    .status-closed .status-dot { background: #78909c; }
    .type-chip { display: inline-flex; padding: 3px 12px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; color: #667eea; background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.25); }
    .severity-chip { display: inline-flex; padding: 3px 10px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; }
    .sev-chip-critical { color: #ff1744; background: rgba(255,23,68,0.1); border: 1px solid rgba(255,23,68,0.3); }
    .sev-chip-high { color: #ff5252; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.3); }
    .sev-chip-elevated { color: #ffa726; background: rgba(255,167,38,0.1); border: 1px solid rgba(255,167,38,0.3); }
    .sev-chip-moderate { color: #ffc107; background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); }
    .sev-chip-low { color: #00e676; background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); }

    .action-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 16px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; border: 1px solid; background: transparent; cursor: pointer; transition: all 0.25s ease; }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-edit { color: #667eea; border-color: rgba(102,126,234,0.3); }
    .action-edit:hover { background: rgba(102,126,234,0.1); border-color: #667eea; }
    .action-close { color: #ffa726; border-color: rgba(255,167,38,0.3); }
    .action-close:hover { background: rgba(255,167,38,0.1); border-color: #ffa726; }
    .action-reopen { color: #00e676; border-color: rgba(0,230,118,0.3); }
    .action-reopen:hover { background: rgba(0,230,118,0.1); border-color: #00e676; }
    .action-delete { color: #ff1744; border-color: rgba(255,23,68,0.3); }
    .action-delete:hover { background: rgba(255,23,68,0.1); border-color: #ff1744; }

    .section-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; font-size: 1.05rem; font-weight: 600; color: var(--text-primary); }
    .section-title mat-icon { font-size: 22px; width: 22px; height: 22px; color: #667eea; }
    .report-content { font-size: 0.92rem; line-height: 1.8; color: var(--text-secondary); white-space: pre-wrap; }
    .source-info { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-default); font-size: 0.85rem; color: var(--text-tertiary); }
    .source-info mat-icon { font-size: 18px; width: 18px; height: 18px; color: #667eea; }

    .content-section { margin-bottom: 4px; }
    .upload-inline { padding: 12px 24px; }

    .attachment-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(102,126,234,0.05); border: 1px solid rgba(102,126,234,0.15); margin-bottom: 8px; }
    .attachment-item mat-icon { font-size: 20px; width: 20px; height: 20px; color: #667eea; }
    .att-name { font-size: 0.85rem; color: var(--text-primary); flex: 1; }
    .att-size { font-size: 0.75rem; color: var(--text-tertiary); }

    /* Links */
    .link-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-default); margin-bottom: 8px; }
    .link-type { font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; color: #667eea; padding: 2px 8px; border-radius: 4px; background: rgba(102,126,234,0.1); }
    .link-title { font-size: 0.88rem; color: #00d4ff; text-decoration: none; flex: 1; cursor: pointer; }
    .link-title:hover { text-decoration: underline; }
    .link-meta { font-size: 0.72rem; color: var(--text-tertiary); }

    .link-form { margin-top: 12px; }
    .link-search-panel { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .link-search-field { flex: 1; min-width: 200px; }
    .link-type-field { width: 160px; }
    .search-result-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-default); margin-bottom: 6px; cursor: pointer; transition: background 0.2s; }
    .search-result-item:hover { background: rgba(102,126,234,0.1); }
    .sr-type { font-size: 0.68rem; font-weight: 700; color: #667eea; text-transform: uppercase; }
    .sr-title { flex: 1; font-size: 0.85rem; color: var(--text-primary); }
    .sr-date { font-size: 0.72rem; color: var(--text-tertiary); }

    /* Timeline */
    .timeline-section { margin-bottom: 0; }
    .timeline { margin-bottom: 24px; }
    .timeline-entry { display: flex; gap: 16px; margin-bottom: 0; }
    .timeline-dot-line { display: flex; flex-direction: column; align-items: center; width: 32px; }
    .timeline-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .timeline-dot mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .timeline-line { width: 2px; flex: 1; min-height: 20px; background: var(--border-default); }
    .entry-creation .timeline-dot { background: rgba(0,230,118,0.15); color: #00e676; }
    .entry-status .timeline-dot { background: rgba(255,167,38,0.15); color: #ffa726; }
    .entry-comment .timeline-dot { background: rgba(102,126,234,0.15); color: #667eea; }
    .timeline-content { flex: 1; padding-bottom: 20px; }
    .timeline-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
    .timeline-header strong { font-size: 0.88rem; color: var(--text-primary); }
    .entry-type-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; color: var(--text-tertiary); background: rgba(255,255,255,0.05); }
    .timeline-date { font-size: 0.72rem; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; }
    .timeline-text { margin: 4px 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; }
    .timeline-attachments { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
    .timeline-att { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #667eea; padding: 2px 8px; border-radius: 4px; background: rgba(102,126,234,0.08); }
    .timeline-att mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Add comment */
    .add-comment { padding-top: 20px; border-top: 1px solid var(--border-default); }
    .comment-field { width: 100%; }
    .comment-actions { display: flex; align-items: center; gap: 8px; }
    .attach-btn { color: #667eea; }
    .timeline-file-name { font-size: 0.8rem; color: var(--text-tertiary); }
    .submit-comment-btn { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #667eea, #764ba2) !important; color: #fff !important; margin-inline-start: auto; }

    @media (max-width: 768px) {
      :host { padding: 16px; }
      .detail-header { flex-direction: column; }
      .header-actions { flex-direction: row; flex-wrap: wrap; }
    }
  `]
})
export class IntelDetailComponent implements OnInit {
  report: IntelReportDto | null = null;
  timeline: IntelTimelineEntryDto[] = [];
  links: IntelReportLinkDto[] = [];
  newComment = '';
  timelineFile: File | null = null;

  // Link search
  showLinkSearch = false;
  linkSearchQuery = '';
  linkType = 'related';
  searchResults: IntelReportSummaryDto[] = [];

  get canEdit(): boolean {
    return this.auth.hasRole('DataEntry') || this.auth.hasRole('Editor') ||
           this.auth.hasRole('CountryAdmin') || this.auth.hasRole('AUAdmin');
  }

  get canChangeStatus(): boolean {
    return this.canEdit;
  }

  get canDelete(): boolean {
    return this.auth.hasRole('CountryAdmin') || this.auth.hasRole('AUAdmin');
  }

  constructor(
    public auth: AuthService,
    public intelService: IntelReportService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadReport(id);
    this.loadTimeline(id);
    this.loadLinks(id);
  }

  loadReport(id: string) {
    this.intelService.get(id).subscribe(r => this.report = r);
  }

  loadTimeline(id: string) {
    this.intelService.getTimeline(id).subscribe(t => this.timeline = t);
  }

  loadLinks(id: string) {
    this.intelService.getLinks(id).subscribe(l => this.links = l);
  }

  changeStatus(status: string) {
    if (!this.report) return;
    this.intelService.updateStatus(this.report.id, status).subscribe({
      next: (r) => {
        this.report = r;
        this.loadTimeline(r.id);
        this.snackBar.open(`Status changed to ${status}`, 'OK', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error', 'OK', { duration: 5000 })
    });
  }

  deleteReport() {
    if (!this.report || !confirm('Delete this intelligence report?')) return;
    this.intelService.delete(this.report.id).subscribe({
      next: () => {
        this.snackBar.open('Report deleted', 'OK', { duration: 3000 });
        this.router.navigate(['/intelligence']);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error', 'OK', { duration: 5000 })
    });
  }

  uploadAttachment(event: Event) {
    if (!this.report) return;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.intelService.uploadAttachment(this.report.id, file).subscribe({
      next: () => {
        this.loadReport(this.report!.id);
        this.snackBar.open('Attachment uploaded', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Upload failed', 'OK', { duration: 5000 })
    });
  }

  deleteAttachment(attachmentId: number) {
    if (!this.report) return;
    this.intelService.deleteAttachment(this.report.id, attachmentId).subscribe({
      next: () => this.loadReport(this.report!.id),
      error: () => this.snackBar.open('Delete failed', 'OK', { duration: 5000 })
    });
  }

  addComment() {
    if (!this.report || !this.newComment.trim()) return;
    const reportId = this.report.id;
    this.intelService.addTimelineEntry(reportId, { content: this.newComment }).subscribe({
      next: (entry) => {
        if (this.timelineFile) {
          this.intelService.uploadTimelineAttachment(reportId, entry.id, this.timelineFile).subscribe({
            next: () => {
              this.loadTimeline(reportId);
              this.timelineFile = null;
            },
            error: () => this.loadTimeline(reportId)
          });
        } else {
          this.loadTimeline(reportId);
        }
        this.newComment = '';
        this.snackBar.open('Comment added', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Error adding comment', 'OK', { duration: 5000 })
    });
  }

  onTimelineFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.timelineFile = input.files[0];
    }
  }

  searchReports() {
    if (!this.linkSearchQuery.trim()) return;
    this.intelService.list({ page: 1, pageSize: 10 }).subscribe(result => {
      this.searchResults = result.items.filter(r =>
        r.id !== this.report?.id &&
        r.title.toLowerCase().includes(this.linkSearchQuery.toLowerCase())
      );
    });
  }

  createLink(targetId: string) {
    if (!this.report) return;
    this.intelService.createLink(this.report.id, {
      targetReportId: targetId,
      linkType: this.linkType
    }).subscribe({
      next: () => {
        this.loadLinks(this.report!.id);
        this.showLinkSearch = false;
        this.searchResults = [];
        this.linkSearchQuery = '';
        this.snackBar.open('Reports linked', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Error linking', 'OK', { duration: 5000 })
    });
  }

  deleteLink(linkId: number) {
    if (!this.report) return;
    this.intelService.deleteLink(this.report.id, linkId).subscribe({
      next: () => this.loadLinks(this.report!.id),
      error: () => this.snackBar.open('Error', 'OK', { duration: 5000 })
    });
  }
}
