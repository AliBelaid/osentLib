import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  KeywordListDto,
  CreateKeywordListRequest,
  UpdateKeywordListRequest
} from '@core/models';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class KeywordListService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/search`;

  // Reactive state
  keywordLists = signal<KeywordListDto[]>([]);

  /**
   * List keyword lists
   */
  listKeywordLists(includePublic: boolean = false): Observable<KeywordListDto[]> {
    const params = new HttpParams().set('includePublic', includePublic);
    return this.http.get<KeywordListDto[]>(`${this.base}/keywords`, { params }).pipe(
      tap(lists => this.keywordLists.set(lists))
    );
  }

  /**
   * Get specific keyword list
   */
  getKeywordList(id: number): Observable<KeywordListDto> {
    return this.http.get<KeywordListDto>(`${this.base}/keywords/${id}`);
  }

  /**
   * Create new keyword list
   */
  createKeywordList(request: CreateKeywordListRequest): Observable<KeywordListDto> {
    return this.http.post<KeywordListDto>(`${this.base}/keywords`, request).pipe(
      tap(list => {
        this.keywordLists.update(lists => [list, ...lists]);
      })
    );
  }

  /**
   * Update keyword list
   */
  updateKeywordList(id: number, request: UpdateKeywordListRequest): Observable<KeywordListDto> {
    return this.http.put<KeywordListDto>(`${this.base}/keywords/${id}`, request).pipe(
      tap(updated => {
        this.keywordLists.update(lists =>
          lists.map(l => l.id === id ? updated : l)
        );
      })
    );
  }

  /**
   * Delete keyword list
   */
  deleteKeywordList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/keywords/${id}`).pipe(
      tap(() => {
        this.keywordLists.update(lists => lists.filter(l => l.id !== id));
      })
    );
  }

  /**
   * Increment usage count
   */
  useKeywordList(id: number): Observable<KeywordListDto> {
    return this.http.post<KeywordListDto>(`${this.base}/keywords/${id}/use`, {}).pipe(
      tap(updated => {
        this.keywordLists.update(lists =>
          lists.map(l => l.id === id ? updated : l)
        );
      })
    );
  }
}
