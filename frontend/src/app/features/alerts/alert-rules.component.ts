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
import { AlertService } from '../../core/services/alert.service';
import { AlertRuleDto } from '../../core/models';

@Component({
  selector: 'app-alert-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatTableModule, MatSlideToggleModule
  ],
  template: `
    <h2>Alert Rules</h2>

    <mat-card class="form-card">
      <mat-card-header><mat-card-title>New Rule</mat-card-title></mat-card-header>
      <mat-card-content>
        <form (ngSubmit)="createRule()">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="newRule.name" name="name" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="newRule.category" name="category">
                <mat-option value="">Any</mat-option>
                @for (c of categories; track c) {
                  <mat-option [value]="c">{{ c }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Threat Type</mat-label>
              <mat-select [(ngModel)]="newRule.threatType" name="threatType">
                <mat-option value="">Any</mat-option>
                @for (t of threatTypes; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Min Level</mat-label>
              <mat-select [(ngModel)]="newRule.minThreatLevel" name="minThreatLevel">
                @for (l of [0,1,2,3,4,5]; track l) {
                  <mat-option [value]="l">{{ l }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit">Add Rule</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <table mat-table [dataSource]="rules" class="rules-table">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let r">{{ r.name }}</td>
      </ng-container>
      <ng-container matColumnDef="category">
        <th mat-header-cell *matHeaderCellDef>Category</th>
        <td mat-cell *matCellDef="let r">{{ r.category ?? 'Any' }}</td>
      </ng-container>
      <ng-container matColumnDef="threatType">
        <th mat-header-cell *matHeaderCellDef>Threat Type</th>
        <td mat-cell *matCellDef="let r">{{ r.threatType ?? 'Any' }}</td>
      </ng-container>
      <ng-container matColumnDef="minLevel">
        <th mat-header-cell *matHeaderCellDef>Min Level</th>
        <td mat-cell *matCellDef="let r">{{ r.minThreatLevel }}</td>
      </ng-container>
      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef>Active</th>
        <td mat-cell *matCellDef="let r">
          <mat-slide-toggle [checked]="r.isActive" (change)="toggle(r)"></mat-slide-toggle>
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let r">
          <button mat-icon-button color="warn" (click)="deleteRule(r)">
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
    .rules-table { width: 100%; }
  `]
})
export class AlertRulesComponent implements OnInit {
  rules: AlertRuleDto[] = [];
  displayedColumns = ['name', 'category', 'threatType', 'minLevel', 'active', 'actions'];
  categories = ['Politics', 'Security', 'Health', 'Economy', 'Environment', 'Technology', 'Society'];
  threatTypes = ['terrorism', 'unrest', 'epidemic', 'flood', 'drought', 'famine', 'cyber'];

  newRule = { name: '', category: '', threatType: '', minThreatLevel: 3, keywords: '' };

  constructor(private alertService: AlertService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.alertService.listRules().subscribe(data => this.rules = data);
  }

  createRule() {
    this.alertService.createRule({
      name: this.newRule.name,
      category: this.newRule.category || undefined,
      threatType: this.newRule.threatType || undefined,
      minThreatLevel: this.newRule.minThreatLevel,
      keywords: this.newRule.keywords || undefined
    }).subscribe(() => {
      this.newRule = { name: '', category: '', threatType: '', minThreatLevel: 3, keywords: '' };
      this.load();
    });
  }

  toggle(rule: AlertRuleDto) {
    this.alertService.toggleRule(rule.id).subscribe(() => this.load());
  }

  deleteRule(rule: AlertRuleDto) {
    if (confirm(`Delete rule "${rule.name}"?`)) {
      this.alertService.deleteRule(rule.id).subscribe(() => this.load());
    }
  }
}
