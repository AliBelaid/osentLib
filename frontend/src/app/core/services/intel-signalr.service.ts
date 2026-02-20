import { Injectable, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

export interface IntelChangeEvent {
  type: 'IntelReportCreated' | 'IntelReportUpdated' | 'IntelReportDeleted';
  reportId: string;
}

@Injectable({ providedIn: 'root' })
export class IntelSignalRService implements OnDestroy {
  private connection?: HubConnection;
  private readonly _changes = new Subject<IntelChangeEvent>();

  /** Subscribe to create/update/delete events. No event fires on interim state changes. */
  changes$ = this._changes.asObservable();

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
