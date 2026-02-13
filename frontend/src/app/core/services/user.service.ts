import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserDto, UserListResult, CreateUserRequest, UpdateUserRequest, CountryDto, UserProfileDto, UpdateUserProfileRequest } from '@core/models';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/user`;

  list(params: { page?: number; pageSize?: number; search?: string }): Observable<UserListResult> {
    let hp = new HttpParams();
    if (params.page) hp = hp.set('page', params.page);
    if (params.pageSize) hp = hp.set('pageSize', params.pageSize);
    if (params.search) hp = hp.set('search', params.search);
    return this.http.get<UserListResult>(this.base, { params: hp });
  }

  get(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/${id}`);
  }

  create(request: CreateUserRequest): Observable<UserDto> {
    return this.http.post<UserDto>(this.base, request);
  }

  update(id: string, request: UpdateUserRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  resetPassword(id: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reset-password`, { newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/change-password`, { currentPassword, newPassword });
  }

  listCountries(): Observable<CountryDto[]> {
    return this.http.get<CountryDto[]>(`${this.base}/countries`);
  }

  getProfile(userId: string): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.base}/${userId}/profile`);
  }

  updateProfile(userId: string, request: UpdateUserProfileRequest): Observable<UserProfileDto> {
    return this.http.put<UserProfileDto>(`${this.base}/${userId}/profile`, request);
  }

  uploadAvatar(userId: string, file: File): Observable<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ avatarUrl: string }>(`${this.base}/${userId}/avatar`, formData);
  }
}
