import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ExperienceService } from '@core/services/experience.service';
import { AuthService } from '@core/services/auth.service';
import { LeaderboardEntryDto } from '@core/models';
import { LevelBadgeComponent } from '@shared/components/level-badge.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    FormsModule,
    TranslateModule,
    LevelBadgeComponent
  ],
  template: `
    <div class="leaderboard-container">
      <div class="header">
        <h2>{{ 'nav.leaderboard' | translate }}</h2>
        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'common.filter' | translate }}</mat-label>
            <mat-select [(value)]="filterType" (selectionChange)="loadLeaderboard()">
              <mat-option value="global">{{ 'leaderboard.global' | translate }}</mat-option>
              <mat-option value="country">{{ 'leaderboard.myCountry' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="loadLeaderboard()">
            <mat-icon>refresh</mat-icon>
            {{ 'common.refresh' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <mat-card>
          <mat-card-content>
            <div class="loading">{{ 'common.loading' | translate }}</div>
          </mat-card-content>
        </mat-card>
      } @else {
        <!-- Top 3 Podium -->
        @if (leaderboard().length >= 3) {
          <div class="podium">
            <!-- 2nd Place -->
            <div class="podium-card second">
              <div class="rank-badge silver">
                <mat-icon>looks_two</mat-icon>
              </div>
              <div class="podium-info">
                <h3>{{ leaderboard()[1].fullName }}</h3>
                <p class="username">{{'@'}}{{ leaderboard()[1].username }}</p>
                <p class="country">{{ leaderboard()[1].countryCode }}</p>
                <app-level-badge
                  [level]="leaderboard()[1].level"
                  [levelName]="getLevelName(leaderboard()[1].level)"
                  [totalXp]="leaderboard()[1].totalXp"
                  [showXp]="true"
                  size="medium"
                />
              </div>
            </div>

            <!-- 1st Place -->
            <div class="podium-card first">
              <div class="rank-badge gold">
                <mat-icon>emoji_events</mat-icon>
              </div>
              <div class="podium-info">
                <h3>{{ leaderboard()[0].fullName }}</h3>
                <p class="username">{{'@'}}{{ leaderboard()[0].username }}</p>
                <p class="country">{{ leaderboard()[0].countryCode }}</p>
                <app-level-badge
                  [level]="leaderboard()[0].level"
                  [levelName]="getLevelName(leaderboard()[0].level)"
                  [totalXp]="leaderboard()[0].totalXp"
                  [showXp]="true"
                  size="medium"
                />
              </div>
            </div>

            <!-- 3rd Place -->
            <div class="podium-card third">
              <div class="rank-badge bronze">
                <mat-icon>looks_3</mat-icon>
              </div>
              <div class="podium-info">
                <h3>{{ leaderboard()[2].fullName }}</h3>
                <p class="username">{{'@'}}{{ leaderboard()[2].username }}</p>
                <p class="country">{{ leaderboard()[2].countryCode }}</p>
                <app-level-badge
                  [level]="leaderboard()[2].level"
                  [levelName]="getLevelName(leaderboard()[2].level)"
                  [totalXp]="leaderboard()[2].totalXp"
                  [showXp]="true"
                  size="medium"
                />
              </div>
            </div>
          </div>
        }

        <!-- Rest of Leaderboard -->
        <mat-card>
          <mat-card-content>
            <table mat-table [dataSource]="remainingEntries()" class="leaderboard-table">
              <!-- Rank Column -->
              <ng-container matColumnDef="rank">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let entry; let i = index">
                  <span class="rank-number">{{ i + 4 }}</span>
                </td>
              </ng-container>

              <!-- User Column -->
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>{{ 'common.user' | translate }}</th>
                <td mat-cell *matCellDef="let entry">
                  <div class="user-cell">
                    <div class="user-info">
                      <strong>{{ entry.fullName }}</strong>
                      <span class="username">{{'@'}}{{ entry.username }}</span>
                    </div>
                    @if (entry.userId === currentUserId()) {
                      <mat-chip color="accent">{{ 'common.you' | translate }}</mat-chip>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Country Column -->
              <ng-container matColumnDef="country">
                <th mat-header-cell *matHeaderCellDef>{{ 'users.country' | translate }}</th>
                <td mat-cell *matCellDef="let entry">{{ entry.countryCode }}</td>
              </ng-container>

              <!-- Level Column -->
              <ng-container matColumnDef="level">
                <th mat-header-cell *matHeaderCellDef>{{ 'leaderboard.level' | translate }}</th>
                <td mat-cell *matCellDef="let entry">
                  <app-level-badge
                    [level]="entry.level"
                    [levelName]="getLevelName(entry.level)"
                    size="small"
                  />
                </td>
              </ng-container>

              <!-- XP Column -->
              <ng-container matColumnDef="xp">
                <th mat-header-cell *matHeaderCellDef>{{ 'leaderboard.totalXp' | translate }}</th>
                <td mat-cell *matCellDef="let entry">
                  <strong>{{ entry.totalXp | number }}</strong>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [class.current-user]="row.userId === currentUserId()"></tr>
            </table>

            @if (leaderboard().length === 0) {
              <div class="empty-state">
                <mat-icon>leaderboard</mat-icon>
                <p>{{ 'leaderboard.noEntries' | translate }}</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .leaderboard-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header h2 {
      margin: 0;
    }

    .filters {
      display: flex;
      gap: 12px;
      align-items: center;
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

    /* Podium Styles */
    .podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 32px;
      padding: 24px;
    }

    .podium-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      position: relative;
      transition: transform 0.3s;
    }

    .podium-card:hover {
      transform: translateY(-8px);
    }

    .podium-card.first {
      width: 280px;
      order: 2;
      border: 3px solid #FFD700;
    }

    .podium-card.second {
      width: 240px;
      order: 1;
      border: 3px solid #C0C0C0;
    }

    .podium-card.third {
      width: 240px;
      order: 3;
      border: 3px solid #CD7F32;
    }

    .rank-badge {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: -40px auto 16px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .rank-badge mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: white;
    }

    .rank-badge.gold {
      background: linear-gradient(135deg, #FFD700, #FFA500);
    }

    .rank-badge.silver {
      background: linear-gradient(135deg, #C0C0C0, #A8A8A8);
    }

    .rank-badge.bronze {
      background: linear-gradient(135deg, #CD7F32, #B87333);
    }

    .podium-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .podium-info .username {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .podium-info .country {
      color: #999;
      font-size: 12px;
      margin: 8px 0;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Table Styles */
    .leaderboard-table {
      width: 100%;
    }

    .rank-number {
      font-size: 18px;
      font-weight: 700;
      color: #666;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-info .username {
      font-size: 12px;
      color: #666;
    }

    tr.current-user {
      background-color: #e3f2fd;
    }

    @media (max-width: 768px) {
      .podium {
        flex-direction: column;
        align-items: center;
      }

      .podium-card.first,
      .podium-card.second,
      .podium-card.third {
        width: 100%;
        max-width: 320px;
        order: initial !important;
      }
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  private experienceService = signal(this.experienceServiceInstance);
  private authService = signal(this.authServiceInstance);

  loading = signal(false);
  leaderboard = signal<LeaderboardEntryDto[]>([]);
  filterType: 'global' | 'country' = 'global';

  displayedColumns = ['rank', 'user', 'country', 'level', 'xp'];

  constructor(
    private experienceServiceInstance: ExperienceService,
    private authServiceInstance: AuthService
  ) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.loading.set(true);
    const countryCode = this.filterType === 'country' ? this.authService().user()?.countryCode : undefined;

    this.experienceServiceInstance.getLeaderboard(1, 50, countryCode).subscribe({
      next: (entries) => {
        this.leaderboard.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  remainingEntries(): LeaderboardEntryDto[] {
    return this.leaderboard().slice(3);
  }

  currentUserId(): string | undefined {
    return this.authService().user()?.id;
  }

  getLevelName(level: number): string {
    if (level >= 10) return 'Elite';
    if (level >= 9) return 'Legend';
    if (level >= 8) return 'Legend';
    if (level >= 7) return 'Grandmaster';
    if (level >= 6) return 'Veteran';
    if (level >= 5) return 'Expert';
    if (level >= 4) return 'Specialist';
    if (level >= 3) return 'Professional';
    if (level >= 2) return 'Apprentice';
    return 'Novice';
  }
}
