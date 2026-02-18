import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { BookmarkService } from '@core/services/bookmark.service';
import { BookmarkDto, BookmarkCollectionDto } from '@core/models';
import { ThreatBadgeComponent } from '@shared/components/threat-badge.component';

@Component({
  selector: 'app-collection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    TranslateModule
  ],
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <div class="dialog-icon">
          <mat-icon>{{ collection ? 'edit_note' : 'create_new_folder' }}</mat-icon>
        </div>
        <h2>{{ collection ? ('bookmarks.editCollection' | translate) : ('bookmarks.createCollection' | translate) }}</h2>
        <div class="header-line"></div>
      </div>

      <mat-dialog-content>
        <div class="field-group">
          <label class="field-label">
            <mat-icon>label</mat-icon>
            {{ 'bookmarks.collectionName' | translate }}
          </label>
          <mat-form-field appearance="outline" class="full-width cyber-field">
            <input matInput [(ngModel)]="name" required placeholder="Enter collection identifier...">
          </mat-form-field>
        </div>

        <div class="field-group">
          <label class="field-label">
            <mat-icon>description</mat-icon>
            {{ 'bookmarks.collectionDescription' | translate }}
          </label>
          <mat-form-field appearance="outline" class="full-width cyber-field">
            <textarea matInput [(ngModel)]="description" rows="2" placeholder="Optional description..."></textarea>
          </mat-form-field>
        </div>

        <div class="field-group">
          <label class="field-label">
            <mat-icon>palette</mat-icon>
            {{ 'bookmarks.collectionColor' | translate }}
          </label>
          <div class="color-picker-row">
            <div class="color-preview" [style.backgroundColor]="color">
              <div class="color-glow" [style.background]="'radial-gradient(circle, ' + color + '44, transparent)'"></div>
            </div>
            <mat-form-field appearance="outline" class="full-width cyber-field">
              <input matInput type="color" [(ngModel)]="color">
            </mat-form-field>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close class="cancel-btn">
          <mat-icon>close</mat-icon>
          {{ 'common.cancel' | translate }}
        </button>
        <button class="save-btn" mat-raised-button [mat-dialog-close]="{ name, description, color }" [disabled]="!name">
          <mat-icon>save</mat-icon>
          {{ 'common.save' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dialog-wrapper {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 28px;
      position: relative;
      overflow: hidden;
    }

    .dialog-wrapper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #667eea, #00d4ff, #667eea);
      background-size: 200% 100%;
      animation: shimmer-line 3s linear infinite;
    }

    @keyframes shimmer-line {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .dialog-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(0,212,255,0.2));
      border: 1px solid rgba(0,212,255,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-icon mat-icon {
      color: #00d4ff;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text-heading);
      letter-spacing: 0.5px;
    }

    .header-line {
      flex-basis: 100%;
      height: 1px;
      background: linear-gradient(90deg, rgba(0,212,255,0.3), transparent);
      margin-top: 4px;
    }

    .field-group {
      margin-bottom: 20px;
    }

    .field-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 8px;
    }

    .field-label mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #00d4ff;
    }

    .full-width {
      width: 100%;
    }

    ::ng-deep .cyber-field .mat-mdc-text-field-wrapper {
      background: var(--bg-input) !important;
      border-radius: 10px !important;
    }

    ::ng-deep .cyber-field .mdc-notched-outline__leading,
    ::ng-deep .cyber-field .mdc-notched-outline__notch,
    ::ng-deep .cyber-field .mdc-notched-outline__trailing {
      border-color: rgba(0,212,255,0.2) !important;
    }

    ::ng-deep .cyber-field:hover .mdc-notched-outline__leading,
    ::ng-deep .cyber-field:hover .mdc-notched-outline__notch,
    ::ng-deep .cyber-field:hover .mdc-notched-outline__trailing {
      border-color: rgba(0,212,255,0.4) !important;
    }

    ::ng-deep .cyber-field.mat-focused .mdc-notched-outline__leading,
    ::ng-deep .cyber-field.mat-focused .mdc-notched-outline__notch,
    ::ng-deep .cyber-field.mat-focused .mdc-notched-outline__trailing {
      border-color: #00d4ff !important;
    }

    ::ng-deep .cyber-field .mat-mdc-input-element,
    ::ng-deep .cyber-field textarea.mat-mdc-input-element {
      color: rgba(255,255,255,0.87) !important;
      caret-color: #00d4ff;
    }

    ::ng-deep .cyber-field .mdc-floating-label {
      color: rgba(255,255,255,0.4) !important;
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .color-preview {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      position: relative;
      flex-shrink: 0;
      border: 2px solid rgba(255,255,255,0.1);
    }

    .color-glow {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      pointer-events: none;
    }

    mat-dialog-actions {
      padding: 16px 0 0 0 !important;
      margin: 0 !important;
      border-top: 1px solid var(--border-default);
      gap: 12px;
    }

    .cancel-btn {
      color: rgba(255,255,255,0.5) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 10px !important;
      transition: all 0.2s ease !important;
    }

    .cancel-btn:hover {
      color: rgba(255,255,255,0.8) !important;
      border-color: rgba(255,255,255,0.2) !important;
      background: rgba(255,255,255,0.05) !important;
    }

    .cancel-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
    }

    .save-btn {
      background: linear-gradient(135deg, #667eea, #00d4ff) !important;
      color: #fff !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px;
      padding: 0 24px !important;
      box-shadow: 0 4px 20px rgba(102,126,234,0.3) !important;
      transition: all 0.3s ease !important;
    }

    .save-btn:hover:not(:disabled) {
      box-shadow: 0 6px 28px rgba(102,126,234,0.5) !important;
      transform: translateY(-1px);
    }

    .save-btn:disabled {
      background: rgba(255,255,255,0.08) !important;
      color: rgba(255,255,255,0.25) !important;
      box-shadow: none !important;
    }

    .save-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 6px;
    }

    ::ng-deep .cdk-overlay-pane:has(app-collection-dialog) {
      border-radius: 16px;
      overflow: hidden;
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-default);
      border-radius: 16px !important;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(102,126,234,0.1) !important;
    }
  `]
})
export class CollectionDialogComponent {
  collection?: BookmarkCollectionDto;
  name: string = '';
  description: string = '';
  color: string = '#4CAF50';

  ngOnInit(): void {
    if (this.collection) {
      this.name = this.collection.name;
      this.description = this.collection.description || '';
      this.color = this.collection.color;
    }
  }
}

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
    TranslateModule,
    ThreatBadgeComponent
  ],
  template: `
    <div class="bookmarks-container">
      <!-- Animated background grid -->
      <div class="bg-grid"></div>
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>

      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>bookmark</mat-icon>
            <div class="icon-ring"></div>
          </div>
          <div class="header-text">
            <h2>{{ 'bookmarks.title' | translate }}</h2>
            <span class="header-subtitle">Intelligence Archives</span>
          </div>
        </div>
        <div class="total-badge" [class.has-items]="totalCount() > 0">
          <div class="badge-pulse"></div>
          <mat-icon>inventory_2</mat-icon>
          <span class="badge-count">{{ totalCount() }}</span>
          <span class="badge-label">ENTRIES</span>
        </div>
      </div>

      <div class="content-grid">
        <!-- Collections Sidebar -->
        <div class="collections-sidebar">
          <div class="sidebar-glass"></div>
          <div class="sidebar-inner">
            <div class="sidebar-header">
              <div class="sidebar-title-row">
                <mat-icon>folder_special</mat-icon>
                <h3>{{ 'bookmarks.collections' | translate }}</h3>
              </div>
              <button class="add-collection-btn" mat-icon-button (click)="openCollectionDialog()">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <div class="collection-list">
              <!-- All Bookmarks -->
              <div
                class="collection-item all-bookmarks-item"
                [class.active]="selectedCollectionId() === null"
                (click)="selectCollection(null)"
              >
                <div class="item-glow" *ngIf="selectedCollectionId() === null"></div>
                <div class="item-icon all-icon">
                  <mat-icon>bookmark</mat-icon>
                </div>
                <span class="item-name">{{ 'bookmarks.allBookmarks' | translate }}</span>
                <span class="count">{{ totalCount() }}</span>
              </div>

              <!-- Collection Items -->
              @for (collection of collections(); track collection.id) {
                <div
                  class="collection-item"
                  [class.active]="selectedCollectionId() === collection.id"
                  (click)="selectCollection(collection.id)"
                >
                  <div class="item-glow" *ngIf="selectedCollectionId() === collection.id"></div>
                  <div class="color-badge-wrapper">
                    <div class="color-badge" [style.backgroundColor]="collection.color"></div>
                    <div class="badge-ring" [style.borderColor]="collection.color"></div>
                  </div>
                  <span class="item-name">{{ collection.name }}</span>
                  <span class="count">{{ collection.bookmarkCount }}</span>
                  <div class="item-actions">
                    <button mat-icon-button class="action-btn edit-btn" (click)="openCollectionDialog(collection); $event.stopPropagation()">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button class="action-btn delete-btn" (click)="deleteCollection(collection.id); $event.stopPropagation()">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Bookmarks List -->
        <div class="bookmarks-list">
          @if (loading()) {
            <!-- Loading skeleton -->
            <div class="skeleton-grid">
              <div class="skeleton-card" *ngFor="let i of [1,2,3,4]">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-sub"></div>
                <div class="skeleton-line skeleton-body"></div>
                <div class="skeleton-line skeleton-body short"></div>
              </div>
            </div>
          } @else if (bookmarks().length === 0) {
            <!-- Empty state -->
            <div class="empty-state">
              <div class="empty-icon-wrapper">
                <mat-icon>bookmark_border</mat-icon>
                <div class="empty-ring empty-ring-1"></div>
                <div class="empty-ring empty-ring-2"></div>
                <div class="empty-ring empty-ring-3"></div>
              </div>
              <p class="empty-title">No intelligence saved</p>
              <p class="empty-sub">{{ 'bookmarks.noBookmarks' | translate }}</p>
              <div class="empty-line"></div>
            </div>
          } @else {
            <!-- Bookmark cards -->
            <div class="bookmark-grid">
              @for (bookmark of bookmarks(); track bookmark.id; let idx = $index) {
                <div class="bookmark-card-wrapper" [style.animation-delay]="(idx * 80) + 'ms'">
                  <mat-card class="bookmark-card" [routerLink]="['/news', bookmark.articleId]">
                    <!-- Threat level border -->
                    <div class="threat-border"
                      [class.threat-critical]="bookmark.article?.threatLevel === 4 || bookmark.article?.threatLevel === 5"
                      [class.threat-high]="bookmark.article?.threatLevel === 3"
                      [class.threat-medium]="bookmark.article?.threatLevel === 2"
                      [class.threat-low]="bookmark.article?.threatLevel === 1 || bookmark.article?.threatLevel === 0"
                    ></div>

                    <div class="card-inner">
                      <mat-card-header>
                        <mat-card-title class="card-title">{{ bookmark.article?.title }}</mat-card-title>
                        <mat-card-subtitle class="card-source">
                          <mat-icon>public</mat-icon>
                          {{ bookmark.article?.sourceName }}
                          <span class="source-separator">//</span>
                          {{ bookmark.article?.publishedAt | date:'medium' }}
                        </mat-card-subtitle>
                      </mat-card-header>

                      <mat-card-content>
                        @if (bookmark.article?.summary) {
                          <p class="card-summary">{{ bookmark.article!.summary }}</p>
                        }
                        @if (bookmark.notes) {
                          <div class="notes">
                            <mat-icon>sticky_note_2</mat-icon>
                            <span>{{ bookmark.notes }}</span>
                          </div>
                        }
                        <div class="metadata">
                          @if (bookmark.article?.threatLevel !== undefined) {
                            <app-threat-badge [level]="bookmark.article!.threatLevel" />
                          }
                          @if (bookmark.collectionName) {
                            <div class="collection-chip">
                              <div class="chip-dot"></div>
                              {{ bookmark.collectionName }}
                            </div>
                          }
                        </div>
                      </mat-card-content>

                      <mat-card-actions>
                        <button mat-button class="read-more-btn">
                          <mat-icon>arrow_forward</mat-icon>
                          {{ 'news.readMore' | translate }}
                        </button>
                        <button mat-icon-button class="remove-btn" (click)="removeBookmark(bookmark.id); $event.stopPropagation(); $event.preventDefault()">
                          <mat-icon>delete_outline</mat-icon>
                        </button>
                      </mat-card-actions>
                    </div>
                  </mat-card>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ============================================
       KEYFRAME ANIMATIONS
       ============================================ */
    @keyframes fadeInSlideUp {
      0% {
        opacity: 0;
        transform: translateY(24px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }

    @keyframes skeleton-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }

    @keyframes float-glow {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
      33% { transform: translate(30px, -20px) scale(1.1); opacity: 0.5; }
      66% { transform: translate(-20px, 15px) scale(0.9); opacity: 0.2; }
    }

    @keyframes ring-expand {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    @keyframes icon-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    @keyframes badge-pulse-anim {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,255,0.4); }
      50% { box-shadow: 0 0 0 8px rgba(0,212,255,0); }
    }

    @keyframes grid-scroll {
      0% { transform: translate(0, 0); }
      100% { transform: translate(30px, 30px); }
    }

    /* ============================================
       BASE CONTAINER
       ============================================ */
    :host {
      display: block;
      min-height: 100vh;
    }

    .bookmarks-container {
      position: relative;
      padding: 32px;
      min-height: 100vh;
      background: var(--bg-page);
      overflow: hidden;
    }

    /* Animated background grid */
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(102,126,234,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(102,126,234,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      animation: grid-scroll 20s linear infinite;
      pointer-events: none;
    }

    .bg-glow {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      animation: float-glow 15s ease-in-out infinite;
    }

    .bg-glow-1 {
      top: -100px;
      right: -100px;
      background: rgba(102,126,234,0.08);
    }

    .bg-glow-2 {
      bottom: -100px;
      left: -100px;
      background: rgba(0,212,255,0.06);
      animation-delay: -7s;
    }

    /* ============================================
       HEADER
       ============================================ */
    .header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-default);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .header-icon {
      position: relative;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(0,212,255,0.15));
      border-radius: 14px;
      border: 1px solid rgba(102,126,234,0.3);
    }

    .header-icon mat-icon {
      color: #00d4ff;
      font-size: 28px;
      width: 28px;
      height: 28px;
      z-index: 1;
    }

    .icon-ring {
      position: absolute;
      inset: -4px;
      border-radius: 18px;
      border: 1px solid rgba(0,212,255,0.15);
      animation: pulse-ring 3s ease-in-out infinite;
    }

    .header-text h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--text-heading);
      letter-spacing: 0.5px;
    }

    .header-subtitle {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: rgba(0,212,255,0.6);
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-top: 2px;
    }

    .total-badge {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: var(--bg-card-glass);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .total-badge.has-items {
      border-color: rgba(0,212,255,0.2);
      animation: badge-pulse-anim 3s ease-in-out infinite;
    }

    .badge-pulse {
      position: absolute;
      inset: 0;
      border-radius: 12px;
      pointer-events: none;
    }

    .total-badge mat-icon {
      color: #00d4ff;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .badge-count {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-heading);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .badge-label {
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,0.35);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* ============================================
       CONTENT GRID
       ============================================ */
    .content-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 28px;
    }

    @media (max-width: 768px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ============================================
       COLLECTIONS SIDEBAR
       ============================================ */
    .collections-sidebar {
      position: relative;
      height: fit-content;
      border-radius: 16px;
      overflow: hidden;
    }

    .sidebar-glass {
      position: absolute;
      inset: 0;
      background: var(--bg-card-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-default);
      border-radius: 16px;
    }

    .sidebar-inner {
      position: relative;
      z-index: 1;
      padding: 20px;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-default);
    }

    .sidebar-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sidebar-title-row mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sidebar-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .add-collection-btn {
      width: 34px !important;
      height: 34px !important;
      background: rgba(102,126,234,0.12) !important;
      border: 1px solid rgba(102,126,234,0.25) !important;
      border-radius: 10px !important;
      transition: all 0.25s ease !important;
    }

    .add-collection-btn mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .add-collection-btn:hover {
      background: rgba(102,126,234,0.25) !important;
      border-color: rgba(102,126,234,0.5) !important;
      transform: scale(1.05);
    }

    .collection-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .collection-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.25s ease;
      border-left: 3px solid transparent;
    }

    .collection-item:hover {
      background: rgba(255,255,255,0.04);
    }

    .collection-item.active {
      background: rgba(102,126,234,0.1);
      border-left-color: #667eea;
    }

    .item-glow {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 70%;
      background: #667eea;
      box-shadow: 0 0 12px rgba(102,126,234,0.6), 0 0 24px rgba(102,126,234,0.3);
      border-radius: 0 2px 2px 0;
    }

    .all-bookmarks-item .item-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: rgba(255,255,255,0.5);
    }

    .collection-item.active .item-icon mat-icon {
      color: #00d4ff;
    }

    .item-name {
      flex: 1;
      font-size: 14px;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .collection-item.active .item-name {
      color: var(--text-heading);
    }

    .count {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.3);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(255,255,255,0.05);
      padding: 2px 8px;
      border-radius: 6px;
      min-width: 24px;
      text-align: center;
    }

    .collection-item.active .count {
      color: #00d4ff;
      background: rgba(0,212,255,0.1);
    }

    .color-badge-wrapper {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .color-badge {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      position: relative;
      z-index: 1;
    }

    .badge-ring {
      position: absolute;
      inset: 2px;
      border-radius: 50%;
      border: 2px solid;
      opacity: 0.3;
      animation: pulse-glow 2.5s ease-in-out infinite;
    }

    .collection-item.active .color-badge {
      box-shadow: 0 0 8px currentColor;
    }

    .item-actions {
      display: flex;
      gap: 0;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .collection-item:hover .item-actions {
      opacity: 1;
    }

    .action-btn {
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;
    }

    .action-btn mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .edit-btn mat-icon {
      color: rgba(255,255,255,0.35);
    }

    .edit-btn:hover mat-icon {
      color: #667eea;
    }

    .delete-btn mat-icon {
      color: rgba(255,255,255,0.35);
    }

    .delete-btn:hover mat-icon {
      color: #ff1744;
    }

    /* ============================================
       BOOKMARKS LIST AREA
       ============================================ */
    .bookmarks-list {
      min-height: 400px;
    }

    /* ============================================
       LOADING SKELETON
       ============================================ */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .skeleton-card {
      background: var(--bg-card-glass);
      border: 1px solid var(--border-default);
      border-radius: 14px;
      padding: 24px;
    }

    .skeleton-line {
      height: 14px;
      border-radius: 8px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 400px 100%;
      animation: skeleton-shimmer 1.8s ease-in-out infinite;
      margin-bottom: 12px;
    }

    .skeleton-title {
      width: 80%;
      height: 18px;
    }

    .skeleton-sub {
      width: 55%;
      height: 12px;
      margin-bottom: 20px;
    }

    .skeleton-body {
      width: 100%;
    }

    .skeleton-body.short {
      width: 65%;
    }

    /* ============================================
       EMPTY STATE
       ============================================ */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 40px;
      text-align: center;
    }

    .empty-icon-wrapper {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28px;
    }

    .empty-icon-wrapper mat-icon {
      font-size: 52px;
      width: 52px;
      height: 52px;
      color: rgba(102,126,234,0.4);
      animation: icon-pulse 3s ease-in-out infinite;
      z-index: 1;
    }

    .empty-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(102,126,234,0.15);
    }

    .empty-ring-1 {
      inset: 0;
      animation: ring-expand 4s ease-out infinite;
    }

    .empty-ring-2 {
      inset: 10px;
      animation: ring-expand 4s ease-out infinite 1.3s;
    }

    .empty-ring-3 {
      inset: 20px;
      animation: ring-expand 4s ease-out infinite 2.6s;
    }

    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      margin: 0 0 8px 0;
    }

    .empty-sub {
      font-size: 14px;
      color: rgba(255,255,255,0.3);
      margin: 0 0 20px 0;
    }

    .empty-line {
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(102,126,234,0.3), transparent);
    }

    /* ============================================
       BOOKMARK CARD GRID
       ============================================ */
    .bookmark-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    @media (max-width: 1100px) {
      .bookmark-grid {
        grid-template-columns: 1fr;
      }
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
    }

    .bookmark-card-wrapper {
      animation: fadeInSlideUp 0.5s ease forwards;
      opacity: 0;
    }

    /* ============================================
       BOOKMARK CARD
       ============================================ */
    .bookmark-card {
      position: relative;
      background: var(--bg-card-glass) !important;
      border: 1px solid var(--border-default) !important;
      border-radius: 14px !important;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important;
      backdrop-filter: blur(10px);
    }

    .bookmark-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(102,126,234,0.08) !important;
      border-color: rgba(102,126,234,0.15) !important;
    }

    /* Threat level left border */
    .threat-border {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 4px 0 0 4px;
      background: rgba(255,255,255,0.1);
    }

    .threat-border.threat-critical {
      background: linear-gradient(180deg, #ff1744, #ff5252);
      box-shadow: 0 0 12px rgba(255,23,68,0.4);
    }

    .threat-border.threat-high {
      background: linear-gradient(180deg, #ff9100, #ffab40);
      box-shadow: 0 0 12px rgba(255,145,0,0.3);
    }

    .threat-border.threat-medium {
      background: linear-gradient(180deg, #ffd600, #ffea00);
      box-shadow: 0 0 12px rgba(255,214,0,0.2);
    }

    .threat-border.threat-low {
      background: linear-gradient(180deg, #00e676, #69f0ae);
      box-shadow: 0 0 12px rgba(0,230,118,0.2);
    }

    .card-inner {
      padding: 4px 4px 4px 8px;
    }

    ::ng-deep .bookmark-card .mat-mdc-card-header {
      padding: 16px 16px 8px 16px;
    }

    .card-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: var(--text-heading) !important;
      line-height: 1.4 !important;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-source {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      font-size: 12px !important;
      color: #00d4ff !important;
      font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
      margin-top: 6px !important;
    }

    .card-source mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: rgba(0,212,255,0.5);
    }

    .source-separator {
      color: rgba(255,255,255,0.2);
      margin: 0 2px;
    }

    .card-summary {
      font-size: 13px;
      color: rgba(255,255,255,0.55);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    /* Notes section */
    .notes {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 14px;
      padding: 12px;
      background: var(--bg-input);
      border: 1px dashed rgba(255,255,255,0.08);
      border-radius: 10px;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      line-height: 1.5;
    }

    .notes mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #667eea;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Metadata row */
    .metadata {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    .collection-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(102,126,234,0.1);
      border: 1px solid rgba(102,126,234,0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.6);
    }

    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #667eea;
    }

    /* Card actions */
    ::ng-deep .bookmark-card .mat-mdc-card-actions {
      padding: 8px 16px !important;
      border-top: 1px solid rgba(255,255,255,0.04);
    }

    .read-more-btn {
      color: #00d4ff !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
      transition: all 0.2s ease !important;
    }

    .read-more-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
      transition: transform 0.2s ease;
    }

    .read-more-btn:hover mat-icon {
      transform: translateX(3px);
    }

    .remove-btn {
      margin-left: auto !important;
    }

    .remove-btn mat-icon {
      color: rgba(255,255,255,0.25);
      font-size: 20px;
      width: 20px;
      height: 20px;
      transition: color 0.2s ease;
    }

    .remove-btn:hover mat-icon {
      color: #ff1744;
    }

    /* ============================================
       MAT CARD OVERRIDES for dark theme
       ============================================ */
    ::ng-deep .bookmark-card .mdc-card {
      background: transparent !important;
    }

    ::ng-deep .bookmark-card mat-card-content {
      padding: 0 16px 8px 16px !important;
      color: rgba(255,255,255,0.87);
    }

    ::ng-deep .bookmark-card mat-card-subtitle {
      color: #00d4ff !important;
    }

    /* Chip override */
    ::ng-deep .metadata .mat-mdc-chip {
      background: rgba(102,126,234,0.12) !important;
      border: 1px solid rgba(102,126,234,0.2);
      color: rgba(255,255,255,0.6) !important;
      font-size: 12px;
    }
  `]
})
export class BookmarksComponent implements OnInit {
  bookmarkService = signal(this.bookmarkServiceInstance);
  loading = signal(false);
  selectedCollectionId = signal<number | null>(null);
  totalCount = signal(0);

  constructor(
    private bookmarkServiceInstance: BookmarkService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCollections();
    this.loadBookmarks();
  }

  get bookmarks() {
    return this.bookmarkServiceInstance.bookmarks;
  }

  get collections() {
    return this.bookmarkServiceInstance.collections;
  }

  loadCollections(): void {
    this.bookmarkServiceInstance.getCollections().subscribe();
  }

  loadBookmarks(): void {
    this.loading.set(true);
    this.bookmarkServiceInstance.listBookmarks(this.selectedCollectionId() || undefined).subscribe({
      next: (result) => {
        this.totalCount.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error loading bookmarks', 'Close', { duration: 3000 });
      }
    });
  }

  selectCollection(collectionId: number | null): void {
    this.selectedCollectionId.set(collectionId);
    this.loadBookmarks();
  }

  openCollectionDialog(collection?: BookmarkCollectionDto): void {
    const dialogRef = this.dialog.open(CollectionDialogComponent, {
      width: '400px'
    });

    if (collection) {
      dialogRef.componentInstance.collection = collection;
    }

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (collection) {
          this.updateCollection(collection.id, result);
        } else {
          this.createCollection(result);
        }
      }
    });
  }

  createCollection(data: { name: string; description?: string; color: string }): void {
    this.bookmarkServiceInstance.createCollection(data.name, data.description, data.color).subscribe({
      next: () => {
        this.snackBar.open('Collection created', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error creating collection', 'Close', { duration: 3000 });
      }
    });
  }

  updateCollection(id: number, data: { name?: string; description?: string; color?: string }): void {
    this.bookmarkServiceInstance.updateCollection(id, data).subscribe({
      next: () => {
        this.snackBar.open('Collection updated', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error updating collection', 'Close', { duration: 3000 });
      }
    });
  }

  deleteCollection(id: number): void {
    if (confirm('Are you sure you want to delete this collection?')) {
      this.bookmarkServiceInstance.deleteCollection(id).subscribe({
        next: () => {
          this.snackBar.open('Collection deleted', 'Close', { duration: 2000 });
          if (this.selectedCollectionId() === id) {
            this.selectCollection(null);
          }
        },
        error: () => {
          this.snackBar.open('Error deleting collection', 'Close', { duration: 3000 });
        }
      });
    }
  }

  removeBookmark(id: number): void {
    this.bookmarkServiceInstance.removeBookmark(id).subscribe({
      next: () => {
        this.snackBar.open('Bookmark removed', 'Close', { duration: 2000 });
        this.loadBookmarks(); // Refresh to update counts
        this.loadCollections();
      },
      error: () => {
        this.snackBar.open('Error removing bookmark', 'Close', { duration: 3000 });
      }
    });
  }
}
