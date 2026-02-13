import { Component, OnInit, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { SavedSearchService } from '@core/services/saved-search.service';
import { SavedSearchDto } from '@core/models';

@Component({
  selector: 'app-saved-searches-panel',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, TranslateModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Saved Searches</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (searches().length === 0) {
          <p class="empty">No saved searches yet</p>
        } @else {
          @for (search of searches(); track search.id) {
            <div class="search-item">
              <div class="search-info">
                <strong>{{ search.name }}</strong>
                <code>{{ search.query }}</code>
                <span class="meta">Executed {{ search.executionCount }} times</span>
              </div>
              <div class="search-actions">
                <button mat-icon-button (click)="execute(search)" matTooltip="Execute">
                  <mat-icon>play_arrow</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteSearch(search.id)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .empty { color: #999; text-align: center; padding: 24px; }
    .search-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #e0e0e0; }
    .search-item:last-child { border-bottom: none; }
    .search-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .search-info code { font-size: 12px; color: #1976d2; }
    .search-info .meta { font-size: 12px; color: #666; }
    .search-actions { display: flex; }
  `]
})
export class SavedSearchesPanelComponent implements OnInit {
  searches = this.savedSearchService.savedSearches;
  onExecute = output<SavedSearchDto>();

  constructor(
    private savedSearchService: SavedSearchService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.savedSearchService.listSavedSearches().subscribe();
  }

  execute(search: SavedSearchDto) {
    this.savedSearchService.executeSavedSearch(search.id).subscribe({
      next: () => this.onExecute.emit(search),
      error: () => this.snackBar.open('Failed to execute search', 'Close', { duration: 3000 })
    });
  }

  deleteSearch(id: number) {
    if (confirm('Delete this saved search?')) {
      this.savedSearchService.deleteSavedSearch(id).subscribe(() =>
        this.snackBar.open('Search deleted', 'Close', { duration: 2000 })
      );
    }
  }
}
