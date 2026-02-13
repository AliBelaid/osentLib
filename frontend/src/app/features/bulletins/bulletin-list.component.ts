import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { BulletinService } from '../../core/services/bulletin.service';
import { AuthService } from '../../core/services/auth.service';
import { BulletinDto } from '../../core/models';
import { ThreatBadgeComponent } from '../../shared/components/threat-badge.component';

@Component({
  selector: 'app-bulletin-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatChipsModule, MatIconModule, ThreatBadgeComponent
  ],
  template: `
    <div class="header-row">
      <h2>Bulletins</h2>
      @if (auth.hasRole('Editor') || auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
        <button mat-raised-button color="primary" routerLink="/bulletins/new">
          <mat-icon>add</mat-icon> New Bulletin
        </button>
      }
    </div>

    @for (b of bulletins; track b.id) {
      <mat-card class="bulletin-card">
        <mat-card-header>
          <mat-card-title>{{ b.title }}</mat-card-title>
          <mat-card-subtitle>
            {{ b.createdByName }} &middot; {{ b.createdAt | date:'medium' }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="meta">
            <mat-chip [class]="'status-' + b.status">{{ b.status | uppercase }}</mat-chip>
            <app-threat-badge [level]="b.severity" />
            @if (b.category) {
              <mat-chip>{{ b.category }}</mat-chip>
            }
          </div>
          <p>{{ b.content | slice:0:200 }}...</p>
        </mat-card-content>
        <mat-card-actions>
          @if (b.status === 'draft') {
            <button mat-button [routerLink]="['/bulletins', b.id, 'edit']">Edit</button>
            <button mat-button color="accent" (click)="submitForReview(b)">Submit for Review</button>
          }
          @if (b.status === 'review' && (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin'))) {
            <button mat-button color="primary" (click)="publish(b)">Publish</button>
          }
          @if (auth.hasRole('CountryAdmin') || auth.hasRole('AUAdmin')) {
            <button mat-button color="warn" (click)="delete(b)">Delete</button>
          }
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: [`
    .header-row { display: flex; justify-content: space-between; align-items: center; }
    .bulletin-card { margin-bottom: 12px; }
    .meta { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  `]
})
export class BulletinListComponent implements OnInit {
  bulletins: BulletinDto[] = [];

  constructor(public auth: AuthService, private bulletinService: BulletinService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.bulletinService.list().subscribe(data => this.bulletins = data);
  }

  submitForReview(b: BulletinDto) {
    this.bulletinService.submitForReview(b.id).subscribe(() => this.load());
  }

  publish(b: BulletinDto) {
    this.bulletinService.publish(b.id).subscribe(() => this.load());
  }

  delete(b: BulletinDto) {
    if (confirm(`Delete bulletin "${b.title}"?`)) {
      this.bulletinService.delete(b.id).subscribe(() => this.load());
    }
  }
}
