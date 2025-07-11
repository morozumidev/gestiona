import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { Ticket } from '../../../models/Ticket';
import { TicketsService } from '../../../services/tickets-service';
import { EditTicketDialog } from '../../dialogs/edit-ticket-dialog/edit-ticket-dialog';

@Component({
  selector: 'app-tickets',
  standalone: true,
  templateUrl: './tickets.html',
  styleUrls: ['./tickets.scss'],
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
    MatTooltipModule,
    MatDatepickerModule,
    MatDialogModule
  ],
  providers: [CookieService],
})
export class Tickets {
  private readonly ticketsService = inject(TicketsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly ticketsSignal = signal<Ticket[]>([]);
  readonly filterStatus = signal('Todos');
  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly sortColumn = signal<keyof Ticket | ''>('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  itemsPerPage = 15;

  readonly displayedColumns = [
    'folio',
    'problem',
    'description',
    'createdAt',
    'status',
    'actions',
    'semaforo',
  ];

  constructor() {
    this.loadTickets();
  }

  private loadTickets() {
    this.ticketsService.getAllTickets([]).subscribe({
      next: (tickets) => this.ticketsSignal.set(tickets),
      error: (err) => {
        if (err.status === 401) {
          this.ticketsSignal.set([]);
          console.warn('⛔ Sesión expirada o sin autorización. Tickets limpiados.');
        } else {
          console.error('Error inesperado al cargar tickets:', err);
        }
      }
    });
  }

  setSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  setFilterStatus(value: string) {
    this.filterStatus.set(value);
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

  getSortIndicator = (column: keyof Ticket) =>
    this.sortColumn() === column ? (this.sortDirection() === 'asc' ? '▲' : '▼') : '';

  getProblemIcon(problem: string): string {
    return {
      'Fuga de agua': 'water_drop',
      'Bache': 'construction',
      'Alumbrado': 'lightbulb',
      'Basura': 'delete',
    }[problem] ?? 'report_problem';
  }

  getStatusIcon(status: string): string {
    return {
      'Pendiente': 'schedule',
      'En desarrollo': 'autorenew',
      'Atendida': 'check_circle',
    }[status] ?? 'help';
  }

  getStatusClass(status: string): string {
    return {
      'Pendiente': 'pendiente',
      'En desarrollo': 'en-desarrollo',
      'Atendida': 'atendida',
    }[status] ?? '';
  }

  updateStatus(id: string, newStatus: Ticket['status']) {
    const updated = this.ticketsSignal().map(t =>
      t._id === id ? { ...t, status: newStatus } : t
    );
    this.ticketsSignal.set(updated);
  }

  updateArea(id: string, newArea: string) {
    const updated = this.ticketsSignal().map(t =>
      t._id === id ? { ...t, area: newArea } : t
    );
    this.ticketsSignal.set(updated);
  }

  deleteTicket(id: string) {
    const filtered = this.ticketsSignal().filter(t => t._id !== id);
    this.ticketsSignal.set(filtered);

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }

  onPageChange({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) {
    this.currentPage.set(pageIndex + 1);
    this.itemsPerPage = pageSize;
  }

  editTicket(ticket: Ticket) {
    this.ticketsService.setTicket(ticket);
    this.router.navigate(['/ticket']);
  }

  onCardClick(status: string) {
    this.setFilterStatus(status);
  }

  isClosed = (ticket: Ticket) => ticket.status === 'Atendida';

  getSemaforoColor(createdAt: Date): 'verde' | 'ambar' | 'rojo' {
    const diffHours = (new Date().getTime() - new Date(createdAt).getTime()) / 36e5;
    if (diffHours <= 48) return 'verde';
    if (diffHours <= 96) return 'ambar';
    return 'rojo';
  }

  countByStatus = (status: string) =>
    this.filteredTickets().filter(t => t.status === status).length;

  private sortTickets = (tickets: Ticket[]): Ticket[] => {
    const column = this.sortColumn();
    if (!column) return tickets;

    const dir = this.sortDirection();
    return [...tickets].sort((a, b) => {
      const aVal = a[column] ?? '';
      const bVal = b[column] ?? '';

      if (aVal instanceof Date && bVal instanceof Date) {
        return dir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }

      return dir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  };

  readonly filteredTickets = computed(() => {
    let result = this.ticketsSignal();

    if (this.searchTerm().trim()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(t =>
        t.problem.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus() !== 'Todos') {
      result = result.filter(t => t.status === this.filterStatus());
    }

    return this.sortTickets(result);
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.filteredTickets().length / this.itemsPerPage) || 1
  );

  readonly pagedTickets = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredTickets().slice(start, start + this.itemsPerPage);
  });
}
