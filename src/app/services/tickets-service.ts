import { Injectable, signal } from '@angular/core';
import { Ticket } from '../models/Ticket';
import { HttpClient } from '@angular/common/http';
import { CoreService } from './core-service';
import { Luminaria } from '../models/Luminaria';
import { Tema } from '../models/Tema';
import { Area } from '../models/Area';

@Injectable({
  providedIn: 'root'
})
export class TicketsService {


  constructor(private readonly http: HttpClient, private readonly coreService: CoreService) { }

  tickets: Ticket[] = [];
  selectedTicket = signal<Ticket | null>(null);
  reverseGeocode(lat: number, lng: number) {
    console.log("solicitado")
    return this.http.post<{ address: string }>(
      this.coreService.URI_API + 'maps/reverse-geocode',
      { lat, lng }
    );
  }


  setTicket(ticket: Ticket) {
    this.selectedTicket.set(ticket);
  }
  clearTicket() {
    this.selectedTicket.set(null);
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
  manageTicket(ticket: Partial<Ticket>, file?: File) {
    const formData = new FormData();
    formData.append('ticket', JSON.stringify(ticket));
    if (file) {
      formData.append('image', file);
    }
    return this.http.post(this.coreService.URI_API + 'tickets/manageTicket', formData);
  }

getTemas() {
  return this.http.post<Tema[]>(this.coreService.URI_API + 'tickets/getTemas', {});
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

getProblems() {
  return this.http.post<{ _id: string; name: string }[]>('/api/catalogs/problems', {});
}

getStatuses() {
  return this.http.post<{ _id: string; name: string }[]>('/api/catalogs/statuses', {});
}


getCuadrillas() {
  return this.http.post<{ _id: string; name: string }[]>('/api/catalogs/cuadrillas', {});
}

}
