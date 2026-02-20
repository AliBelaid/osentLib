import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '@core/services/user.service';
import { UserDto, CountryDto, CreateUserRequest, UpdateUserRequest } from '@core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatPaginatorModule, MatChipsModule, MatSnackBarModule
  ],
  template: `
    <div class="page-header">
      <h2>User Management</h2>
      <button mat-raised-button color="primary" (click)="showCreateDialog()">
        <mat-icon>person_add</mat-icon> New User
      </button>
    </div>

    <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
      <mat-label>Search users</mat-label>
      <input matInput [(ngModel)]="search" (keyup.enter)="loadUsers()" placeholder="Search by name, username, or email">
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    <table mat-table [dataSource]="users" style="width: 100%;">
      <ng-container matColumnDef="username">
        <th mat-header-cell *matHeaderCellDef>Username</th>
        <td mat-cell *matCellDef="let u">{{ u.username }}</td>
      </ng-container>

      <ng-container matColumnDef="fullName">
        <th mat-header-cell *matHeaderCellDef>Full Name</th>
        <td mat-cell *matCellDef="let u">{{ u.fullName }}</td>
      </ng-container>

      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let u">{{ u.email }}</td>
      </ng-container>

      <ng-container matColumnDef="country">
        <th mat-header-cell *matHeaderCellDef>Country</th>
        <td mat-cell *matCellDef="let u">{{ u.countryName }}</td>
      </ng-container>

      <ng-container matColumnDef="roles">
        <th mat-header-cell *matHeaderCellDef>Roles</th>
        <td mat-cell *matCellDef="let u">
          <mat-chip-set>
            @for (role of u.roles; track role) {
              <mat-chip>{{ role }}</mat-chip>
            }
          </mat-chip-set>
        </td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let u">
          <span [class]="u.isActive ? 'status-active' : 'status-inactive'">
            {{ u.isActive ? 'Active' : 'Inactive' }}
          </span>
        </td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let u">
          <button mat-icon-button (click)="showEditDialog(u)" matTooltip="Edit">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button (click)="showResetPasswordDialog(u)" matTooltip="Reset Password">
            <mat-icon>lock_reset</mat-icon>
          </button>
          <button mat-icon-button color="warn" (click)="deleteUser(u)" matTooltip="Delete">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <mat-paginator
      [length]="total"
      [pageSize]="pageSize"
      [pageIndex]="page - 1"
      [pageSizeOptions]="[10, 25, 50]"
      (page)="onPage($event)">
    </mat-paginator>

    <!-- Create/Edit Dialog (inline overlay) -->
    @if (showForm) {
      <div class="dialog-overlay" (click)="showForm = false">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h3>{{ editingUser ? 'Edit User' : 'Create User' }}</h3>

          @if (!editingUser) {
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Username</mat-label>
              <input matInput [(ngModel)]="form.username">
            </mat-form-field>

            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="form.password">
            </mat-form-field>
          }

          <mat-form-field appearance="outline" style="width: 100%;">
            <mat-label>Full Name</mat-label>
            <input matInput [(ngModel)]="form.fullName">
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 100%;">
            <mat-label>Email</mat-label>
            <input matInput type="email" [(ngModel)]="form.email">
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 100%;">
            <mat-label>Country</mat-label>
            <mat-select [(ngModel)]="form.countryCode">
              @for (c of countries; track c.code) {
                <mat-option [value]="c.code">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 100%;">
            <mat-label>Preferred Language</mat-label>
            <mat-select [(ngModel)]="form.preferredLanguage">
              <mat-option value="en">English</mat-option>
              <mat-option value="fr">French</mat-option>
              <mat-option value="ar">Arabic</mat-option>
              <mat-option value="pt">Portuguese</mat-option>
              <mat-option value="sw">Swahili</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 100%;">
            <mat-label>Roles</mat-label>
            <mat-select [(ngModel)]="form.roles" multiple>
              <mat-option value="Viewer">Viewer</mat-option>
              <mat-option value="DataEntry">DataEntry</mat-option>
              <mat-option value="Editor">Editor</mat-option>
              <mat-option value="CountryAdmin">CountryAdmin</mat-option>
              <mat-option value="AUAdmin">AUAdmin</mat-option>
            </mat-select>
          </mat-form-field>

          @if (editingUser) {
            <mat-checkbox [(ngModel)]="form.isActive">Active</mat-checkbox>
          }

          <div class="dialog-actions">
            <button mat-button (click)="showForm = false">Cancel</button>
            <button mat-raised-button color="primary" (click)="saveUser()">
              {{ editingUser ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Reset Password Dialog -->
    @if (showResetForm) {
      <div class="dialog-overlay" (click)="showResetForm = false">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h3>Reset Password for {{ resetTarget?.username }}</h3>
          <mat-form-field appearance="outline" style="width: 100%;">
            <mat-label>New Password</mat-label>
            <input matInput type="password" [(ngModel)]="newPassword">
          </mat-form-field>
          <div class="dialog-actions">
            <button mat-button (click)="showResetForm = false">Cancel</button>
            <button mat-raised-button color="primary" (click)="resetPassword()">Reset</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .status-active { color: #4caf50; font-weight: 500; }
    .status-inactive { color: #f44336; font-weight: 500; }
    .dialog-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000;
    }
    .dialog-content {
      background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-default);
      padding: 24px; border-radius: 8px;
      width: 480px; max-height: 80vh; overflow-y: auto;
    }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `]
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  users: UserDto[] = [];
  countries: CountryDto[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  search = '';

  displayedColumns = ['username', 'fullName', 'email', 'country', 'roles', 'status', 'actions'];

  showForm = false;
  editingUser: UserDto | null = null;
  form: any = {};

  showResetForm = false;
  resetTarget: UserDto | null = null;
  newPassword = '';

  ngOnInit() {
    this.loadUsers();
    this.userService.listCountries().subscribe(c => this.countries = c);
  }

  loadUsers() {
    this.userService.list({ page: this.page, pageSize: this.pageSize, search: this.search || undefined })
      .subscribe(result => {
        this.users = result.items;
        this.total = result.total;
      });
  }

  onPage(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  showCreateDialog() {
    this.editingUser = null;
    this.form = {
      username: '', email: '', password: '', fullName: '',
      countryCode: '', preferredLanguage: 'en', roles: ['Viewer']
    };
    this.showForm = true;
  }

  showEditDialog(user: UserDto) {
    this.editingUser = user;
    this.form = {
      email: user.email,
      fullName: user.fullName,
      countryCode: user.countryCode,
      preferredLanguage: user.preferredLanguage,
      roles: [...user.roles],
      isActive: user.isActive
    };
    this.showForm = true;
  }

  saveUser() {
    if (this.editingUser) {
      const req: UpdateUserRequest = {
        email: this.form.email,
        fullName: this.form.fullName,
        countryCode: this.form.countryCode,
        preferredLanguage: this.form.preferredLanguage,
        roles: this.form.roles,
        isActive: this.form.isActive
      };
      this.userService.update(this.editingUser.id, req).subscribe({
        next: () => {
          this.snackBar.open('User updated', 'OK', { duration: 3000 });
          this.showForm = false;
          this.loadUsers();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error updating user', 'OK', { duration: 5000 })
      });
    } else {
      const req: CreateUserRequest = {
        username: this.form.username,
        email: this.form.email,
        password: this.form.password,
        fullName: this.form.fullName,
        countryCode: this.form.countryCode,
        preferredLanguage: this.form.preferredLanguage,
        roles: this.form.roles
      };
      this.userService.create(req).subscribe({
        next: () => {
          this.snackBar.open('User created', 'OK', { duration: 3000 });
          this.showForm = false;
          this.loadUsers();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Error creating user', 'OK', { duration: 5000 })
      });
    }
  }

  showResetPasswordDialog(user: UserDto) {
    this.resetTarget = user;
    this.newPassword = '';
    this.showResetForm = true;
  }

  resetPassword() {
    if (!this.resetTarget) return;
    this.userService.resetPassword(this.resetTarget.id, this.newPassword).subscribe({
      next: () => {
        this.snackBar.open('Password reset successfully', 'OK', { duration: 3000 });
        this.showResetForm = false;
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error resetting password', 'OK', { duration: 5000 })
    });
  }

  deleteUser(user: UserDto) {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.snackBar.open('User deleted', 'OK', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error deleting user', 'OK', { duration: 5000 })
    });
  }
}
