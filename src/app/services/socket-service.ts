import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, shareReplay } from 'rxjs';
import { CoreService } from './core-service';

// Tipado de eventos server → client
export interface ServerToClientEvents {
  'ticket:new': (ticket: any) => void;
  'ticket:update': (ticket: any) => void;
}

// (Opcional) client → server si luego ocupas emitir
export interface ClientToServerEvents {
  // ejemplo:
  // 'ticket:join': (ticketId: string) => void;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private core = inject(CoreService);
  private platformId = inject(PLATFORM_ID);

  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private connected = false;
  private connecting = false; // ✅ evita doble conexión por carrera

  // Subjects internos (para no re-registrar listeners en cada subscribe)
  private ticketNew$ = new Subject<any>();
  private ticketUpdate$ = new Subject<any>();

  // ✅ Observables públicos hot + replay único
  private ticketNewObs$ = this.ticketNew$.asObservable()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private ticketUpdateObs$ = this.ticketUpdate$.asObservable()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // ✅ guard correcto: si ya hay socket (o se está conectando), no crear otro
    if (this.socket || this.connecting) return;

    this.connecting = true;

    const socketUrl = this.core.baseUrl.replace(/\/$/, '');

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.connecting = false;
      console.log('✅ Socket conectado', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      this.connecting = false; // ✅ libera carrera si falló
      console.warn('⚠️ Socket connect_error:', err?.message || err);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('⚠️ Socket desconectado:', reason);
      // nota: no nulificamos socket aquí; socket.io reconecta solo
    });

    // 🔥 Listeners únicos (solo una vez por socket)
    this.socket.on('ticket:new', (t) => this.ticketNew$.next(t));
    this.socket.on('ticket:update', (t) => this.ticketUpdate$.next(t));
  }

  disconnect(): void {
    if (!this.socket) return;

    this.socket.removeAllListeners(); // limpieza total
    this.socket.disconnect();

    this.socket = null;
    this.connected = false;
    this.connecting = false;
  }

  /** Streams públicos (ya no conectan aquí; App controla conexión) */
  onTicketNew(): Observable<any> {
    return this.ticketNewObs$;
  }

  onTicketUpdate(): Observable<any> {
    return this.ticketUpdateObs$;
  }

  /** emit genérico si luego lo necesitas */
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) {
    this.socket?.emit(event, ...args);
  }
}
