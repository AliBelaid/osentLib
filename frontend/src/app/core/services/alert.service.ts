import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { AlertDto, AlertRuleDto, CreateAlertRuleRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private http: HttpClient) {}

  listRules() {
    return this.http.get<AlertRuleDto[]>(`${environment.apiUrl}/alert/rules`);
  }

  createRule(request: CreateAlertRuleRequest) {
    return this.http.post<AlertRuleDto>(`${environment.apiUrl}/alert/rules`, request);
  }

  toggleRule(id: number) {
    return this.http.put<AlertRuleDto>(`${environment.apiUrl}/alert/rules/${id}/toggle`, {});
  }

  deleteRule(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/alert/rules/${id}`);
  }

  listAlerts(activeOnly: boolean = false) {
    return this.http.get<AlertDto[]>(`${environment.apiUrl}/alert`, { params: { activeOnly } });
  }

  acknowledge(id: number) {
    return this.http.post<void>(`${environment.apiUrl}/alert/${id}/acknowledge`, {});
  }
}
