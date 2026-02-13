import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  SavedSearchDto,
  CreateSavedSearchRequest,
  UpdateSavedSearchRequest,
  ParseQueryRequest,
  ParseQueryResponse
} from '@core/models';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class SavedSearchService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/search`;

  // Reactive state
  savedSearches = signal<SavedSearchDto[]>([]);

  /**
   * List saved searches
   */
  listSavedSearches(includePublic: boolean = false): Observable<SavedSearchDto[]> {
    const params = new HttpParams().set('includePublic', includePublic);
    return this.http.get<SavedSearchDto[]>(`${this.base}/saved`, { params }).pipe(
      tap(searches => this.savedSearches.set(searches))
    );
  }

  /**
   * Get specific saved search
   */
  getSavedSearch(id: number): Observable<SavedSearchDto> {
    return this.http.get<SavedSearchDto>(`${this.base}/saved/${id}`);
  }

  /**
   * Create new saved search
   */
  createSavedSearch(request: CreateSavedSearchRequest): Observable<SavedSearchDto> {
    return this.http.post<SavedSearchDto>(`${this.base}/saved`, request).pipe(
      tap(search => {
        this.savedSearches.update(searches => [search, ...searches]);
      })
    );
  }

  /**
   * Update saved search
   */
  updateSavedSearch(id: number, request: UpdateSavedSearchRequest): Observable<SavedSearchDto> {
    return this.http.put<SavedSearchDto>(`${this.base}/saved/${id}`, request).pipe(
      tap(updated => {
        this.savedSearches.update(searches =>
          searches.map(s => s.id === id ? updated : s)
        );
      })
    );
  }

  /**
   * Delete saved search
   */
  deleteSavedSearch(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/saved/${id}`).pipe(
      tap(() => {
        this.savedSearches.update(searches => searches.filter(s => s.id !== id));
      })
    );
  }

  /**
   * Execute saved search (increments counter)
   */
  executeSavedSearch(id: number): Observable<SavedSearchDto> {
    return this.http.post<SavedSearchDto>(`${this.base}/saved/${id}/execute`, {}).pipe(
      tap(updated => {
        this.savedSearches.update(searches =>
          searches.map(s => s.id === id ? updated : s)
        );
      })
    );
  }

  /**
   * Parse and validate query
   */
  parseQuery(query: string): Observable<ParseQueryResponse> {
    return this.http.post<ParseQueryResponse>(`${this.base}/parse`, { query } as ParseQueryRequest);
  }
}
