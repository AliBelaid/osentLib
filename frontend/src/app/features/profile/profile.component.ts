import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { ExperienceService } from '@core/services/experience.service';
import { UserProfileDto, UserExperienceDto, UserBadgeDto } from '@core/models';
import { LevelBadgeComponent } from '@shared/components/level-badge.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule,
    LevelBadgeComponent
  ],
  template: `
    <div class="page-container">
      <h1>{{ 'profile.title' | translate }}</h1>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <div class="profile-grid">
          <!-- Profile Card -->
          <mat-card class="profile-card">
            <mat-card-header>
              <mat-card-title>{{ 'profile.personalInfo' | translate }}</mat-card-title>
              <div class="spacer"></div>
              @if (!editMode()) {
                <button mat-icon-button (click)="toggleEditMode()">
                  <mat-icon>edit</mat-icon>
                </button>
              }
            </mat-card-header>
            <mat-card-content>
              <!-- Avatar Section -->
              <div class="avatar-section">
                @if (profile()?.avatarUrl) {
                  <img [src]="profile()!.avatarUrl" alt="Avatar" class="avatar-image" />
                } @else {
                  <div class="avatar-placeholder">
                    <mat-icon>account_circle</mat-icon>
                  </div>
                }
                @if (editMode()) {
                  <div class="avatar-actions">
                    <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" hidden />
                    <button mat-raised-button color="primary" (click)="fileInput.click()">
                      <mat-icon>upload</mat-icon>
                      {{ 'profile.uploadAvatar' | translate }}
                    </button>
                  </div>
                }
              </div>

              <!-- User Basic Info -->
              <div class="user-info">
                <div class="info-row">
                  <mat-icon>person</mat-icon>
                  <span class="label">{{ 'auth.username' | translate }}:</span>
                  <span class="value">{{ auth.user()?.username }}</span>
                </div>
                <div class="info-row">
                  <mat-icon>email</mat-icon>
                  <span class="label">{{ 'auth.email' | translate }}:</span>
                  <span class="value">{{ auth.user()?.email }}</span>
                </div>
                <div class="info-row">
                  <mat-icon>flag</mat-icon>
                  <span class="label">{{ 'users.country' | translate }}:</span>
                  <span class="value">{{ auth.user()?.countryName }}</span>
                </div>
                <div class="info-row">
                  <mat-icon>calendar_today</mat-icon>
                  <span class="label">{{ 'profile.memberSince' | translate }}:</span>
                  <span class="value">{{ formatDate(auth.user()?.createdAt) }}</span>
                </div>
              </div>

              @if (editMode()) {
                <!-- Edit Form -->
                <form [formGroup]="profileForm" class="profile-form">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'profile.bio' | translate }}</mat-label>
                    <textarea matInput formControlName="bio" rows="3"></textarea>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'profile.organization' | translate }}</mat-label>
                    <input matInput formControlName="organization" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'profile.jobTitle' | translate }}</mat-label>
                    <input matInput formControlName="jobTitle" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'profile.phoneNumber' | translate }}</mat-label>
                    <input matInput formControlName="phoneNumber" />
                    <mat-icon matPrefix>phone</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'profile.linkedIn' | translate }}</mat-label>
                    <input matInput formControlName="linkedInUrl" />
                    <mat-icon matPrefix>link</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'profile.twitter' | translate }}</mat-label>
                    <input matInput formControlName="twitterHandle" />
                    <mat-icon matPrefix>alternate_email</mat-icon>
                  </mat-form-field>

                  <div class="form-actions">
                    <button mat-button (click)="cancelEdit()">{{ 'common.cancel' | translate }}</button>
                    <button mat-raised-button color="primary" (click)="saveProfile()" [disabled]="saving()">
                      @if (saving()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        {{ 'common.save' | translate }}
                      }
                    </button>
                  </div>
                </form>
              } @else {
                <!-- View Mode -->
                @if (profile()) {
                  <div class="profile-details">
                    @if (profile()?.bio) {
                      <div class="detail-section">
                        <h3>{{ 'profile.bio' | translate }}</h3>
                        <p>{{ profile()?.bio }}</p>
                      </div>
                    }
                    @if (profile()?.organization || profile()?.jobTitle) {
                      <div class="detail-section">
                        <h3>{{ 'profile.organization' | translate }}</h3>
                        @if (profile()?.organization) {
                          <p>{{ profile()?.organization }}</p>
                        }
                        @if (profile()?.jobTitle) {
                          <p class="job-title">{{ profile()?.jobTitle }}</p>
                        }
                      </div>
                    }
                    @if (profile()?.phoneNumber || profile()?.linkedInUrl || profile()?.twitterHandle) {
                      <div class="detail-section">
                        <h3>{{ 'profile.socialLinks' | translate }}</h3>
                        @if (profile()?.phoneNumber) {
                          <div class="social-link">
                            <mat-icon>phone</mat-icon>
                            <span>{{ profile()?.phoneNumber }}</span>
                          </div>
                        }
                        @if (profile()?.linkedInUrl) {
                          <div class="social-link">
                            <mat-icon>link</mat-icon>
                            <a [href]="profile()?.linkedInUrl" target="_blank">LinkedIn</a>
                          </div>
                        }
                        @if (profile()?.twitterHandle) {
                          <div class="social-link">
                            <mat-icon>alternate_email</mat-icon>
                            <span>{{ profile()?.twitterHandle }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- XP & Level Card -->
          @if (experience()) {
            <mat-card class="xp-card">
              <mat-card-header>
                <mat-card-title>{{ 'leaderboard.level' | translate }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="xp-section">
                  <app-level-badge
                    [level]="experience()!.level"
                    [levelName]="experience()!.levelName"
                    [totalXp]="experience()!.totalXp"
                    [showXp]="true"
                    size="medium"
                  />

                  <div class="xp-progress">
                    <div class="xp-info">
                      <span>{{ experience()!.currentLevelXp }} / {{ experience()!.nextLevelXp }} XP</span>
                      <span>{{ getXpProgressPercent() }}%</span>
                    </div>
                    <mat-progress-bar
                      mode="determinate"
                      [value]="getXpProgressPercent()"
                      [color]="'primary'">
                    </mat-progress-bar>
                  </div>

                  @if (experience()!.nextLevelXp > 0) {
                    <p class="xp-next-level">
                      {{ experience()!.nextLevelXp - experience()!.currentLevelXp }} XP to next level
                    </p>
                  } @else {
                    <p class="xp-next-level max-level">
                      <mat-icon>workspace_premium</mat-icon>
                      Maximum level reached!
                    </p>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Badges Card -->
          <mat-card class="badges-card">
            <mat-card-header>
              <mat-card-title>{{ 'leaderboard.badges' | translate }}</mat-card-title>
              <div class="spacer"></div>
              <span class="badge-count">{{ badges().length }}</span>
            </mat-card-header>
            <mat-card-content>
              @if (badges().length > 0) {
                <div class="badges-grid">
                  @for (badge of badges(); track badge.id) {
                    <div class="badge-item" [matTooltip]="badge.badgeDescription">
                      <div class="badge-icon" [style.borderColor]="getBadgeColor(badge.rarity)">
                        <mat-icon>{{ getBadgeIcon(badge.category) }}</mat-icon>
                      </div>
                      <div class="badge-info">
                        <span class="badge-name">{{ badge.badgeName }}</span>
                        <mat-chip [style.backgroundColor]="getBadgeColor(badge.rarity)" class="rarity-chip">
                          {{ badge.rarity }}
                        </mat-chip>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-badges">
                  <mat-icon>emoji_events</mat-icon>
                  <p>{{ 'leaderboard.noBadges' | translate }}</p>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 400px;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    .profile-card, .stats-card {
      height: fit-content;
    }

    mat-card-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .avatar-image {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background-color: var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-placeholder mat-icon {
      font-size: 100px;
      width: 100px;
      height: 100px;
      color: #667eea;
    }

    .avatar-actions {
      margin-top: 16px;
    }

    .user-info {
      margin-bottom: 24px;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-default);
    }

    .info-row mat-icon {
      color: #667eea;
    }

    .info-row .label {
      font-weight: 500;
      min-width: 120px;
    }

    .info-row .value {
      color: var(--text-secondary);
    }

    .profile-form {
      margin-top: 16px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    .profile-details {
      margin-top: 16px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .detail-section p {
      margin: 4px 0;
      color: var(--text-secondary);
    }

    .job-title {
      font-style: italic;
    }

    .social-link {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }

    .social-link a {
      color: #667eea;
      text-decoration: none;
    }

    .social-link a:hover {
      text-decoration: underline;
    }

    .stats-card {
      padding: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-bottom: 1px solid var(--border-default);
    }

    .stat-item:last-child {
      border-bottom: none;
    }

    .stat-item mat-icon {
      color: #667eea;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 500;
      color: #00d4ff;
    }

    .stat-label {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .xp-card, .badges-card {
      margin-bottom: 24px;
    }

    .xp-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .xp-progress {
      width: 100%;
    }

    .xp-info {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .xp-next-level {
      text-align: center;
      color: var(--text-secondary);
      font-size: 12px;
      margin: 0;
    }

    .xp-next-level.max-level {
      color: #FFD700;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .badge-count {
      background: #667eea;
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }

    .badges-grid {
      display: grid;
      gap: 12px;
    }

    .badge-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: var(--bg-card);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .badge-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102,126,234,0.2);
    }

    .badge-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-surface);
    }

    .badge-icon mat-icon {
      color: #667eea;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .badge-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .badge-name {
      font-weight: 500;
      font-size: 14px;
    }

    .rarity-chip {
      color: white !important;
      font-size: 10px;
      height: 20px;
      text-transform: uppercase;
      font-weight: 500;
      width: fit-content;
    }

    .empty-badges {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: var(--text-secondary);
    }

    .empty-badges mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
  `]
})
export class ProfileComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editMode = signal(false);
  profile = signal<UserProfileDto | null>(null);
  experience = signal<UserExperienceDto | null>(null);
  badges = signal<UserBadgeDto[]>([]);
  profileForm: FormGroup;

  constructor(
    public auth: AuthService,
    private userService: UserService,
    private experienceService: ExperienceService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      bio: [''],
      organization: [''],
      jobTitle: [''],
      phoneNumber: [''],
      linkedInUrl: [''],
      twitterHandle: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadExperience();
    this.loadBadges();
  }

  loadExperience(): void {
    this.experienceService.getMyExperience().subscribe({
      next: (exp) => {
        this.experience.set(exp);
      },
      error: () => {
        // Experience not created yet, that's ok
      }
    });
  }

  loadBadges(): void {
    this.experienceService.getMyBadges().subscribe({
      next: (badges) => {
        this.badges.set(badges);
      },
      error: () => {
        // No badges yet
      }
    });
  }

  getXpProgressPercent(): number {
    const exp = this.experience();
    if (!exp || exp.nextLevelXp === 0) return 100;
    return Math.round((exp.currentLevelXp / exp.nextLevelXp) * 100);
  }

  getBadgeColor(rarity: string): string {
    return this.experienceService.getBadgeRarityColor(rarity);
  }

  getBadgeIcon(category: string): string {
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

  loadProfile(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.loading.set(true);
    this.userService.getProfile(userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.updateForm(profile);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          // Profile doesn't exist yet, that's ok
          this.loading.set(false);
        } else {
          this.snackBar.open('Error loading profile', 'Close', { duration: 3000 });
          this.loading.set(false);
        }
      }
    });
  }

  updateForm(profile: UserProfileDto): void {
    this.profileForm.patchValue({
      bio: profile.bio || '',
      organization: profile.organization || '',
      jobTitle: profile.jobTitle || '',
      phoneNumber: profile.phoneNumber || '',
      linkedInUrl: profile.linkedInUrl || '',
      twitterHandle: profile.twitterHandle || ''
    });
  }

  toggleEditMode(): void {
    this.editMode.set(!this.editMode());
  }

  cancelEdit(): void {
    this.editMode.set(false);
    if (this.profile()) {
      this.updateForm(this.profile()!);
    }
  }

  saveProfile(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.saving.set(true);
    this.userService.updateProfile(userId, this.profileForm.value).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.editMode.set(false);
        this.saving.set(false);
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Error updating profile', 'Close', { duration: 3000 });
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.userService.uploadAvatar(userId, file).subscribe({
      next: (response) => {
        // Update profile with new avatar URL
        const currentProfile = this.profile();
        if (currentProfile) {
          this.profile.set({ ...currentProfile, avatarUrl: response.avatarUrl });
        }
        this.snackBar.open('Avatar uploaded successfully', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Error uploading avatar', 'Close', { duration: 3000 });
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}
