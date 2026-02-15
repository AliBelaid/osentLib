import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NewsService } from '../../core/services/news.service';
import { NewsDetailDto } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';
import { VoteWidgetComponent } from '../../shared/components/vote-widget.component';
import { BookmarkButtonComponent } from '../../shared/components/bookmark-button.component';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatChipsModule, MatIconModule,
    MatButtonModule, ThreatBadgeComponent, VoteWidgetComponent, BookmarkButtonComponent
  ],
  template: `
    @if (article) {
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ article.title }}</mat-card-title>
          <mat-card-subtitle>
            {{ article.sourceName }} &middot; {{ article.publishedAt | date:'full' }}
            &middot; {{ article.language | uppercase }}
          </mat-card-subtitle>
          <div class="header-actions">
            <app-bookmark-button [articleId]="article.id" />
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="meta-row">
            <app-threat-badge [level]="article.threatLevel" />
            @if (article.threatType && article.threatType !== 'none') {
              <mat-chip color="warn" highlighted>{{ article.threatType }}</mat-chip>
            }
            <span>Credibility: {{ (article.credibilityScore * 100) | number:'1.0-0' }}%</span>
          </div>

          <div class="tags">
            @for (tag of article.countryTags; track tag) {
              <mat-chip>{{ tag }}</mat-chip>
            }
            @for (cat of article.categories; track cat) {
              <mat-chip color="primary" highlighted>{{ cat }}</mat-chip>
            }
          </div>

          @if (article.summary) {
            <blockquote class="summary">{{ article.summary }}</blockquote>
          }

          <div class="body" [innerHTML]="article.body"></div>

          @if (article.entities.length > 0) {
            <h4>Entities</h4>
            <mat-chip-set>
              @for (entity of article.entities; track entity.name) {
                <mat-chip>{{ entity.name }} ({{ entity.type }})</mat-chip>
              }
            </mat-chip-set>
          }

          <div class="actions">
            <a [href]="article.url" target="_blank" mat-raised-button>
              <mat-icon>open_in_new</mat-icon> Read Original
            </a>
          </div>

          <app-vote-widget [articleId]="article.id" [currentVote]="article.userVote" [stats]="article.voteStats!" />
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .header-actions { position: absolute; right: 8px; top: 8px; }
    .meta-row { display: flex; gap: 12px; align-items: center; margin: 16px 0; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    .summary { border-left: 3px solid #667eea; padding-left: 12px; color: #8892a4; margin: 16px 0; }
    .body { line-height: 1.7; margin: 16px 0; }
    .actions { margin: 16px 0; }
  `]
})
export class NewsDetailComponent implements OnInit {
  article: NewsDetailDto | null = null;

  constructor(private route: ActivatedRoute, private newsService: NewsService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.newsService.getDetail(id).subscribe(data => this.article = data);
  }
}
