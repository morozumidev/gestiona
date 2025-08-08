import { Injectable, Signal, signal } from '@angular/core';
import { Ticket } from '../models/Ticket';
import { HttpClient } from '@angular/common/http';
import { CoreService } from './core-service';
import { Luminaria } from '../models/Luminaria';
import { Tema } from '../models/Tema';
import { Area } from '../models/Area';
import { TicketStatus } from '../models/TicketStatus';
import { Cuadrilla } from '../models/Cuadrilla';
import { Observable } from 'rxjs/internal/Observable';
import { User } from '../models/User';
import { TicketTracking } from '../models/TicketTracking';

@Injectable({
  providedIn: 'root'
})
export class TicketsService {



  constructor(private readonly http: HttpClient, private readonly coreService: CoreService) { }

  tickets: Ticket[] = [];
  ticketSignal = signal<Ticket | null>(null);
  reverseGeocode(lat: number, lng: number) {
    return this.http.post<{ address: string }>(
      this.coreService.URI_API + 'maps/reverse-geocode',
      { lat, lng }
    );
  }


  setTicket(ticket: Ticket): void {
    this.ticketSignal.set(ticket);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ticket:current', JSON.stringify(ticket));
    }
  }

  getTicket(): Signal<Ticket | null> {
    return this.ticketSignal.asReadonly();
  }
  addComment(ticketId: string, comment: TicketTracking) {
    return this.http.post<Ticket>(`${this.coreService.URI_API}tickets/comments`, { comment: comment, id: ticketId });
  }
  restoreTicketFromSession(): void {
    if (typeof window !== 'undefined') {
      const origin = sessionStorage.getItem('ticket:origin');
      if (origin !== 'active') return; // ❌ no restaurar si ya saliste del componente

      const raw = sessionStorage.getItem('ticket:current');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          this.ticketSignal.set(parsed);
        } catch {
          sessionStorage.removeItem('ticket:current');
          this.ticketSignal.set(null);
        }
      }
    }
  }



  clearTicket(): void {
    this.ticketSignal.set(null);
    try {
      sessionStorage.removeItem('ticket:current');
      sessionStorage.removeItem('ticket:origin');
    } catch (err) {
      console.warn('⚠️ Error eliminando ticket de sessionStorage:', err);
    }
  }



  getTicketById(id: string): Observable<Ticket> {
 
    return this.http.post<Ticket>(this.coreService.URI_API + 'tickets/getTicketById', { id });
  }

  getAllTickets(
    filters: { field: string; value: any }[] = [],
    page = 1,
    pageSize = 20,
    search = '',
    sort: any = { createdAt: -1 }
  ) {
    return this.http.post<{
      data: Ticket[];
      total: number;
      page: number;
      pageSize: number;
      statusCounts: Record<string, number>; // ✅ nuevo campo
      semaforoCounts: Record<string, number>; // ✅ nuevo campo
    }>(`${this.coreService.URI_API}tickets/getAllTickets`, {
      filters,
      page,
      pageSize,
      search,
      sort
    });
  }



  manageTicket(formData: FormData) {
    return this.http.post(this.coreService.URI_API + 'tickets/manageTicket', formData);
  }



  getTemas() {
    return this.http.post<Tema[]>(this.coreService.URI_API + 'tickets/getTemas', {});
  }
  deleteTicket(id: string) {
    return this.http.delete<{ message: string }>(`${this.coreService.URI_API}tickets/deleteTicket/${id}`);
  }
  getSources() {
    return this.http.post<Area[]>(this.coreService.URI_API + 'tickets/getSources', {});
  }
  getAreas() {
    return this.http.post<Area[]>(this.coreService.URI_API + 'tickets/getAreas', {});
  }

  getLuminarias() {
    return this.http.post<Luminaria[]>(this.coreService.URI_API + 'tickets/getLuminarias', {});
  }


  getStatuses() {
    return this.http.post<{ _id: string; name: string }[]>('/api/catalogs/statuses', {});
  }

  getTicketStatuses() {
    return this.http.post<TicketStatus[]>(this.coreService.URI_API + 'tickets/getTicketStatuses', {});
  }

  getUserById(_id: string): Observable<User> {
    return this.http.post<User>(this.coreService.URI_API + 'users/getUserById', { _id });
  }

  getCuadrillas(areaId?: string) {
    return this.http.post<Cuadrilla[]>(`${this.coreService.URI_API}catalogs/cuadrillas`, { areaId });
  }

  assignArea(ticketId: string, areaId: string): Observable<any> {
    return this.http.post(`${this.coreService.URI_API}tickets/assignArea`, { ticketId, areaId });
  }

  assignCuadrilla(ticketId: string, cuadrillaId: string): Observable<any> {
    return this.http.post(`${this.coreService.URI_API}tickets/assignCuadrilla`, { ticketId, cuadrillaId });
  }

  respondToAssignment(ticketId: string, accepted: boolean, rejectionReason = '') {
    return this.http.post(`${this.coreService.URI_API}tickets/acceptOrRejectTicket`, {
      ticketId,
      accepted,
      rejectionReason
    });
  }
}
