import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { CountryStatsDto, ThreatActivityDto, TimelineBucketDto, DashboardSummaryDto } from '../models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly baseUrl = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  getCountryStats(region?: string): Observable<CountryStatsDto[]> {
    let params = new HttpParams();
    if (region) params = params.set('region', region);
    return this.http.get<CountryStatsDto[]>(`${this.baseUrl}/countries`, { params });
  }

  getThreatFeed(limit: number = 50): Observable<ThreatActivityDto[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ThreatActivityDto[]>(`${this.baseUrl}/threats`, { params });
  }

  getTimeline(from?: string, to?: string, granularity: string = 'day'): Observable<TimelineBucketDto[]> {
    let params = new HttpParams().set('granularity', granularity);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<TimelineBucketDto[]>(`${this.baseUrl}/timeline`, { params });
  }

  getDashboardSummary(category?: string, region?: string, period?: string): Observable<DashboardSummaryDto> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (region) params = params.set('region', region);
    if (period) params = params.set('period', period);
    return this.http.get<DashboardSummaryDto>(`${this.baseUrl}/summary`, { params });
  }
}
