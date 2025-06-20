import { Component, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Ticket } from '../../../models/ticket.model';
import { CookieService } from 'ngx-cookie-service';

enum TicketStatus {
  Abierto = 'Abierto',
  EnProceso = 'En Proceso',
  Cerrado = 'Cerrado',
  Todos = 'Todos',
}

enum TicketPriority {
  Alta = 'Alta',
  Media = 'Media',
  Baja = 'Baja',
  Todas = 'Todas',
}

enum TicketArea {
  Limpia = 'Limpia publica',
  Alumbrado = 'Alumbrado',
  Bacheo = 'Bacheo',
  Transito = 'Transito',
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatPaginatorModule,

  ],
  providers:[CookieService],
  templateUrl: './tickets.html',
  styleUrls:  ['./tickets.scss'],
})
export class Tickets {

  constructor() {

  }

  TicketStatus = TicketStatus;
  TicketArea = TicketArea;

  private allTickets = signal<Ticket[]>([
    {
      id: 1,
      area: TicketArea.Limpia,
      title: 'Falla en alumbrado público',
      description: 'Lámpara en calle 5 no funciona',
      priority: 'Alta',
      status: 'Abierto',
      cuadrilla: '',
      createdAt: new Date('2025-06-08T10:00:00'),
    },
    {
      id: 2,
      area: TicketArea.Alumbrado,
      title: 'Recolección de basura atrasada',
      description: 'No pasaron el camión en colonia centro',
      priority: 'Media',
      status: 'En Proceso',
      cuadrilla: '',
      createdAt: new Date('2025-06-06T12:00:00'),
    },
    {
      id: 3,
      area: TicketArea.Limpia,
      title: 'Reporte de bache grande',
      description: 'Bache peligroso en avenida principal',
      priority: 'Alta',
      status: 'Abierto',
      cuadrilla: '',
      createdAt: new Date('2025-06-01T09:00:00'),
    },
    {
      id: 4,
      area: TicketArea.Alumbrado,
      title: 'Limpieza de parques',
      description: 'Parque infantil con basura acumulada',
      priority: 'Baja',
      status: 'Cerrado',
      cuadrilla: '',
      createdAt: new Date('2025-06-07T18:00:00'),
    },
    {
      id: 5,
      area: TicketArea.Bacheo,
      title: 'Fuga de agua potable',
      description: 'Tubería rota en calle secundaria',
      priority: 'Alta',
      status: 'Abierto',
      cuadrilla: '',
      createdAt: new Date('2025-05-30T14:00:00'),
    },
    {
      id: 6,
      area: TicketArea.Alumbrado,
      title: 'Mantenimiento a áreas verdes',
      description: 'Podar árboles en avenida principal',
      priority: 'Media',
      status: 'En Proceso',
      cuadrilla: '',
      createdAt: new Date('2025-06-05T08:00:00'),
    },
    {
      id: 7,
      area: TicketArea.Bacheo,
      title: 'Señalización vial caída',
      description: 'Señal de alto derribada en cruce',
      priority: 'Alta',
      status: 'Abierto',
      cuadrilla: '',
      createdAt: new Date('2025-06-08T22:00:00'),
    },
    {
      id: 8,
      area: TicketArea.Transito,
      title: 'Desazolve de drenaje',
      description: 'Drenaje obstruido en colonia 4',
      priority: 'Baja',
      status: 'En Proceso',
      cuadrilla: '',
      createdAt: new Date('2025-06-04T16:00:00'),
    },
    {
      id: 9,
      area: TicketArea.Alumbrado,
      title: 'Iluminación parque deportivo',
      description: 'Focos apagados en cancha',
      priority: 'Media',
      status: 'Abierto',
      cuadrilla: '',
      createdAt: new Date('2025-06-07T07:00:00'),
    },
    {
      id: 10,
      area: TicketArea.Transito,
      title: 'Reparación de banquetas',
      description: 'Banqueta rota en calle 3',
      priority: 'Baja',
      status: 'Cerrado',
      cuadrilla: '',
      createdAt: new Date('2025-06-03T11:00:00'),
    },
  ]);

  private filterStatus = signal<TicketStatus>(TicketStatus.Todos);
  private filterPriority = signal<TicketPriority>(TicketPriority.Todas);
  private filterArea = signal<TicketArea | 'Todas'>('Todas');
  private searchTerm = signal<string>('');

  itemsPerPage = 15;
  private currentPage = signal(1);
  private sortColumn = signal<keyof Ticket | ''>('');
  private sortDirection = signal<'asc' | 'desc'>('asc');

  filterStatusSignal = this.filterStatus.asReadonly();
  filterPrioritySignal = this.filterPriority.asReadonly();
  currentPageSignal = this.currentPage.asReadonly();
  filterAreaSignal = this.filterArea.asReadonly();

  displayedColumns: string[] = [
    'id',
    'title',
    'description',
    'createdAt',
    'priority',
    'status',
    'area',
    'actions',
    'semaforo',
  ];

  setFilterArea(value: TicketArea | 'Todas') {
    this.filterArea.set(value);
    this.currentPage.set(1);
  }

  setSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  setFilterStatus(value: TicketStatus) {
    this.filterStatus.set(value);
    this.currentPage.set(1);
  }

  setFilterPriority(value: TicketPriority) {
    this.filterPriority.set(value);
    this.currentPage.set(1);
  }

  sortBy(column: keyof Ticket) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  getSortIndicator(column: keyof Ticket) {
    if (this.sortColumn() !== column) return '';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  updateStatus(id: number, newStatus: 'Abierto' | 'En Proceso' | 'Cerrado') {
    const updated = this.allTickets().map((t) =>
      t.id === id ? { ...t, status: newStatus } : t
    );
    this.allTickets.set(updated);
  }

  updateArea(id: number, newArea: TicketArea) {
    const updated = this.allTickets().map((t) =>
      t.id === id ? { ...t, area: newArea } : t
    );
    this.allTickets.set(updated);
  }

  deleteTicket(id: number) {
    const filtered = this.allTickets().filter((t) => t.id !== id);
    this.allTickets.set(filtered);

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }
viewTicket(ticket:any){

}
  onPageChange(event: { pageIndex: number; pageSize: number }) {
    this.currentPage.set(event.pageIndex + 1);
    this.itemsPerPage = event.pageSize;
  }

  editTicket(ticket: Ticket) {}

  onCardClick(status: TicketStatus) {
    this.setFilterStatus(status);
  }
  isClosed(ticket: Ticket): boolean {
    return ticket.status === TicketStatus.Cerrado;
  }

  getSemaforoColor(createdAt: Date): 'verde' | 'ambar' | 'rojo' {
    const now = new Date();
    const diffHours = (now.getTime() - createdAt.getTime()) / 36e5;
    if (diffHours <= 48) return 'verde';
    if (diffHours <= 96) return 'ambar';
    return 'rojo';
  }
  semaforoCounts = computed(() => {
    const counts = { verde: 0, ambar: 0, rojo: 0 };
    for (const ticket of this.filteredTickets()) {
      const color = this.getSemaforoColor(ticket.createdAt);
      counts[color]++;
    }
    return counts;
  });
  countByStatus(status: TicketStatus): number {
    return this.filteredTickets().filter((ticket) => ticket.status === status)
      .length;
  }

  private sortTickets(tickets: Ticket[]): Ticket[] {
    const column = this.sortColumn();
    if (!column) {
      // Orden por defecto: Cerrados al final
      return [...tickets].sort((a, b) => {
        if (a.status === 'Cerrado' && b.status !== 'Cerrado') return 1;
        if (a.status !== 'Cerrado' && b.status === 'Cerrado') return -1;
        return 0;
      });
    }

    const dir = this.sortDirection();
    return [...tickets].sort((a, b) => {
      // Prioridad: Cerrados al final
      if (a.status === 'Cerrado' && b.status !== 'Cerrado') return 1;
      if (a.status !== 'Cerrado' && b.status === 'Cerrado') return -1;

      let aVal = a[column];
      let bVal = b[column];

      if (aVal instanceof Date && bVal instanceof Date) {
        aVal = aVal.getTime();
        bVal = bVal.getTime();
      }

      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  filteredTickets = computed(() => {
    let tickets = this.allTickets();

    if (this.searchTerm().trim() !== '') {
      const term = this.searchTerm().toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus() !== TicketStatus.Todos) {
      tickets = tickets.filter((t) => t.status === this.filterStatus());
    }

    if (this.filterPriority() !== TicketPriority.Todas) {
      tickets = tickets.filter((t) => t.priority === this.filterPriority());
    }

    if (this.filterArea() !== 'Todas') {
      tickets = tickets.filter((t) => t.area === this.filterArea());
    }

    tickets = this.sortTickets(tickets);

    const maxPage = Math.ceil(tickets.length / this.itemsPerPage) || 1;
    if (this.currentPage() > maxPage) {
      queueMicrotask(() => this.currentPage.set(1));
    }

    return tickets;
  });

  totalPages = computed(
    () => Math.ceil(this.filteredTickets().length / this.itemsPerPage) || 1
  );

  pagedTickets = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredTickets().slice(start, start + this.itemsPerPage);
  });

  ticketCount = computed(() => this.allTickets().length);
}
