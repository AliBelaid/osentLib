import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { SourceDto, CreateSourceRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SourceService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<SourceDto[]>(`${environment.apiUrl}/source`);
  }

  create(request: CreateSourceRequest) {
    return this.http.post<SourceDto>(`${environment.apiUrl}/source`, request);
  }

  toggle(id: number) {
    return this.http.put<SourceDto>(`${environment.apiUrl}/source/${id}/toggle`, {});
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/source/${id}`);
  }
}
