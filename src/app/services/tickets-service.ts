import { Injectable, signal } from '@angular/core';
import { Ticket } from '../models/Ticket';
import { HttpClient } from '@angular/common/http';
import { CoreService } from './core-service';

@Injectable({
  providedIn: 'root'
})
export class TicketsService {

  constructor(private readonly http: HttpClient, private readonly coreService: CoreService) { }

  tickets: Ticket[] = [];
  selectedTicket = signal<Ticket | null>(null);

  setTicket(ticket: Ticket) {
    this.selectedTicket.set(ticket);
  }

  getTicket() {
    return this.selectedTicket.asReadonly();
  }
  getAllTickets(filters: { field: string; value: any }[]) {
    return this.http.post<Ticket[]>(
      this.coreService.URI_API + 'tickets/getAllTickets',
      filters.length > 0 ? { filters } : {}
    );
  }
  createTicket(ticket: Partial<Ticket>, file?: File) {
    const formData = new FormData();
    formData.append('ticket', JSON.stringify(ticket));
    if (file) {
      formData.append('image', file);
    }
    return this.http.post(this.coreService.URI_API + 'tickets/createTicket', formData);
  }

}
