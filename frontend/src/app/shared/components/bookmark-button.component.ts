import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BookmarkService } from '@core/services/bookmark.service';
import { BookmarkCollectionDto } from '@core/models';

@Component({
  selector: 'app-bookmark-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'bookmarks.addToCollection' | translate }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'bookmarks.collection' | translate }}</mat-label>
        <mat-select [(value)]="selectedCollectionId">
          <mat-option [value]="null">{{ 'bookmarks.noCollection' | translate }}</mat-option>
          @for (collection of collections; track collection.id) {
            <mat-option [value]="collection.id">{{ collection.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'bookmarks.notes' | translate }}</mat-label>
        <textarea matInput [(ngModel)]="notes" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="{ collectionId: selectedCollectionId, notes: notes }">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 16px; }
  `]
})
export class BookmarkDialogComponent {
  @Input() collections: BookmarkCollectionDto[] = [];
  selectedCollectionId: number | null = null;
  notes: string = '';
}

@Component({
  selector: 'app-bookmark-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <button
      mat-icon-button
      [matTooltip]="isBookmarked() ? ('bookmarks.removeBookmark' | translate) : ('bookmarks.addBookmark' | translate)"
      (click)="toggleBookmark($event)"
      [disabled]="loading()"
    >
      <mat-icon [color]="isBookmarked() ? 'primary' : ''">
        {{ isBookmarked() ? 'bookmark' : 'bookmark_border' }}
      </mat-icon>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class BookmarkButtonComponent implements OnInit {
  @Input({ required: true }) articleId!: string;

  private bookmarkService = inject(BookmarkService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);

  ngOnInit(): void {
    // Load collections and bookmarks if not already loaded
    if (this.bookmarkService.collections().length === 0) {
      this.bookmarkService.getCollections().subscribe();
    }
    if (this.bookmarkService.bookmarks().length === 0) {
      this.bookmarkService.listBookmarks().subscribe();
    }
  }

  isBookmarked(): boolean {
    return this.bookmarkService.isBookmarked(this.articleId);
  }

  toggleBookmark(event: Event): void {
    event.stopPropagation(); // Prevent navigation if button is in a card

    if (this.isBookmarked()) {
      this.removeBookmark();
    } else {
      this.addBookmark();
    }
  }

  private addBookmark(): void {
    const collections = this.bookmarkService.collections();

    // If user has collections, show dialog
    if (collections.length > 0) {
      const dialogRef = this.dialog.open(BookmarkDialogComponent, {
        width: '400px',
        data: { collections }
      });

      dialogRef.componentInstance.collections = collections;

      dialogRef.afterClosed().subscribe(result => {
        if (result !== undefined) {
          this.performAddBookmark(result.collectionId, result.notes);
        }
      });
    } else {
      // No collections, add directly
      this.performAddBookmark();
    }
  }

  private performAddBookmark(collectionId?: number, notes?: string): void {
    this.loading.set(true);
    this.bookmarkService.addBookmark(this.articleId, collectionId, notes).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Bookmark added', 'Close', { duration: 2000 });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error adding bookmark', 'Close', { duration: 3000 });
      }
    });
  }

  private removeBookmark(): void {
    const bookmark = this.bookmarkService.getBookmark(this.articleId);
    if (!bookmark) return;

    this.loading.set(true);
    this.bookmarkService.removeBookmark(bookmark.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Bookmark removed', 'Close', { duration: 2000 });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error removing bookmark', 'Close', { duration: 3000 });
      }
    });
  }
}
