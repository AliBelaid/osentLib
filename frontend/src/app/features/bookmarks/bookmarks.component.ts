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
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ collection ? ('bookmarks.editCollection' | translate) : ('bookmarks.createCollection' | translate) }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'bookmarks.collectionName' | translate }}</mat-label>
        <input matInput [(ngModel)]="name" required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'bookmarks.collectionDescription' | translate }}</mat-label>
        <textarea matInput [(ngModel)]="description" rows="2"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'bookmarks.collectionColor' | translate }}</mat-label>
        <input matInput type="color" [(ngModel)]="color">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="{ name, description, color }" [disabled]="!name">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 16px; }
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
      <div class="header">
        <h2>{{ 'bookmarks.title' | translate }}</h2>
      </div>

      <div class="content-grid">
        <!-- Collections Sidebar -->
        <div class="collections-sidebar">
          <div class="sidebar-header">
            <h3>{{ 'bookmarks.collections' | translate }}</h3>
            <button mat-icon-button (click)="openCollectionDialog()">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div class="collection-list">
            <div
              class="collection-item"
              [class.active]="selectedCollectionId() === null"
              (click)="selectCollection(null)"
            >
              <mat-icon>bookmark</mat-icon>
              <span>{{ 'bookmarks.allBookmarks' | translate }}</span>
              <span class="count">{{ totalCount() }}</span>
            </div>

            @for (collection of collections(); track collection.id) {
              <div
                class="collection-item"
                [class.active]="selectedCollectionId() === collection.id"
                (click)="selectCollection(collection.id)"
              >
                <div class="color-badge" [style.backgroundColor]="collection.color"></div>
                <span>{{ collection.name }}</span>
                <span class="count">{{ collection.bookmarkCount }}</span>
                <button mat-icon-button (click)="openCollectionDialog(collection); $event.stopPropagation()">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteCollection(collection.id); $event.stopPropagation()">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Bookmarks List -->
        <div class="bookmarks-list">
          @if (loading()) {
            <div class="loading">{{ 'common.loading' | translate }}</div>
          } @else if (bookmarks().length === 0) {
            <div class="empty-state">
              <mat-icon>bookmark_border</mat-icon>
              <p>{{ 'bookmarks.noBookmarks' | translate }}</p>
            </div>
          } @else {
            <div class="bookmark-grid">
              @for (bookmark of bookmarks(); track bookmark.id) {
                <mat-card class="bookmark-card" [routerLink]="['/news', bookmark.articleId]">
                  <mat-card-header>
                    <mat-card-title>{{ bookmark.article?.title }}</mat-card-title>
                    <mat-card-subtitle>
                      {{ bookmark.article?.sourceName }} · {{ bookmark.article?.publishedAt | date:'medium' }}
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    @if (bookmark.article?.summary) {
                      <p>{{ bookmark.article!.summary }}</p>
                    }
                    @if (bookmark.notes) {
                      <div class="notes">
                        <mat-icon>note</mat-icon>
                        <span>{{ bookmark.notes }}</span>
                      </div>
                    }
                    <div class="metadata">
                      @if (bookmark.article?.threatLevel !== undefined) {
                        <app-threat-badge [level]="bookmark.article!.threatLevel" />
                      }
                      @if (bookmark.collectionName) {
                        <mat-chip>{{ bookmark.collectionName }}</mat-chip>
                      }
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-button color="primary">{{ 'news.readMore' | translate }}</button>
                    <button mat-icon-button (click)="removeBookmark(bookmark.id); $event.stopPropagation(); $event.preventDefault()">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bookmarks-container {
      padding: 24px;
    }

    .header {
      margin-bottom: 24px;
    }

    .header h2 {
      margin: 0;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .collections-sidebar {
      background: white;
      border-radius: 4px;
      padding: 16px;
      height: fit-content;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .sidebar-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .collection-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .collection-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .collection-item:hover {
      background-color: #f5f5f5;
    }

    .collection-item.active {
      background-color: #e3f2fd;
    }

    .color-badge {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }

    .collection-item span {
      flex: 1;
    }

    .count {
      color: #666;
      font-size: 14px;
    }

    .bookmarks-list {
      min-height: 400px;
    }

    .loading, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .bookmark-grid {
      display: grid;
      gap: 16px;
    }

    .bookmark-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .bookmark-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .notes {
      display: flex;
      align-items: start;
      gap: 8px;
      margin-top: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 14px;
      color: #666;
    }

    .notes mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .metadata {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
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
