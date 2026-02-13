import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env';
import {
  DnsLookupDto,
  DnsLookupRequest,
  DomainWatchlistDto,
  CreateWatchlistEntryRequest,
  UpdateWatchlistEntryRequest
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class DnsService {
  private apiUrl = `${environment.apiUrl}/dns`;

  lookupHistory = signal<DnsLookupDto[]>([]);
  currentLookup = signal<DnsLookupDto | null>(null);
  watchlist = signal<DomainWatchlistDto[]>([]);

  constructor(private http: HttpClient) {}

  performLookup(domain: string): Observable<any> {
    const request: DnsLookupRequest = { domain };
    return this.http.post<any>(`${this.apiUrl}/lookup`, request).pipe(
      tap(result => {
        if (result.lookupId) {
          this.getLookupHistory().subscribe();
        }
      })
    );
  }

  getLookupHistory(page: number = 1, pageSize: number = 20): Observable<DnsLookupDto[]> {
    return this.http.get<DnsLookupDto[]>(`${this.apiUrl}/history`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    }).pipe(
      tap(lookups => this.lookupHistory.set(lookups))
    );
  }

  getLookupById(id: number): Observable<DnsLookupDto> {
    return this.http.get<DnsLookupDto>(`${this.apiUrl}/history/${id}`).pipe(
      tap(lookup => this.currentLookup.set(lookup))
    );
  }

  extractDomains(text: string): Observable<{ domains: string[], count: number }> {
    return this.http.post<{ domains: string[], count: number }>(`${this.apiUrl}/extract-domains`, { text });
  }

  // Watchlist Methods
  getWatchlist(status?: string, countryCode?: string): Observable<DomainWatchlistDto[]> {
    const params: any = {};
    if (status) params.status = status;
    if (countryCode) params.countryCode = countryCode;

    return this.http.get<DomainWatchlistDto[]>(`${this.apiUrl}/watchlist`, { params }).pipe(
      tap(watchlist => this.watchlist.set(watchlist))
    );
  }

  getWatchlistEntry(id: number): Observable<DomainWatchlistDto> {
    return this.http.get<DomainWatchlistDto>(`${this.apiUrl}/watchlist/${id}`);
  }

  addToWatchlist(request: CreateWatchlistEntryRequest): Observable<DomainWatchlistDto> {
    return this.http.post<DomainWatchlistDto>(`${this.apiUrl}/watchlist`, request).pipe(
      tap(entry => {
        this.watchlist.update(list => [entry, ...list]);
      })
    );
  }

  updateWatchlist(id: number, request: UpdateWatchlistEntryRequest): Observable<DomainWatchlistDto> {
    return this.http.put<DomainWatchlistDto>(`${this.apiUrl}/watchlist/${id}`, request).pipe(
      tap(entry => {
        this.watchlist.update(list => {
          const index = list.findIndex(w => w.id === id);
          if (index !== -1) {
            list[index] = entry;
            return [...list];
          }
          return list;
        });
      })
    );
  }

  deleteWatchlist(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/watchlist/${id}`).pipe(
      tap(() => {
        this.watchlist.update(list => list.filter(w => w.id !== id));
      })
    );
  }

  checkDomain(domain: string): Observable<{ domain: string, isBlocked: boolean, inWatchlist: boolean, watchlistEntry: DomainWatchlistDto | null }> {
    return this.http.get<any>(`${this.apiUrl}/watchlist/check/${domain}`);
  }

  getRiskLevelColor(riskLevel: number): string {
    if (riskLevel >= 4) return 'warn';
    if (riskLevel >= 3) return 'accent';
    return 'primary';
  }

  getRiskLevelLabel(riskLevel: number): string {
    switch (riskLevel) {
      case 1: return 'Low';
      case 2: return 'Moderate';
      case 3: return 'Elevated';
      case 4: return 'High';
      case 5: return 'Critical';
      default: return 'Unknown';
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'blocked': return 'warn';
      case 'trusted': return 'primary';
      case 'monitor': return 'accent';
      default: return '';
    }
  }

  getRiskScoreColor(score: number): string {
    if (score >= 70) return '#f44336'; // Red
    if (score >= 40) return '#ff9800'; // Orange
    if (score >= 20) return '#ffc107'; // Yellow
    return '#4caf50'; // Green
  }
}
