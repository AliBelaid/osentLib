import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { NewsService } from '../../core/services/news.service';
import { NewsSearchRequest, NewsSearchResult, FacetBucket } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';
import { BookmarkButtonComponent } from '../../shared/components/bookmark-button.component';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatChipsModule,
    MatPaginatorModule, MatIconModule, ThreatBadgeComponent, BookmarkButtonComponent
  ],
  template: `
    <h2>News Search</h2>

    <mat-card class="search-bar">
      <mat-card-content>
        <div class="search-row">
          <mat-form-field appearance="outline">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="request.query" (keyup.enter)="search()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select [(ngModel)]="request.category">
              <mat-option value="">All</mat-option>
              @for (c of facets['categories'] ?? []; track c.key) {
                <mat-option [value]="c.key">{{ c.key }} ({{ c.count }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Min Threat Level</mat-label>
            <mat-select [(ngModel)]="request.minThreatLevel">
              <mat-option [value]="undefined">Any</mat-option>
              @for (l of [0,1,2,3,4,5]; track l) {
                <mat-option [value]="l">{{ l }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="search()">
            <mat-icon>search</mat-icon> Search
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    @for (article of result?.items ?? []; track article.id) {
      <mat-card class="article-card" [routerLink]="['/news', article.id]" style="cursor:pointer">
        <mat-card-header>
          <mat-card-title>{{ article.title }}</mat-card-title>
          <mat-card-subtitle>
            {{ article.sourceName }} &middot; {{ article.publishedAt | date:'medium' }}
          </mat-card-subtitle>
          <div class="card-actions">
            <app-bookmark-button [articleId]="article.id" />
          </div>
        </mat-card-header>
        <mat-card-content>
          <p>{{ article.summary }}</p>
          <div class="tags">
            <app-threat-badge [level]="article.threatLevel" />
            @for (tag of article.countryTags; track tag) {
              <mat-chip>{{ tag }}</mat-chip>
            }
            @for (cat of article.categories; track cat) {
              <mat-chip color="primary" highlighted>{{ cat }}</mat-chip>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }

    <mat-paginator
      [length]="result?.total ?? 0"
      [pageSize]="request.pageSize ?? 20"
      [pageIndex]="(request.page ?? 1) - 1"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPage($event)">
    </mat-paginator>
  `,
  styles: [`
    .search-bar { margin-bottom: 16px; }
    .search-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .article-card { margin-bottom: 12px; }
    .card-actions { position: absolute; right: 8px; top: 8px; }
    .tags { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  `]
})
export class NewsListComponent implements OnInit {
  request: NewsSearchRequest = { page: 1, pageSize: 20 };
  result: NewsSearchResult | null = null;
  facets: { [key: string]: FacetBucket[] } = {};

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.search();
  }

  search() {
    this.request.page = 1;
    this.loadResults();
  }

  onPage(event: PageEvent) {
    this.request.page = event.pageIndex + 1;
    this.request.pageSize = event.pageSize;
    this.loadResults();
  }

  private loadResults() {
    this.newsService.search(this.request).subscribe(data => {
      this.result = data;
      this.facets = data.facets;
    });
  }
}
