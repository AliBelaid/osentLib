import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env';
import {
  IntelReportDto, IntelReportListResult, IntelReportAttachmentDto,
  IntelTimelineEntryDto, IntelTimelineAttachmentDto, IntelReportLinkDto,
  CreateIntelReportRequest, UpdateIntelReportRequest,
  CreateTimelineEntryRequest, CreateIntelReportLinkRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class IntelReportService {
  private base = `${environment.apiUrl}/intelreport`;

  constructor(private http: HttpClient) {}

  list(params: { page?: number; pageSize?: number; status?: string; type?: string } = {}) {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.type) httpParams = httpParams.set('type', params.type);
    return this.http.get<IntelReportListResult>(this.base, { params: httpParams });
  }

  listMy(page = 1, pageSize = 20) {
    return this.http.get<IntelReportListResult>(`${this.base}/my`, {
      params: new HttpParams().set('page', page).set('pageSize', pageSize)
    });
  }

  get(id: string) {
    return this.http.get<IntelReportDto>(`${this.base}/${id}`);
  }

  create(request: CreateIntelReportRequest) {
    return this.http.post<IntelReportDto>(this.base, request);
  }

  update(id: string, request: UpdateIntelReportRequest) {
    return this.http.put<IntelReportDto>(`${this.base}/${id}`, request);
  }

  updateStatus(id: string, status: string) {
    return this.http.put<IntelReportDto>(`${this.base}/${id}/status`, { status });
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Attachments
  uploadAttachment(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<IntelReportAttachmentDto>(`${this.base}/${id}/attachments`, formData);
  }

  deleteAttachment(id: string, attachmentId: number) {
    return this.http.delete<void>(`${this.base}/${id}/attachments/${attachmentId}`);
  }

  downloadAttachmentUrl(id: string, attachmentId: number) {
    return `${this.base}/${id}/attachments/${attachmentId}/download`;
  }

  // Timeline
  getTimeline(id: string) {
    return this.http.get<IntelTimelineEntryDto[]>(`${this.base}/${id}/timeline`);
  }

  addTimelineEntry(id: string, request: CreateTimelineEntryRequest) {
    return this.http.post<IntelTimelineEntryDto>(`${this.base}/${id}/timeline`, request);
  }

  uploadTimelineAttachment(id: string, entryId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<IntelTimelineAttachmentDto>(
      `${this.base}/${id}/timeline/${entryId}/attachments`, formData
    );
  }

  // Links
  getLinks(id: string) {
    return this.http.get<IntelReportLinkDto[]>(`${this.base}/${id}/links`);
  }

  createLink(id: string, request: CreateIntelReportLinkRequest) {
    return this.http.post<IntelReportLinkDto>(`${this.base}/${id}/links`, request);
  }

  deleteLink(id: string, linkId: number) {
    return this.http.delete<void>(`${this.base}/${id}/links/${linkId}`);
  }
}
