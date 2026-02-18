import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { KeywordListService } from '@core/services/keyword-list.service';
import { KeywordListDto } from '@core/models';

@Component({
  selector: 'app-keyword-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatChipsModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ list ? 'Edit' : 'Create' }} Keyword List</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="name" required>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description</mat-label>
        <textarea matInput [(ngModel)]="description" rows="2"></textarea>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Keywords (comma-separated)</mat-label>
        <textarea matInput [(ngModel)]="keywordsText" rows="4"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="{ name, description, keywords: getKeywordsList() }" [disabled]="!name">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 16px; }`]
})
export class KeywordDialogComponent {
  list?: KeywordListDto;
  name = '';
  description = '';
  keywordsText = '';

  ngOnInit() {
    if (this.list) {
      this.name = this.list.name;
      this.description = this.list.description || '';
      this.keywordsText = this.list.keywords.join(', ');
    }
  }

  getKeywordsList(): string[] {
    return this.keywordsText.split(',').map(k => k.trim()).filter(k => k);
  }
}

@Component({
  selector: 'app-keyword-manager',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, TranslateModule],
  template: `
    <div class="keyword-manager">
      <div class="header">
        <h2>Keyword Lists</h2>
        <button mat-raised-button color="primary" (click)="openDialog()">
          <mat-icon>add</mat-icon>
          Create List
        </button>
      </div>

      @for (list of lists(); track list.id) {
        <mat-card class="list-card">
          <mat-card-header>
            <mat-card-title>{{ list.name }}</mat-card-title>
            <div class="actions">
              <button mat-icon-button (click)="openDialog(list)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteList(list.id)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <p>{{ list.description }}</p>
            <mat-chip-set>
              @for (keyword of list.keywords.slice(0, 10); track keyword) {
                <mat-chip>{{ keyword }}</mat-chip>
              }
              @if (list.keywords.length > 10) {
                <mat-chip>+{{ list.keywords.length - 10 }} more</mat-chip>
              }
            </mat-chip-set>
            <div class="meta">
              <span>Used {{ list.usageCount }} times</span>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .keyword-manager { padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .list-card { margin-bottom: 16px; }
    .actions { margin-left: auto; }
    .meta { margin-top: 12px; font-size: 14px; color: var(--text-secondary); }
  `]
})
export class KeywordManagerComponent implements OnInit {
  lists = this.keywordListService.keywordLists;

  constructor(
    private keywordListService: KeywordListService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.keywordListService.listKeywordLists().subscribe();
  }

  openDialog(list?: KeywordListDto) {
    const dialogRef = this.dialog.open(KeywordDialogComponent, { width: '500px' });
    if (list) dialogRef.componentInstance.list = list;

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (list) {
          this.keywordListService.updateKeywordList(list.id, result).subscribe(() =>
            this.snackBar.open('List updated', 'Close', { duration: 2000 })
          );
        } else {
          this.keywordListService.createKeywordList(result).subscribe(() =>
            this.snackBar.open('List created', 'Close', { duration: 2000 })
          );
        }
      }
    });
  }

  deleteList(id: number) {
    if (confirm('Delete this keyword list?')) {
      this.keywordListService.deleteKeywordList(id).subscribe(() =>
        this.snackBar.open('List deleted', 'Close', { duration: 2000 })
      );
    }
  }
}
