import { Component, inject, signal } from '@angular/core';
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
import { TicketStatus } from '../../../models/TicketStatus';
import { Tema } from '../../../models/Tema';
import { AuthService } from '../../../services/auth.service';
import { Area } from '../../../models/Area';
import { TicketAssignmentDialog } from '../../dialogs/ticket-assignment-dialog/ticket-assignment-dialog';
import { MatMenuModule } from '@angular/material/menu';
import { RejectionDetailsDialog } from '../../dialogs/rejection-details-dialog/rejection-details-dialog';
import { Subject } from 'rxjs/internal/Subject';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
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
    MatDialogModule,
    MatMenuModule
  ],
  providers: [CookieService],
})
export class Tickets {
  private readonly ticketsService = inject(TicketsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  protected readonly authService = inject(AuthService); // Assuming this is the correct service for auth
  readonly ticketsSignal = signal<Ticket[]>([]);
  readonly filterStatus = signal('Todos');
  readonly searchTerm = signal('');
  readonly sortColumn = signal<keyof Ticket | ''>('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected totalTickets = signal(0);
  protected page = signal(1);
  protected pageSize = signal(20);
  private searchSubject = new Subject<string>();
  protected ticketStatuses = signal<TicketStatus[]>([]);
  ticketProblems = signal<Tema[]>([]);
  areas = signal<Area[]>([]);
  readonly displayedColumns = [
    'folio',
    'problem',
    'area',
    'createdAt',
    'status',
    'actions',
    'semaforo',
  ];

  constructor() {
    this.searchSubject.pipe(debounceTime(400)).subscribe(value => {
      this.searchTerm.set(value);
      this.page.set(1);
      this.loadTickets();
    });
    this.loadTickets();
    this.loadCatalogs();
  }
  private loadCatalogs() {
    this.ticketsService.getTicketStatuses().subscribe(data => this.ticketStatuses.set(data));
    this.ticketsService.getTemas().subscribe(data => { this.ticketProblems.set(data); });
    this.ticketsService.getAreas().subscribe(data => { this.areas.set(data); });
  }
  getAreaName(id: string): string {
    return this.areas().find(a => a._id === id)?.name ?? 'Desconocida';
  }

  acceptTicket(ticketId: string) {
    this.ticketsService.respondToTicketAssignment(ticketId, this.authService.currentUser._id, true).subscribe({
      next: () => this.loadTickets(),
      error: (err) => console.error('Error al aceptar ticket:', err)
    });
  }

  rejectTicket(ticketId: string) {
    const reason = prompt('Motivo de rechazo:');
    if (!reason) return;

    this.ticketsService.respondToTicketAssignment(ticketId, this.authService.currentUser._id, false, reason).subscribe({
      next: () => this.loadTickets(),
      error: (err) => console.error('Error al rechazar ticket:', err)
    });
  }

  getStatusName(statusId: string): string {
    const status = this.ticketStatuses().find(s => s._id === statusId);
    return status ? status.name : 'Sin estado';
  }
  getProblemName(problemId: string): string {
    const problem = this.ticketProblems().find(s => s._id === problemId);
    return problem ? problem.name : 'Sin problema';
  }


  openAssignmentDialog(ticket: Ticket) {
    this.dialog.open(TicketAssignmentDialog, {
      data: {
        ticket,
        areas: this.areas(),
      },
      width: '600px'
    }).afterClosed().subscribe(refresh => {
      if (refresh) this.loadTickets();
    });
  }

  wasRejected(ticket: Ticket): boolean {
    return ticket.areaAssignments.some(
      a => a.assignedBy === this.authService.currentUser._id && a.rejectionReason
    );
  }
  private loadTickets() {
    const filters = [];
    if (this.filterStatus() !== 'Todos') {
      filters.push({ field: 'status', value: this.filterStatus() });
    }

    filters.push({ field: 'createdBy', value: this.authService.currentUser._id });

    this.ticketsService.getAllTickets(
      filters,
      this.page(),
      this.pageSize(),
      this.searchTerm(),
      this.sortColumn() ? { [this.sortColumn()]: this.sortDirection() === 'asc' ? 1 : -1 } : { createdAt: -1 }
    ).subscribe({
      next: (response) => {
        this.ticketsSignal.set(response.data);
        this.totalTickets.set(response.total);
      },
      error: (err) => {
        if (err.status === 401) {
          this.ticketsSignal.set([]);
          this.totalTickets.set(0);
          console.warn('⛔ Sesión expirada o sin autorización. Tickets limpiados.');
        } else {
          console.error('Error inesperado al cargar tickets:', err);
        }
      }
    });
  }

  setSearch(value: string) {
    this.searchSubject.next(value);
  }

  setFilterStatus(value: string) {
    this.filterStatus.set(value);
    this.page.set(1);
    this.loadTickets();
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
      'pending': 'schedule',         // reloj
      'in-process': 'autorenew',     // girando
      'solved': 'check_circle',      // paloma
      'canceled': 'cancel'           // cruz
    }[status] ?? 'help';             // ícono por defecto
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
    if (!window.confirm('¿Estás seguro de eliminar este ticket?')) return;

    this.ticketsService.deleteTicket(id).subscribe({
      next: () => {
        const filtered = this.ticketsSignal().filter(t => t._id !== id);
        this.ticketsSignal.set(filtered);

        if (this.page() > Math.ceil(this.totalTickets() / this.pageSize())) {
          this.page.set(Math.ceil(this.totalTickets() / this.pageSize()));
        }
      },
      error: (err) => {
        console.error(`Error al eliminar ticket ${id}:`, err);
      }
    });
  }



  onPageChange({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) {
    this.page.set(pageIndex + 1);   // ✅ mantén esto
    this.pageSize.set(pageSize);
    this.loadTickets();
  }



  editTicket(ticket: Ticket) {
    this.ticketsService.setTicket(ticket);
    this.router.navigate(['/ticket']);
  }

  onCardClick(status: string) {
    this.setFilterStatus(status);
  }

  isClosed = (ticket: Ticket) => ticket.status === 'Atendida';
  countSemaforoColor(color: 'verde' | 'ambar' | 'rojo'): number {
    return this.ticketsSignal().filter(ticket => this.getSemaforoColor(ticket.createdAt!) === color).length;
  }

  getSemaforoColor(createdAt: Date): 'verde' | 'ambar' | 'rojo' {
    const diffHours = (new Date().getTime() - new Date(createdAt).getTime()) / 36e5;
    if (diffHours <= 48) return 'verde';
    if (diffHours <= 96) return 'ambar';
    return 'rojo';
  }
  getLatestAssignment(ticket: Ticket) {
    return ticket.areaAssignments
      .filter(a => a.area === ticket.currentArea)
      .at(-1); // obtiene la última asignación
  }

  getAreaStatusIcon(ticket: Ticket): string {
    const assignment = this.getLatestAssignment(ticket);

    if (!assignment) return 'help';
    if (assignment.accepted) return 'check_circle';
    if (assignment.rejectionReason) return 'cancel';
    return 'hourglass_empty';
  }

  getAreaStatusIconColor(ticket: Ticket): string {
    const assignment = this.getLatestAssignment(ticket);

    if (!assignment) return 'warn';
    if (assignment.accepted) return 'text-primary';
    if (assignment.rejectionReason) return 'text-warn';
    return 'text-accent';
  }

  getAreaStatusTooltip(ticket: Ticket): string {
    const assignment = this.getLatestAssignment(ticket);

    if (!assignment) return 'Sin información de asignación';
    if (assignment.accepted) return 'Área aceptó el ticket';
    if (assignment.rejectionReason) return 'Área rechazó el ticket';
    return 'Área aún no ha respondido';
  }
  hasAreaRejection(ticket: Ticket): boolean {
    return ticket.areaAssignments.some(a => !!a.rejectionReason);
  }

  getLatestRejection(ticket: Ticket) {
    const rejections = ticket.areaAssignments
      .filter(a => !!a.rejectionReason)
      .sort((a, b) => new Date(b.respondedAt!).getTime() - new Date(a.respondedAt!).getTime());

    return rejections.at(0); // última
  }

  openRejectionDialog(ticket: Ticket): void {
    const latestRejection = this.getLatestRejection(ticket);
    if (!latestRejection) return;

    this.ticketsService.getUserById(latestRejection.rejectedBy!).subscribe({
      next: (user) => {
        const fullName = user
          ? `${user.name} ${user.first_lastname} ${user.second_lastname}`
          : 'Usuario no encontrado';
        this.dialog.open(RejectionDetailsDialog, {
          data: {
            areaName: this.getAreaName(latestRejection.area),
            userName: fullName,
            reason: latestRejection.rejectionReason,
            date: latestRejection.respondedAt,
          },
          width: '400px'
        });
      },
      error: (err) => {
        console.error('Error al obtener usuario', err);
        this.dialog.open(RejectionDetailsDialog, {
          data: {
            areaName: this.getAreaName(latestRejection.area),
            userName: 'Error de carga',
            reason: latestRejection.rejectionReason,
            date: latestRejection.respondedAt,
          },
          width: '400px'
        });
      }
    });
  }


  countByStatus = (status: string) => this.ticketsSignal().filter(t => t.status === status).length;

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





}
