import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BadgeDto } from '@core/models';

@Component({
  selector: 'app-xp-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="xp-notification">
      <mat-icon class="xp-icon">star</mat-icon>
      <div class="xp-content">
        <strong>+{{ xpAmount }} XP</strong>
        <span>{{ message }}</span>
      </div>
      <button mat-icon-button (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .xp-notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      border-radius: 4px;
    }

    .xp-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      animation: spin 0.5s ease-in-out;
    }

    @keyframes spin {
      0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
      50% { transform: rotate(180deg) scale(1.2); }
      100% { transform: rotate(360deg) scale(1); opacity: 1; }
    }

    .xp-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 2px;
    }

    .xp-content strong {
      font-size: 16px;
    }

    .xp-content span {
      font-size: 12px;
      opacity: 0.9;
    }
  `]
})
export class XpNotificationComponent {
  xpAmount: number = 0;
  message: string = '';

  dismiss(): void {
    // Implemented by snackbar
  }
}

@Component({
  selector: 'app-badge-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="badge-notification">
      <mat-icon class="badge-icon">{{ badgeIcon }}</mat-icon>
      <div class="badge-content">
        <strong>Badge Unlocked!</strong>
        <span>{{ badgeName }}</span>
        <small>{{ badgeDescription }}</small>
      </div>
      <button mat-icon-button (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .badge-notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: white;
      border-radius: 4px;
      min-width: 300px;
    }

    .badge-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      animation: bounce 0.6s ease-in-out;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      25% { transform: translateY(-10px); }
      50% { transform: translateY(-5px); }
      75% { transform: translateY(-8px); }
    }

    .badge-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 4px;
    }

    .badge-content strong {
      font-size: 16px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    }

    .badge-content span {
      font-size: 14px;
    }

    .badge-content small {
      font-size: 11px;
      opacity: 0.9;
    }
  `]
})
export class BadgeNotificationComponent {
  badgeName: string = '';
  badgeDescription: string = '';
  badgeIcon: string = 'emoji_events';

  dismiss(): void {
    // Implemented by snackbar
  }
}

@Component({
  selector: 'app-level-up-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="levelup-notification">
      <mat-icon class="levelup-icon">workspace_premium</mat-icon>
      <div class="levelup-content">
        <strong>LEVEL UP!</strong>
        <span>You are now Level {{ level }}</span>
        <span class="level-name">{{ levelName }}</span>
      </div>
      <button mat-icon-button (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .levelup-notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(135deg, #9C27B0, #7B1FA2);
      color: white;
      border-radius: 4px;
      min-width: 300px;
    }

    .levelup-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      animation: pulse 0.8s ease-in-out;
      filter: drop-shadow(0 0 8px rgba(255,255,255,0.8));
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.3); }
    }

    .levelup-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 4px;
    }

    .levelup-content strong {
      font-size: 20px;
      letter-spacing: 2px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .levelup-content span {
      font-size: 14px;
    }

    .level-name {
      font-style: italic;
      opacity: 0.9;
      text-transform: uppercase;
    }
  `]
})
export class LevelUpNotificationComponent {
  level: number = 1;
  levelName: string = '';

  dismiss(): void {
    // Implemented by snackbar
  }
}

@Injectable({ providedIn: 'root' })
export class XpNotificationService {
  private snackBar = inject(MatSnackBar);

  /**
   * Show XP gained notification
   */
  showXpGained(xpAmount: number, activityType: string): void {
    const message = this.getActivityMessage(activityType);

    this.snackBar.openFromComponent(XpNotificationComponent, {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'xp-notification-snackbar',
      data: { xpAmount, message }
    });
  }

  /**
   * Show badge unlocked notification
   */
  showBadgeUnlocked(badge: BadgeDto): void {
    this.snackBar.openFromComponent(BadgeNotificationComponent, {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'badge-notification-snackbar',
      data: {
        badgeName: badge.name,
        badgeDescription: badge.description,
        badgeIcon: this.getBadgeIcon(badge.category)
      }
    });
  }

  /**
   * Show level up notification
   */
  showLevelUp(level: number, levelName: string): void {
    this.snackBar.openFromComponent(LevelUpNotificationComponent, {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'levelup-notification-snackbar',
      data: { level, levelName }
    });
  }

  private getActivityMessage(activityType: string): string {
    const messages: Record<string, string> = {
      'vote': 'for voting',
      'bookmark': 'for bookmarking',
      'bulletin_create': 'for creating a bulletin',
      'bulletin_publish': 'for publishing a bulletin',
      'alert_acknowledge': 'for acknowledging an alert',
      'profile_update': 'for updating your profile'
    };
    return messages[activityType] || 'earned';
  }

  private getBadgeIcon(category: string): string {
    const icons: Record<string, string> = {
      'voting': 'how_to_vote',
      'bookmarks': 'bookmark',
      'bulletins': 'campaign',
      'alerts': 'notifications',
      'engagement': 'psychology',
      'level': 'grade'
    };
    return icons[category] || 'emoji_events';
  }
}
