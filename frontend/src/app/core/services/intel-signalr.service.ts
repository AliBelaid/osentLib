import { Injectable, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

export interface IntelChangeEvent {
  type: 'IntelReportCreated' | 'IntelReportUpdated' | 'IntelReportDeleted';
  reportId: string;
}

export interface ReportSubmittedEvent {
  reportId: string;
  title: string;
  country: string;
  urgency: number;
  reportType: string;
  submittedBy: string;
}

export interface IncidentEvent {
  type: 'IncidentCreated' | 'IncidentUpdated';
  incidentId: string;
  title: string;
  severity?: string;
  sector?: string;
  countryCode?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class IntelSignalRService implements OnDestroy {
  private connection?: HubConnection;
  private readonly _changes = new Subject<IntelChangeEvent>();
  private readonly _reportSubmitted = new Subject<ReportSubmittedEvent>();
  private readonly _incidentEvents = new Subject<IncidentEvent>();

  /** Subscribe to intel create/update/delete events */
  changes$ = this._changes.asObservable();

  /** Subscribe to report submission notifications (all users) */
  reportSubmitted$ = this._reportSubmitted.asObservable();

  /** Subscribe to incident create/update events */
  incidentEvents$ = this._incidentEvents.asObservable();

  constructor(private auth: AuthService) {}

  connect(): void {
    if (this.connection?.state === HubConnectionState.Connected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl('/hubs/intel', {
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    const events: IntelChangeEvent['type'][] = [
      'IntelReportCreated',
      'IntelReportUpdated',
      'IntelReportDeleted'
    ];

    events.forEach(evt => {
      this.connection!.on(evt, (payload: { reportId: string }) => {
        this._changes.next({ type: evt, reportId: payload.reportId });
      });
    });

    this.connection!.on('ReportSubmitted', (payload: ReportSubmittedEvent) => {
      this._reportSubmitted.next(payload);
    });

    this.connection!.on('IncidentCreated', (payload: any) => {
      this._incidentEvents.next({ type: 'IncidentCreated', ...payload });
    });

    this.connection!.on('IncidentUpdated', (payload: any) => {
      this._incidentEvents.next({ type: 'IncidentUpdated', ...payload });
    });

    this.connection.start().catch(err => console.warn('[IntelSignalR] connect failed:', err));
  }

  disconnect(): void {
    this.connection?.stop();
    this.connection = undefined;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
