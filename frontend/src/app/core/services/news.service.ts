import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env';
import { NewsSearchRequest, NewsSearchResult, NewsDetailDto, TrendResult, NewsArticleDto } from '../models';

@Injectable({ providedIn: 'root' })
export class NewsService {
  constructor(private http: HttpClient) {}

  search(request: NewsSearchRequest) {
    let params = new HttpParams();
    if (request.query) params = params.set('query', request.query);
    if (request.country) params = params.set('country', request.country);
    if (request.category) params = params.set('category', request.category);
    if (request.threatType) params = params.set('threatType', request.threatType);
    if (request.minThreatLevel != null) params = params.set('minThreatLevel', request.minThreatLevel);
    if (request.maxThreatLevel != null) params = params.set('maxThreatLevel', request.maxThreatLevel);
    if (request.from) params = params.set('from', request.from);
    if (request.to) params = params.set('to', request.to);
    if (request.sortBy) params = params.set('sortBy', request.sortBy);
    if (request.sortOrder) params = params.set('sortOrder', request.sortOrder);
    if (request.page) params = params.set('page', request.page);
    if (request.pageSize) params = params.set('pageSize', request.pageSize);
    return this.http.get<NewsSearchResult>(`${environment.apiUrl}/news`, { params });
  }

  getDetail(id: string) {
    return this.http.get<NewsDetailDto>(`${environment.apiUrl}/news/${id}`);
  }

  getTrends(period: string = '24h') {
    return this.http.get<TrendResult>(`${environment.apiUrl}/news/trends`, { params: { period } });
  }

  getImportant(count: number = 10) {
    return this.http.get<NewsArticleDto[]>(`${environment.apiUrl}/news/important`, { params: { count } });
  }
}
