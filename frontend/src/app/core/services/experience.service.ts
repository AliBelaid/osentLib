import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  UserExperienceDto,
  BadgeDto,
  UserBadgeDto,
  LeaderboardEntryDto,
  ActivityHistoryResult,
  AwardXpRequest
} from '@core/models';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class ExperienceService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/experience`;

  // Reactive state
  myExperience = signal<UserExperienceDto | null>(null);
  myBadges = signal<UserBadgeDto[]>([]);
  allBadges = signal<BadgeDto[]>([]);
  leaderboard = signal<LeaderboardEntryDto[]>([]);

  /**
   * Get current user's XP and level
   */
  getMyExperience(): Observable<UserExperienceDto> {
    return this.http.get<UserExperienceDto>(`${this.base}/me`).pipe(
      tap(exp => this.myExperience.set(exp))
    );
  }

  /**
   * Get any user's XP and level (for profile viewing)
   */
  getUserExperience(userId: string): Observable<UserExperienceDto> {
    return this.http.get<UserExperienceDto>(`${this.base}/user/${userId}`);
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(page: number = 1, pageSize: number = 50, countryCode?: string): Observable<LeaderboardEntryDto[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (countryCode) {
      params = params.set('countryCode', countryCode);
    }

    return this.http.get<LeaderboardEntryDto[]>(`${this.base}/leaderboard`, { params }).pipe(
      tap(leaderboard => this.leaderboard.set(leaderboard))
    );
  }

  /**
   * Get current user's badges
   */
  getMyBadges(): Observable<UserBadgeDto[]> {
    return this.http.get<UserBadgeDto[]>(`${this.base}/badges/me`).pipe(
      tap(badges => this.myBadges.set(badges))
    );
  }

  /**
   * Get any user's badges (for profile viewing)
   */
  getUserBadges(userId: string): Observable<UserBadgeDto[]> {
    return this.http.get<UserBadgeDto[]>(`${this.base}/badges/user/${userId}`);
  }

  /**
   * Get all available badges (catalog)
   */
  getAllBadges(): Observable<BadgeDto[]> {
    return this.http.get<BadgeDto[]>(`${this.base}/badges/all`).pipe(
      tap(badges => this.allBadges.set(badges))
    );
  }

  /**
   * Get current user's activity history
   */
  getMyActivity(page: number = 1, pageSize: number = 20): Observable<ActivityHistoryResult> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ActivityHistoryResult>(`${this.base}/activity/me`, { params });
  }

  /**
   * Get any user's activity history (admin only)
   */
  getUserActivity(userId: string, page: number = 1, pageSize: number = 20): Observable<ActivityHistoryResult> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ActivityHistoryResult>(`${this.base}/activity/user/${userId}`, { params });
  }

  /**
   * Check for newly unlocked badges
   */
  checkBadges(): Observable<{ newlyUnlocked: BadgeDto[] }> {
    return this.http.post<{ newlyUnlocked: BadgeDto[] }>(`${this.base}/badges/check`, {}).pipe(
      tap(result => {
        if (result.newlyUnlocked.length > 0) {
          // Refresh badges after unlocking new ones
          this.getMyBadges().subscribe();
        }
      })
    );
  }

  /**
   * Manually award XP (admin only)
   */
  awardXp(targetUserId: string, request: AwardXpRequest): Observable<UserExperienceDto> {
    return this.http.post<UserExperienceDto>(`${this.base}/award?targetUserId=${targetUserId}`, request);
  }

  /**
   * Get level badge color based on level
   */
  getLevelColor(level: number): string {
    if (level >= 10) return '#FFD700'; // Gold - Elite
    if (level >= 8) return '#E5E4E2'; // Platinum - Legend
    if (level >= 6) return '#C0C0C0'; // Silver - Veteran
    if (level >= 4) return '#CD7F32'; // Bronze - Specialist
    if (level >= 2) return '#4CAF50'; // Green - Apprentice
    return '#9E9E9E'; // Gray - Novice
  }

  /**
   * Get badge rarity color
   */
  getBadgeRarityColor(rarity: string): string {
    switch (rarity) {
      case 'legendary': return '#FFD700'; // Gold
      case 'epic': return '#A335EE'; // Purple
      case 'rare': return '#0070DD'; // Blue
      case 'common': return '#9D9D9D'; // Gray
      default: return '#9D9D9D';
    }
  }

  /**
   * Get XP progress percentage within current level
   */
  getXpProgressPercent(experience: UserExperienceDto): number {
    if (experience.nextLevelXp === 0) return 100; // Max level
    return Math.round((experience.currentLevelXp / experience.nextLevelXp) * 100);
  }

  /**
   * Get badge progress percentage
   */
  getBadgeProgressPercent(badge: UserBadgeDto): number {
    return Math.round((badge.progress / badge.requiredCount) * 100);
  }

  /**
   * Format activity type for display
   */
  formatActivityType(activityType: string): string {
    const mapping: Record<string, string> = {
      'vote': 'Voted on article',
      'bookmark': 'Bookmarked article',
      'bulletin_create': 'Created bulletin',
      'bulletin_publish': 'Published bulletin',
      'alert_acknowledge': 'Acknowledged alert',
      'profile_update': 'Updated profile'
    };
    return mapping[activityType] || activityType;
  }
}
