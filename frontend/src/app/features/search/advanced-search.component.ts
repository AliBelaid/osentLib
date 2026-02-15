import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { SavedSearchService } from '@core/services/saved-search.service';
import { KeywordListService } from '@core/services/keyword-list.service';
import { NewsService } from '@core/services/news.service';
import { ParseQueryResponse, NewsSearchResult } from '@core/models';

@Component({
  selector: 'app-advanced-search',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="advanced-search-container">
      <h2>{{ 'search.advancedSearch' | translate }}</h2>

      <mat-card class="query-builder">
        <mat-card-header>
          <mat-card-title>{{ 'search.queryBuilder' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <!-- Query Input -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'search.searchQuery' | translate }}</mat-label>
            <textarea matInput [(ngModel)]="query" rows="3" (ngModelChange)="onQueryChange()"></textarea>
            <mat-hint>{{ 'search.queryHint' | translate }}</mat-hint>
          </mat-form-field>

          <!-- Quick Insert Buttons -->
          <div class="quick-insert">
            <span class="section-label">{{ 'search.quickInsert' | translate }}:</span>
            <button mat-stroked-button (click)="insertText(' AND ')">
              <mat-icon>add</mat-icon>
              AND
            </button>
            <button mat-stroked-button (click)="insertText(' OR ')">
              <mat-icon>add</mat-icon>
              OR
            </button>
            <button mat-stroked-button (click)="insertText(' NOT ')">
              <mat-icon>remove</mat-icon>
              NOT
            </button>
            <button mat-stroked-button (click)="insertText('&quot;&quot;')" matTooltip="Phrase search">
              <mat-icon>format_quote</mat-icon>
              "Phrase"
            </button>
            <button mat-stroked-button (click)="insertText('*')" matTooltip="Wildcard">
              <mat-icon>star</mat-icon>
              *
            </button>
            <button mat-stroked-button (click)="insertText('()')" matTooltip="Group">
              <mat-icon>code</mat-icon>
              ( )
            </button>
          </div>

          <!-- Field Search Buttons -->
          <div class="field-search">
            <span class="section-label">{{ 'search.fieldSearch' | translate }}:</span>
            <button mat-stroked-button (click)="insertText('title:')">
              <mat-icon>title</mat-icon>
              title:
            </button>
            <button mat-stroked-button (click)="insertText('body:')">
              <mat-icon>description</mat-icon>
              body:
            </button>
            <button mat-stroked-button (click)="insertText('category:')">
              <mat-icon>category</mat-icon>
              category:
            </button>
          </div>

          <!-- Validation Status -->
          @if (parsedQuery()) {
            <div class="validation-status" [class.valid]="parsedQuery()!.isValid" [class.invalid]="!parsedQuery()!.isValid">
              @if (parsedQuery()!.isValid) {
                <mat-icon>check_circle</mat-icon>
                <span>{{ 'search.validQuery' | translate }}</span>
              } @else {
                <mat-icon>error</mat-icon>
                <span>{{ parsedQuery()!.validationError }}</span>
              }
            </div>

            @if (parsedQuery()!.isValid && parsedQuery()!.hasAdvancedSyntax) {
              <div class="query-preview">
                <strong>{{ 'search.openSearchQuery' | translate }}:</strong>
                <code>{{ parsedQuery()!.openSearchQuery }}</code>
              </div>
            }
          }

          <!-- Filters -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>filter_list</mat-icon>
                {{ 'search.additionalFilters' | translate }}
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="filters-grid">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'news.category' | translate }}</mat-label>
                <mat-select [(ngModel)]="category">
                  <mat-option [value]="null">{{ 'common.all' | translate }}</mat-option>
                  <mat-option value="Politics">Politics</mat-option>
                  <mat-option value="Security">Security</mat-option>
                  <mat-option value="Health">Health</mat-option>
                  <mat-option value="Economy">Economy</mat-option>
                  <mat-option value="Environment">Environment</mat-option>
                  <mat-option value="Technology">Technology</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ 'news.threatLevel' | translate }}</mat-label>
                <mat-select [(ngModel)]="minThreatLevel">
                  <mat-option [value]="null">{{ 'common.all' | translate }}</mat-option>
                  <mat-option [value]="1">1 - Low</mat-option>
                  <mat-option [value]="2">2 - Moderate</mat-option>
                  <mat-option [value]="3">3 - Elevated</mat-option>
                  <mat-option [value]="4">4 - High</mat-option>
                  <mat-option [value]="5">5 - Critical</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ 'news.sortBy' | translate }}</mat-label>
                <mat-select [(ngModel)]="sortBy">
                  <mat-option value="relevance">{{ 'news.relevance' | translate }}</mat-option>
                  <mat-option value="date">{{ 'news.date' | translate }}</mat-option>
                  <mat-option value="threat">{{ 'news.threat' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-expansion-panel>

          <!-- Action Buttons -->
          <div class="actions">
            <button mat-raised-button color="primary" (click)="search()" [disabled]="!parsedQuery()?.isValid">
              <mat-icon>search</mat-icon>
              {{ 'common.search' | translate }}
            </button>
            <button mat-button (click)="saveSearch()">
              <mat-icon>save</mat-icon>
              {{ 'search.saveSearch' | translate }}
            </button>
            <button mat-button (click)="clearQuery()">
              <mat-icon>clear</mat-icon>
              {{ 'common.clear' | translate }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Search Results -->
      @if (searchResults()) {
        <mat-card class="results-card">
          <mat-card-header>
            <mat-card-title>
              {{ 'search.results' | translate }} ({{ searchResults()!.total }})
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (searchResults()!.items.length === 0) {
              <div class="empty-results">
                <mat-icon>search_off</mat-icon>
                <p>{{ 'news.noResults' | translate }}</p>
              </div>
            } @else {
              <div class="results-list">
                @for (article of searchResults()!.items; track article.id) {
                  <div class="result-item" [routerLink]="['/news', article.id]">
                    <h3>{{ article.title }}</h3>
                    <p class="summary">{{ article.summary }}</p>
                    <div class="meta">
                      <span>{{ article.sourceName }}</span>
                      <span>•</span>
                      <span>{{ article.publishedAt | date:'short' }}</span>
                      @if (article.threatLevel > 0) {
                        <mat-chip color="warn">Threat: {{ article.threatLevel }}</mat-chip>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Syntax Help -->
      <mat-card class="help-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>help_outline</mat-icon>
            {{ 'search.syntaxHelp' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="help-grid">
            <div class="help-item">
              <code>security AND crisis</code>
              <span>Both terms must be present</span>
            </div>
            <div class="help-item">
              <code>flood OR drought</code>
              <span>Either term can be present</span>
            </div>
            <div class="help-item">
              <code>NOT violence</code>
              <span>Exclude this term</span>
            </div>
            <div class="help-item">
              <code>"armed conflict"</code>
              <span>Exact phrase match</span>
            </div>
            <div class="help-item">
              <code>terror*</code>
              <span>Wildcard (terrorism, terrorist)</span>
            </div>
            <div class="help-item">
              <code>title:election</code>
              <span>Search in specific field</span>
            </div>
            <div class="help-item">
              <code>(A OR B) AND C</code>
              <span>Group with parentheses</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .advanced-search-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .full-width {
      width: 100%;
    }

    .query-builder {
      margin-bottom: 24px;
    }

    .quick-insert, .field-search {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      align-items: center;
    }

    .section-label {
      font-weight: 500;
      margin-right: 8px;
    }

    .validation-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 4px;
      margin: 16px 0;
    }

    .validation-status.valid {
      background: rgba(0, 230, 118, 0.1);
      color: #00e676;
    }

    .validation-status.invalid {
      background: rgba(255, 23, 68, 0.1);
      color: #ff1744;
    }

    .query-preview {
      background: #1a1f2e;
      padding: 12px;
      border-radius: 4px;
      margin: 16px 0;
    }

    .query-preview code {
      display: block;
      margin-top: 8px;
      color: #00d4ff;
      word-break: break-all;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .results-card {
      margin-bottom: 24px;
    }

    .empty-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: #999;
    }

    .empty-results mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .result-item {
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 4px;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }

    .result-item:hover {
      background: rgba(102, 126, 234, 0.08);
      box-shadow: 0 2px 8px rgba(102,126,234,0.15);
    }

    .result-item h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }

    .result-item .summary {
      margin: 0 0 8px 0;
      color: #8892a4;
    }

    .result-item .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #999;
    }

    .help-card {
      background: #1a1f2e;
    }

    .help-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .help-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .help-item code {
      background: #1f2937;
      padding: 8px;
      border-radius: 4px;
      color: #00d4ff;
      font-weight: 500;
    }

    .help-item span {
      font-size: 14px;
      color: #8892a4;
    }
  `]
})
export class AdvancedSearchComponent implements OnInit {
  query = signal('');
  parsedQuery = signal<ParseQueryResponse | null>(null);
  searchResults = signal<NewsSearchResult | null>(null);

  category: string | null = null;
  minThreatLevel: number | null = null;
  sortBy = 'relevance';

  private parseTimeout?: number;

  constructor(
    private savedSearchService: SavedSearchService,
    private newsService: NewsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Load any initial query from route params if needed
  }

  onQueryChange(): void {
    // Debounce query parsing
    if (this.parseTimeout) {
      clearTimeout(this.parseTimeout);
    }

    this.parseTimeout = window.setTimeout(() => {
      if (this.query()) {
        this.savedSearchService.parseQuery(this.query()).subscribe({
          next: (parsed) => {
            this.parsedQuery.set(parsed);
          },
          error: () => {
            this.parsedQuery.set(null);
          }
        });
      } else {
        this.parsedQuery.set(null);
      }
    }, 500);
  }

  insertText(text: string): void {
    this.query.update(current => current + text);
    this.onQueryChange();
  }

  search(): void {
    if (!this.parsedQuery()?.isValid) {
      this.snackBar.open('Invalid query syntax', 'Close', { duration: 3000 });
      return;
    }

    this.newsService.search({
      query: this.query(),
      category: this.category || undefined,
      minThreatLevel: this.minThreatLevel || undefined,
      sortBy: this.sortBy,
      page: 1,
      pageSize: 20
    }).subscribe({
      next: (results) => {
        this.searchResults.set(results);
      },
      error: () => {
        this.snackBar.open('Search failed', 'Close', { duration: 3000 });
      }
    });
  }

  saveSearch(): void {
    if (!this.query() || !this.parsedQuery()?.isValid) {
      this.snackBar.open('Enter a valid query first', 'Close', { duration: 3000 });
      return;
    }

    const name = prompt('Enter a name for this search:');
    if (!name) return;

    this.savedSearchService.createSavedSearch({
      name,
      query: this.query(),
      category: this.category || undefined,
      minThreatLevel: this.minThreatLevel || undefined,
      sortBy: this.sortBy
    }).subscribe({
      next: () => {
        this.snackBar.open('Search saved successfully', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Failed to save search', 'Close', { duration: 3000 });
      }
    });
  }

  clearQuery(): void {
    this.query.set('');
    this.parsedQuery.set(null);
    this.searchResults.set(null);
    this.category = null;
    this.minThreatLevel = null;
    this.sortBy = 'relevance';
  }
}
