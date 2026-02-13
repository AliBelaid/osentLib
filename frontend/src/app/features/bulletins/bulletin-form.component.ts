import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { BulletinService } from '../../core/services/bulletin.service';

@Component({
  selector: 'app-bulletin-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule
  ],
  template: `
    <h2>{{ isEdit ? 'Edit' : 'New' }} Bulletin</h2>
    <mat-card>
      <mat-card-content>
        <form (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput [(ngModel)]="title" name="title" required maxlength="300">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Content</mat-label>
            <textarea matInput [(ngModel)]="content" name="content" required rows="10"></textarea>
          </mat-form-field>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Severity (0-5)</mat-label>
              <mat-select [(ngModel)]="severity" name="severity">
                @for (s of [0,1,2,3,4,5]; track s) {
                  <mat-option [value]="s">{{ s }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <input matInput [(ngModel)]="category" name="category">
            </mat-form-field>
          </div>
          <button mat-raised-button color="primary" type="submit">Save</button>
          <button mat-button type="button" (click)="router.navigate(['/bulletins'])">Cancel</button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; }
  `]
})
export class BulletinFormComponent implements OnInit {
  isEdit = false;
  bulletinId = '';
  title = '';
  content = '';
  severity = 0;
  category = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private bulletinService: BulletinService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.bulletinId = id;
      this.bulletinService.get(id).subscribe(b => {
        this.title = b.title;
        this.content = b.content;
        this.severity = b.severity;
        this.category = b.category ?? '';
      });
    }
  }

  onSubmit() {
    if (this.isEdit) {
      this.bulletinService.update(this.bulletinId, {
        title: this.title, content: this.content,
        severity: this.severity, category: this.category || undefined
      }).subscribe(() => this.router.navigate(['/bulletins']));
    } else {
      this.bulletinService.create({
        title: this.title, content: this.content,
        severity: this.severity, category: this.category || undefined
      }).subscribe(() => this.router.navigate(['/bulletins']));
    }
  }
}
