import { Component, Inject, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Ticket } from '../../../models/Ticket';
import { CookieService } from 'ngx-cookie-service';
import { TicketsService } from '../../../services/tickets-service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { EditTicketDialog } from '../../dialogs/edit-ticket-dialog/edit-ticket-dialog';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
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
    MatTooltipModule,
    MatDatepickerModule
  ],
  providers: [CookieService],
  templateUrl: './tickets.html',
  styleUrls: ['./tickets.scss'],
})
export class Tickets {
  tickets: Ticket[] = [];
  ticketsSignal = signal<Ticket[]>([]);

  constructor(private ticketsService: TicketsService, private dialog: MatDialog,
    private router: Router) {
    this.ticketsService.getAllTickets([]).subscribe((tickets) => {
      this.tickets = tickets;
      this.ticketsSignal.set(tickets);
      this.ticketsService.tickets = tickets;
    });
  }
  getProblemIcon(problem: string): string {
    const icons = {
      'Fuga de agua': 'water_drop',
      'Bache': 'construction',
      'Alumbrado': 'lightbulb',
      'Basura': 'delete',
      'default': 'report_problem',
    };
    return problem in icons ? icons[problem as keyof typeof icons] : icons['default'];
  }

  getStatusIcon(status: string): string {
    return {
      'Pendiente': 'schedule',
      'En desarrollo': 'autorenew',
      'Atendida': 'check_circle',
    }[status] || 'help';
  }

  getStatusClass(status: string): string {
    return {
      'Pendiente': 'pendiente',
      'En desarrollo': 'en-desarrollo',
      'Atendida': 'atendida',
    }[status] || '';
  }


  private filterStatus = signal<string>('Todos');
  private searchTerm = signal<string>('');

  itemsPerPage = 15;
  private currentPage = signal(1);
  private sortColumn = signal<keyof Ticket | ''>('');
  private sortDirection = signal<'asc' | 'desc'>('asc');

  filterStatusSignal = this.filterStatus.asReadonly();
  currentPageSignal = this.currentPage.asReadonly();

  displayedColumns: string[] = [
    'folio',
    'problem',
    'description',
    'createdAt',
    'status',
    'actions',
    'semaforo',
  ];

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

  getSortIndicator(column: keyof Ticket) {
    if (this.sortColumn() !== column) return '';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  updateStatus(id: string, newStatus: 'Pendiente' | 'En desarrollo' | 'Atendida') {
    const updated = this.ticketsSignal().map((t) =>
      t._id === id ? { ...t, status: newStatus } : t
    );
    this.ticketsSignal.set(updated);
  }

  updateArea(id: string, newArea: string) {
    const updated = this.ticketsSignal().map((t) =>
      t._id === id ? { ...t, area: newArea } : t
    );
    this.ticketsSignal.set(updated);
  }

  deleteTicket(id: string) {
    const filtered = this.ticketsSignal().filter((t) => t._id !== id);
    this.ticketsSignal.set(filtered);

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }

  onPageChange(event: { pageIndex: number; pageSize: number }) {
    this.currentPage.set(event.pageIndex + 1);
    this.itemsPerPage = event.pageSize;
  }

  editTicket(ticket: Ticket) {
    const dialogRef = this.dialog.open(EditTicketDialog, {
      data: ticket,
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'full-edit') {
        this.router.navigate(['/tickets/edit', ticket._id]);
      } else if (result) {
        // Aquí puedes actualizar el ticket directamente si editó y guardó.
        console.log('Ticket editado:', result);
      }
    });
  }

  onCardClick(status: string) {
    this.setFilterStatus(status);
  }

  isClosed(ticket: Ticket): boolean {
    return ticket.status === 'Atendida';
  }

  getSemaforoColor(createdAt: Date): 'verde' | 'ambar' | 'rojo' {
    const now = new Date();
    const diffHours = (now.getTime() - new Date(createdAt).getTime()) / 36e5;
    if (diffHours <= 48) return 'verde';
    if (diffHours <= 96) return 'ambar';
    return 'rojo';
  }

  countByStatus(status: string): number {
    return this.filteredTickets().filter((ticket) => ticket.status === status)
      .length;
  }

  private sortTickets(tickets: Ticket[]): Ticket[] {
    const column = this.sortColumn();
    if (!column) return tickets;

    const dir = this.sortDirection();
    return [...tickets].sort((a, b) => {
      let aVal = a[column] ?? '';
      let bVal = b[column] ?? '';

      if (aVal instanceof Date && bVal instanceof Date) {
        const aTime = aVal.getTime();
        const bTime = bVal.getTime();
        if (aTime < bTime) return dir === 'asc' ? -1 : 1;
        if (aTime > bTime) return dir === 'asc' ? 1 : -1;
        return 0;
      }

      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  filteredTickets = computed(() => {
    let tickets = this.ticketsSignal();

    if (this.searchTerm().trim() !== '') {
      const term = this.searchTerm().toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.problem.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus() !== 'Todos') {
      tickets = tickets.filter((t) => t.status === this.filterStatus());
    }

    return this.sortTickets(tickets);
  });

  totalPages = computed(
    () => Math.ceil(this.filteredTickets().length / this.itemsPerPage) || 1
  );

  pagedTickets = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredTickets().slice(start, start + this.itemsPerPage);
  });
}
