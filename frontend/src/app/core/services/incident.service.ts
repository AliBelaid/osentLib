import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env';
import { IncidentDto, IncidentListResult, IncidentStatsDto } from '../models';

export interface CreateIncidentRequest {
  title: string;
  description: string;
  severity: string;
  sector: string;
  incidentType: string;
  countryCode: string;
  source?: string;
  affectedSystems: string[];
  iocs: string[];
  attachment?: File;
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  sector?: string;
  incidentType?: string;
  source?: string;
  affectedSystems?: string[];
  iocs?: string[];
  containmentPercent?: number;
  assignedToUserId?: string;
  attachment?: File;
}

export interface IncidentFilter {
  status?: string;
  severity?: string;
  sector?: string;
  countryCode?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private base = `${environment.apiUrl}/incident`;

  constructor(private http: HttpClient) {}

  list(filter: IncidentFilter = {}) {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.severity) params = params.set('severity', filter.severity);
    if (filter.sector) params = params.set('sector', filter.sector);
    if (filter.countryCode) params = params.set('countryCode', filter.countryCode);
    if (filter.query) params = params.set('query', filter.query);
    if (filter.page) params = params.set('page', filter.page);
    if (filter.pageSize) params = params.set('pageSize', filter.pageSize);
    return this.http.get<IncidentListResult>(this.base, { params });
  }

  get(id: string) {
    return this.http.get<IncidentDto>(`${this.base}/${id}`);
  }

  getStats() {
    return this.http.get<IncidentStatsDto>(`${this.base}/stats`);
  }

  create(request: CreateIncidentRequest) {
    const fd = new FormData();
    fd.append('title', request.title);
    fd.append('description', request.description);
    fd.append('severity', request.severity);
    fd.append('sector', request.sector);
    fd.append('incidentType', request.incidentType);
    fd.append('countryCode', request.countryCode);
    if (request.source) fd.append('source', request.source);
    request.affectedSystems.forEach(s => fd.append('affectedSystems', s));
    request.iocs.forEach(ioc => fd.append('iocs', ioc));
    if (request.attachment) fd.append('attachment', request.attachment, request.attachment.name);
    return this.http.post<IncidentDto>(this.base, fd);
  }

  update(id: string, request: UpdateIncidentRequest) {
    const fd = new FormData();
    if (request.title) fd.append('title', request.title);
    if (request.description) fd.append('description', request.description);
    if (request.severity) fd.append('severity', request.severity);
    if (request.status) fd.append('status', request.status);
    if (request.sector) fd.append('sector', request.sector);
    if (request.incidentType) fd.append('incidentType', request.incidentType);
    if (request.source) fd.append('source', request.source);
    if (request.affectedSystems) request.affectedSystems.forEach(s => fd.append('affectedSystems', s));
    if (request.iocs) request.iocs.forEach(ioc => fd.append('iocs', ioc));
    if (request.containmentPercent !== undefined) fd.append('containmentPercent', String(request.containmentPercent));
    if (request.assignedToUserId) fd.append('assignedToUserId', request.assignedToUserId);
    if (request.attachment) fd.append('attachment', request.attachment, request.attachment.name);
    return this.http.put<IncidentDto>(`${this.base}/${id}`, fd);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
