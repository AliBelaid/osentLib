import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SourceService } from '../../core/services/source.service';
import { SourceDto } from '../../core/models';

@Component({
  selector: 'app-sources',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatTableModule, MatSlideToggleModule
  ],
  template: `
    <h2>News Sources</h2>

    <mat-card class="form-card">
      <mat-card-header><mat-card-title>Add Source</mat-card-title></mat-card-header>
      <mat-card-content>
        <form (ngSubmit)="create()">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select [(ngModel)]="newSource.type" name="type" required>
                <mat-option value="GDELT">GDELT</mat-option>
                <mat-option value="RSS">RSS</mat-option>
                <mat-option value="MediaCloud">MediaCloud</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="newSource.name" name="name" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>URL</mat-label>
              <input matInput [(ngModel)]="newSource.url" name="url" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Interval (min)</mat-label>
              <input matInput type="number" [(ngModel)]="newSource.fetchIntervalMinutes" name="interval">
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit">Add</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <table mat-table [dataSource]="sources" class="sources-table">
      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>Type</th>
        <td mat-cell *matCellDef="let s">{{ s.type }}</td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let s">{{ s.name }}</td>
      </ng-container>
      <ng-container matColumnDef="url">
        <th mat-header-cell *matHeaderCellDef>URL</th>
        <td mat-cell *matCellDef="let s" class="url-cell">{{ s.url }}</td>
      </ng-container>
      <ng-container matColumnDef="interval">
        <th mat-header-cell *matHeaderCellDef>Interval</th>
        <td mat-cell *matCellDef="let s">{{ s.fetchIntervalMinutes }}m</td>
      </ng-container>
      <ng-container matColumnDef="lastFetched">
        <th mat-header-cell *matHeaderCellDef>Last Fetched</th>
        <td mat-cell *matCellDef="let s">{{ s.lastFetchedAt ? (s.lastFetchedAt | date:'short') : 'Never' }}</td>
      </ng-container>
      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef>Active</th>
        <td mat-cell *matCellDef="let s">
          <mat-slide-toggle [checked]="s.isActive" (change)="toggle(s)"></mat-slide-toggle>
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let s">
          <button mat-icon-button color="warn" (click)="deleteSource(s)">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
  `,
  styles: [`
    .form-card { margin-bottom: 16px; }
    .form-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .wide { min-width: 300px; }
    .sources-table { width: 100%; }
    .url-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `]
})
export class SourcesComponent implements OnInit {
  sources: SourceDto[] = [];
  displayedColumns = ['type', 'name', 'url', 'interval', 'lastFetched', 'active', 'actions'];

  newSource = { type: 'RSS', name: '', url: '', fetchIntervalMinutes: 15 };

  constructor(private sourceService: SourceService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.sourceService.list().subscribe(data => this.sources = data);
  }

  create() {
    this.sourceService.create({
      type: this.newSource.type,
      name: this.newSource.name,
      url: this.newSource.url,
      fetchIntervalMinutes: this.newSource.fetchIntervalMinutes
    }).subscribe(() => {
      this.newSource = { type: 'RSS', name: '', url: '', fetchIntervalMinutes: 15 };
      this.load();
    });
  }

  toggle(source: SourceDto) {
    this.sourceService.toggle(source.id).subscribe(() => this.load());
  }

  deleteSource(source: SourceDto) {
    if (confirm(`Delete source "${source.name}"?`)) {
      this.sourceService.delete(source.id).subscribe(() => this.load());
    }
  }
}
