import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import {
  ExternalSearchRequest,
  MultiProviderSearchRequest,
  ExternalSearchResult,
  ExternalSearchQueryDto,
  ProviderInfo,
  ExternalSearchFilters
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class ExternalSearchService {
  private apiUrl = `${environment.apiUrl}/external-search`;

  providers = signal<ProviderInfo[]>([]);
  searchHistory = signal<ExternalSearchQueryDto[]>([]);
  currentResults = signal<ExternalSearchResult[]>([]);

  constructor(private http: HttpClient) {
    this.loadProviders();
  }

  search(provider: string, query: string, filters?: ExternalSearchFilters): Observable<ExternalSearchResult> {
    const request: ExternalSearchRequest = {
      provider,
      query,
      filters
    };

    return this.http.post<ExternalSearchResult>(`${this.apiUrl}/search`, request).pipe(
      tap(result => {
        this.currentResults.update(results => [result, ...results]);
        this.loadHistory();
      })
    );
  }

  searchMultiple(providers: string[], query: string, filters?: ExternalSearchFilters): Observable<any> {
    const request: MultiProviderSearchRequest = {
      providers,
      query,
      filters
    };

    return this.http.post<any>(`${this.apiUrl}/search/multi`, request).pipe(
      tap(response => {
        this.currentResults.set(response.results);
        this.loadHistory();
      })
    );
  }

  loadProviders(): void {
    this.http.get<ProviderInfo[]>(`${this.apiUrl}/providers`).subscribe({
      next: (providers) => this.providers.set(providers),
      error: (error) => console.error('Failed to load providers', error)
    });
  }

  loadHistory(page: number = 1, pageSize: number = 20): void {
    this.http.get<ExternalSearchQueryDto[]>(`${this.apiUrl}/history`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    }).subscribe({
      next: (history) => this.searchHistory.set(history),
      error: (error) => console.error('Failed to load history', error)
    });
  }

  getSearchById(id: number): Observable<ExternalSearchQueryDto> {
    return this.http.get<ExternalSearchQueryDto>(`${this.apiUrl}/history/${id}`);
  }

  getProviderIcon(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'twitter': return 'tag'; // X/Twitter
      case 'reddit': return 'reddit';
      case 'newsapi': return 'newspaper';
      default: return 'search';
    }
  }

  getProviderColor(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'twitter': return '#1DA1F2';
      case 'reddit': return '#FF4500';
      case 'newsapi': return '#4CAF50';
      default: return '#666666';
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'primary';
      case 'processing': return 'accent';
      case 'failed': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'check_circle';
      case 'processing': return 'sync';
      case 'failed': return 'error';
      case 'pending': return 'schedule';
      default: return 'help';
    }
  }

  formatEngagementCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }
}
