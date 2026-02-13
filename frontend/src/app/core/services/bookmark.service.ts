import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  BookmarkDto,
  BookmarkListResult,
  BookmarkCollectionDto,
  CreateBookmarkRequest,
  CreateCollectionRequest,
  UpdateCollectionRequest
} from '@core/models';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bookmark`;

  // Reactive state
  bookmarks = signal<BookmarkDto[]>([]);
  collections = signal<BookmarkCollectionDto[]>([]);

  addBookmark(articleId: string, collectionId?: number, notes?: string): Observable<BookmarkDto> {
    const request: CreateBookmarkRequest = { articleId, collectionId, notes };
    return this.http.post<BookmarkDto>(this.base, request).pipe(
      tap(bookmark => {
        this.bookmarks.update(list => [...list, bookmark]);
      })
    );
  }

  removeBookmark(bookmarkId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${bookmarkId}`).pipe(
      tap(() => {
        this.bookmarks.update(list => list.filter(b => b.id !== bookmarkId));
      })
    );
  }

  listBookmarks(collectionId?: number, page: number = 1, pageSize: number = 20): Observable<BookmarkListResult> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (collectionId) {
      params = params.set('collectionId', collectionId);
    }

    return this.http.get<BookmarkListResult>(this.base, { params }).pipe(
      tap(result => this.bookmarks.set(result.items))
    );
  }

  getCollections(): Observable<BookmarkCollectionDto[]> {
    return this.http.get<BookmarkCollectionDto[]>(`${this.base}/collections`).pipe(
      tap(collections => this.collections.set(collections))
    );
  }

  createCollection(name: string, description?: string, color: string = '#4CAF50'): Observable<BookmarkCollectionDto> {
    const request: CreateCollectionRequest = { name, description, color };
    return this.http.post<BookmarkCollectionDto>(`${this.base}/collections`, request).pipe(
      tap(collection => {
        this.collections.update(list => [...list, collection]);
      })
    );
  }

  updateCollection(id: number, request: UpdateCollectionRequest): Observable<BookmarkCollectionDto> {
    return this.http.put<BookmarkCollectionDto>(`${this.base}/collections/${id}`, request).pipe(
      tap(updated => {
        this.collections.update(list =>
          list.map(c => c.id === id ? updated : c)
        );
      })
    );
  }

  deleteCollection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/collections/${id}`).pipe(
      tap(() => {
        this.collections.update(list => list.filter(c => c.id !== id));
      })
    );
  }

  // Helper method to check if article is bookmarked
  isBookmarked(articleId: string): boolean {
    return this.bookmarks().some(b => b.articleId === articleId);
  }

  // Get bookmark for an article
  getBookmark(articleId: string): BookmarkDto | undefined {
    return this.bookmarks().find(b => b.articleId === articleId);
  }
}
