import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '@env';
import { LoginRequest, LoginResponse, UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ausentinel_token';
  private readonly USER_KEY = 'ausentinel_user';

  private _user = signal<UserProfile | null>(this.loadUser());
  user = this._user.asReadonly();
  isLoggedIn = computed(() => !!this._user());

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this._user.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return this._user()?.roles?.includes(role) ?? false;
  }

  isAUAdmin(): boolean {
    return this.hasRole('AUAdmin');
  }

  private loadUser(): UserProfile | null {
    const json = localStorage.getItem(this.USER_KEY);
    return json ? JSON.parse(json) : null;
  }
}
