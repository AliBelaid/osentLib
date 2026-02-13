import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env';
import { ImportJobDto } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  private apiUrl = `${environment.apiUrl}/import`;

  importJobs = signal<ImportJobDto[]>([]);
  currentJob = signal<ImportJobDto | null>(null);

  constructor(private http: HttpClient) {}

  importArticles(file: File): Observable<ImportJobDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportJobDto>(`${this.apiUrl}/articles`, formData).pipe(
      tap(job => {
        this.importJobs.update(jobs => [job, ...jobs]);
        this.currentJob.set(job);
      })
    );
  }

  importUsers(file: File): Observable<ImportJobDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportJobDto>(`${this.apiUrl}/users`, formData).pipe(
      tap(job => {
        this.importJobs.update(jobs => [job, ...jobs]);
        this.currentJob.set(job);
      })
    );
  }

  importSources(file: File): Observable<ImportJobDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportJobDto>(`${this.apiUrl}/sources`, formData).pipe(
      tap(job => {
        this.importJobs.update(jobs => [job, ...jobs]);
        this.currentJob.set(job);
      })
    );
  }

  importKeywordLists(file: File): Observable<ImportJobDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportJobDto>(`${this.apiUrl}/keywords`, formData).pipe(
      tap(job => {
        this.importJobs.update(jobs => [job, ...jobs]);
        this.currentJob.set(job);
      })
    );
  }

  getImportJob(jobId: number): Observable<ImportJobDto> {
    return this.http.get<ImportJobDto>(`${this.apiUrl}/jobs/${jobId}`).pipe(
      tap(job => {
        this.currentJob.set(job);
        this.importJobs.update(jobs => {
          const index = jobs.findIndex(j => j.id === jobId);
          if (index !== -1) {
            jobs[index] = job;
            return [...jobs];
          }
          return [job, ...jobs];
        });
      })
    );
  }

  getMyImportJobs(page: number = 1, pageSize: number = 20): Observable<ImportJobDto[]> {
    return this.http.get<ImportJobDto[]>(`${this.apiUrl}/jobs`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    }).pipe(
      tap(jobs => this.importJobs.set(jobs))
    );
  }

  downloadTemplate(type: 'articles' | 'users' | 'sources' | 'keywords'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template/${type}`, {
      responseType: 'blob'
    });
  }

  downloadTemplateToFile(type: 'articles' | 'users' | 'sources' | 'keywords'): void {
    this.downloadTemplate(type).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_template.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'primary';
      case 'processing':
        return 'accent';
      case 'failed':
        return 'warn';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'check_circle';
      case 'processing':
        return 'sync';
      case 'failed':
        return 'error';
      case 'pending':
        return 'schedule';
      default:
        return 'help';
    }
  }
}
