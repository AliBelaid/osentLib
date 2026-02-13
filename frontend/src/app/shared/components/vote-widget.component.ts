import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { VoteService } from '../../core/services/vote.service';
import { VoteStatsDto } from '../../core/models';

@Component({
  selector: 'app-vote-widget',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, MatIconModule],
  template: `
    <div class="vote-widget">
      <h4>Community Assessment</h4>
      <div class="vote-buttons">
        <mat-button-toggle-group [value]="currentVote" (change)="vote($event.value)">
          <mat-button-toggle value="REAL" class="vote-real">
            <mat-icon>check_circle</mat-icon> Real ({{ stats?.realCount ?? 0 }})
          </mat-button-toggle>
          <mat-button-toggle value="MISLEADING" class="vote-misleading">
            <mat-icon>warning</mat-icon> Misleading ({{ stats?.misleadingCount ?? 0 }})
          </mat-button-toggle>
          <mat-button-toggle value="UNSURE" class="vote-unsure">
            <mat-icon>help</mat-icon> Unsure ({{ stats?.unsureCount ?? 0 }})
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>
    </div>
  `,
  styles: [`
    .vote-widget { margin: 16px 0; padding: 16px; background: #fafafa; border-radius: 8px; }
    .vote-buttons { display: flex; gap: 8px; }
  `]
})
export class VoteWidgetComponent implements OnInit {
  @Input() articleId = '';
  @Input() currentVote?: string;
  @Input() stats?: VoteStatsDto;

  constructor(private voteService: VoteService) {}

  ngOnInit() {
    if (!this.stats && this.articleId) {
      this.voteService.getStats(this.articleId).subscribe(s => this.stats = s);
    }
  }

  vote(voteType: string) {
    if (this.currentVote === voteType) {
      this.voteService.deleteVote(this.articleId).subscribe(() => {
        this.currentVote = undefined;
        this.loadStats();
      });
    } else {
      this.voteService.castVote({ articleId: this.articleId, voteType }).subscribe(() => {
        this.currentVote = voteType;
        this.loadStats();
      });
    }
  }

  private loadStats() {
    this.voteService.getStats(this.articleId).subscribe(s => this.stats = s);
  }
}
