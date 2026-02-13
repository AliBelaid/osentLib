import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { CastVoteRequest, VoteDto, VoteStatsDto } from '../models';

@Injectable({ providedIn: 'root' })
export class VoteService {
  constructor(private http: HttpClient) {}

  castVote(request: CastVoteRequest) {
    return this.http.post<VoteDto>(`${environment.apiUrl}/votes`, request);
  }

  deleteVote(articleId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/votes/${articleId}`);
  }

  getStats(articleId: string) {
    return this.http.get<VoteStatsDto>(`${environment.apiUrl}/votes/${articleId}/stats`);
  }
}
