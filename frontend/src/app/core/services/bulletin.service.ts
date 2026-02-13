import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { BulletinDto, CreateBulletinRequest, UpdateBulletinRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class BulletinService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<BulletinDto[]>(`${environment.apiUrl}/bulletin`);
  }

  get(id: string) {
    return this.http.get<BulletinDto>(`${environment.apiUrl}/bulletin/${id}`);
  }

  create(request: CreateBulletinRequest) {
    return this.http.post<BulletinDto>(`${environment.apiUrl}/bulletin`, request);
  }

  update(id: string, request: UpdateBulletinRequest) {
    return this.http.put<BulletinDto>(`${environment.apiUrl}/bulletin/${id}`, request);
  }

  submitForReview(id: string) {
    return this.http.post<BulletinDto>(`${environment.apiUrl}/bulletin/${id}/submit`, {});
  }

  publish(id: string) {
    return this.http.post<BulletinDto>(`${environment.apiUrl}/bulletin/${id}/publish`, {});
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/bulletin/${id}`);
  }
}
