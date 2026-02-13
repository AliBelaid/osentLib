import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, MatIconModule],
  template: `
    <div
      class="level-badge"
      [class.compact]="size === 'small'"
      [style.backgroundColor]="backgroundColor"
      [style.borderColor]="borderColor"
      [matTooltip]="tooltipText"
    >
      <mat-icon class="level-icon">{{ getIcon() }}</mat-icon>
      <div class="level-info">
        <span class="level-number">{{ level }}</span>
        @if (showLevelName && size !== 'small') {
          <span class="level-name">{{ levelName }}</span>
        }
      </div>
      @if (showXp && totalXp !== undefined) {
        <span class="xp-text">{{ totalXp }} XP</span>
      }
    </div>
  `,
  styles: [`
    .level-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 24px;
      border: 2px solid;
      background: linear-gradient(135deg, var(--bg-color) 0%, rgba(255,255,255,0.1) 100%);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: default;
      color: white;
      font-weight: 500;
    }

    .level-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }

    .level-badge.compact {
      padding: 4px 8px;
      gap: 4px;
      border-radius: 16px;
      font-size: 12px;
    }

    .level-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: white;
    }

    .compact .level-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .level-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .level-number {
      font-size: 18px;
      font-weight: 700;
    }

    .compact .level-number {
      font-size: 14px;
    }

    .level-name {
      font-size: 11px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .xp-text {
      font-size: 12px;
      opacity: 0.9;
      margin-left: auto;
      padding-left: 8px;
      border-left: 1px solid rgba(255,255,255,0.3);
    }

    .compact .xp-text {
      font-size: 10px;
      padding-left: 4px;
    }
  `]
})
export class LevelBadgeComponent {
  @Input({ required: true }) level!: number;
  @Input({ required: true }) levelName!: string;
  @Input() totalXp?: number;
  @Input() size: 'small' | 'medium' = 'medium';
  @Input() showLevelName: boolean = true;
  @Input() showXp: boolean = false;

  get backgroundColor(): string {
    return this.getLevelColor(this.level);
  }

  get borderColor(): string {
    // Slightly lighter border for contrast
    const baseColor = this.getLevelColor(this.level);
    return this.lightenColor(baseColor, 20);
  }

  get tooltipText(): string {
    let text = `Level ${this.level} - ${this.levelName}`;
    if (this.totalXp !== undefined) {
      text += ` (${this.totalXp} total XP)`;
    }
    return text;
  }

  getIcon(): string {
    if (this.level >= 10) return 'workspace_premium'; // Elite
    if (this.level >= 8) return 'stars'; // Legend
    if (this.level >= 6) return 'military_tech'; // Veteran
    if (this.level >= 4) return 'verified'; // Specialist
    if (this.level >= 2) return 'emoji_events'; // Apprentice
    return 'grade'; // Novice
  }

  private getLevelColor(level: number): string {
    if (level >= 10) return '#FFD700'; // Gold - Elite
    if (level >= 8) return '#E5E4E2'; // Platinum - Legend
    if (level >= 6) return '#C0C0C0'; // Silver - Veteran
    if (level >= 4) return '#CD7F32'; // Bronze - Specialist
    if (level >= 2) return '#4CAF50'; // Green - Apprentice
    return '#9E9E9E'; // Gray - Novice
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }
}
