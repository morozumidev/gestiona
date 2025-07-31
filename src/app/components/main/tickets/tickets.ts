import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';

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
import { Console } from 'console';
import { Cuadrilla } from '../../../models/Cuadrilla';
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
  private readonly fb = inject(FormBuilder);
  readonly sortColumn = signal<keyof Ticket | ''>('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly ticketStatusCounts = signal<Record<string, number>>({});
  readonly ticketSemaforoCounts = signal<Record<string, number>>({});
  readonly selectedArea = signal<string | null>(null);
  protected totalTickets = signal(0);
  protected page = signal(1);
  protected pageSize = signal(20);
  private searchSubject = new Subject<string>();
  protected ticketStatuses = signal<TicketStatus[]>([]);
  readonly filterSemaforo = signal<'verde' | 'ambar' | 'rojo' | 'todos'>('todos');
  ticketProblems = signal<Tema[]>([]);

  cuadrillas = signal<Cuadrilla[]>([]);
  areas = signal<Area[]>([]);
  readonly displayedColumns = [
    'folio',
    'problem',
    'area',
    'cuadrilla',
    'createdAt',
    'status',
    'actions',
    'semaforo',
  ];
  readonly isAdmin = this.authService.currentUser.role?.name === 'admin';
  readonly isUser = this.authService.currentUser.role?.name === 'user';
  readonly isAtencion = this.authService.currentUser.role?.name === 'atencion';
  readonly isAdminOrAtencion = this.isAdmin || this.isAtencion || this.isUser;
  readonly currentUserArea = computed(() => this.authService.currentUser?.area || null);
  readonly visibleProblems = computed(() => {
    const all = this.ticketProblems();
    const selectedArea = this.selectedArea();

    if (this.isAdminOrAtencion) {
      if (!selectedArea) return all;
      return all.filter(p => {
        const areaId = typeof p.areaId === 'object' ? p.areaId._id || p.areaId : p.areaId;
        return areaId === selectedArea;
      });
    }

    return all.filter(p => {
      const areaId = typeof p.areaId === 'object' ? p.areaId._id || p.areaId : p.areaId;
      return areaId === this.currentUserArea();
    });
  });
  getStatusCssClass(statusId: string): string {
    const status = this.ticketStatuses().find(s => s._id === statusId);
    return status ? status.cssClass : 'default';
  }
  getRespondableAssignment(ticket: Ticket): any | null {
    const user = this.authService.currentUser;

    // FUNCIONARIO: responder por área
    if (user.role.name === 'funcionario') {
      return ticket.areaAssignments?.find(a => a.area === user.area);
    }

    // CUADRILLA o SUPERVISOR: solo evaluar el último crewAssignment
    if (user.role.name === 'cuadrilla' || user.role.name === 'supervisor') {
      const lastAssignment = ticket.crewAssignments?.at(-1);
      if (!lastAssignment) return null;

      const cuadrilla = this.cuadrillas().find(q => q._id === lastAssignment.cuadrilla);
      const isMiembro = cuadrilla?.members?.includes(user._id);
      const isSupervisor = cuadrilla?.supervisor === user._id;

      return isMiembro || isSupervisor ? lastAssignment : null;
    }

    return null;
  }



  canRespondToAssignment(assignment: any): boolean {
    return !!assignment && !assignment.accepted;
  }

  respondToAssignment(ticketId: string, accepted: boolean) {
    const rejectionReason = accepted ? '' : prompt('Motivo de rechazo:');
    if (!accepted && !rejectionReason) return;
    console.log(ticketId, accepted)

    this.ticketsService
      .respondToAssignment(ticketId, accepted, rejectionReason || '')
      .subscribe({
        next: () => this.loadTickets(),
        error: (err) => console.error('Error al responder asignación:', err)
      });
  }



  readonly columnFilters = this.fb.group({
    startDate: [null],
    endDate: [null],
    problem: [''],
    area: [''],
    status: ['']
  });
  constructor() {
    this.searchSubject.pipe(debounceTime(400)).subscribe(value => {
      this.searchTerm.set(value);
      this.page.set(1);
      this.loadTickets();
    });
    this.loadTickets();
    this.loadCatalogs();
    this.columnFilters.controls['area'].valueChanges.subscribe(value => {
      this.selectedArea.set(value);
    });

  }

  get isAdminOrAtencionOrFuncionario(): boolean {
    const role = this.authService.currentUser?.role?.name;
    return ['admin', 'atencion', 'funcionario'].includes(role);
  }
  get userArea(): string {
    return this.authService.currentUser.area;
  }

  private loadCatalogs() {
    this.ticketsService.getTicketStatuses().subscribe(data => this.ticketStatuses.set(data));
    this.ticketsService.getTemas().subscribe(data => { this.ticketProblems.set(data); });
    this.ticketsService.getAreas().subscribe(data => { this.areas.set(data); });
    this.ticketsService.getCuadrillas().subscribe(data => { this.cuadrillas.set(data) });
  }

  onColumnFilterChange() {
    const selectedProblem = this.columnFilters.controls['problem'].value;
    const visible = this.visibleProblems();
    const stillValid = visible.some(p => p._id === selectedProblem);

    if (!stillValid) {
      this.columnFilters.controls['problem'].setValue('');
    }

    this.page.set(1);
    this.loadTickets();
  }

  getAreaName(id: string): string {
    return this.areas().find(a => a._id === id)?.name ?? 'Desconocida';
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
    const latestAreaAssignment = ticket.areaAssignments.at(-1);

    // Solo bloquear si el usuario es de área y el área aún no ha aceptado ni rechazado
    if (
      this.authService.currentUser.role?.name === 'funcionario' &&
      latestAreaAssignment &&
      !latestAreaAssignment.accepted &&
      !latestAreaAssignment.rejectionReason
    ) {
      alert('Primero debes aceptar el ticket.');
      return;
    }

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

    if (this.filterSemaforo() !== 'todos') {
      filters.push({ field: 'semaforo', value: this.filterSemaforo() });
    }

    filters.push({ field: 'createdBy', value: this.authService.currentUser._id });

    // 👇 Agrega filtros de columna:
    const colFilters = this.columnFilters.value as any;
    const { startDate, endDate, ...restFilters } = colFilters;

    for (const key in restFilters) {
      const value = restFilters[key];
      if (!value || value === '') continue;

      if (key === 'area') {
        if (this.isAdminOrAtencion) {
          filters.push({ field: 'areaAssignments.area', value });
        }
      } else if (key === 'problem') {
        filters.push({ field: 'problem', value });
      } else {
        filters.push({ field: key, value });
      }
    }

    if (startDate || endDate) {
      const createdAtFilter: any = {};
      if (startDate) createdAtFilter.$gte = new Date(startDate);
      if (endDate) createdAtFilter.$lte = new Date(endDate);
      filters.push({ field: 'createdAt', value: createdAtFilter });
    }



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
        this.ticketStatusCounts.set(response.statusCounts);
        this.ticketSemaforoCounts.set(response.semaforoCounts);
      },
      error: (err) => {
        console.error('Error inesperado al cargar tickets:', err);
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
  setFilterSemaforo(color: 'verde' | 'ambar' | 'rojo') {
    this.filterSemaforo.set(color);
    this.page.set(1);
    this.loadTickets();
  }
  clearSemaforoFilter() {
    this.filterSemaforo.set('todos');
    this.page.set(1);
    this.loadTickets();
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
  countSemaforoColor = (color: 'verde' | 'ambar' | 'rojo') =>
    this.ticketSemaforoCounts()[color] ?? 0;

  getSemaforoColor(createdAt: Date): 'verde' | 'ambar' | 'rojo' {
    const diffHours = (new Date().getTime() - new Date(createdAt).getTime()) / 36e5;
    if (diffHours <= 120) return 'verde'; // 1-5 días
    if (diffHours <= 240) return 'ambar'; // 5-10 días
    return 'rojo';                         // 10+ días
  }


  getLatestAssignment(ticket: Ticket) {
    return ticket.areaAssignments.at(-1);
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
  getCrewStatusTooltip(ticket: Ticket): string {
    const crew = ticket.crewAssignments?.at(-1);
    if (!crew) return 'Sin información de asignación';
    if (crew.accepted) return 'Cuadrilla aceptó el ticket';
    if (crew.rejectionReason) return 'Cuadrilla rechazó el ticket';
    return 'Cuadrilla aún no ha respondido';
  }
  getCrewStatusIcon(ticket: Ticket): string {
    const crew = ticket.crewAssignments?.at(-1);
    if (!crew) return 'help';
    if (crew.accepted) return 'check_circle';
    if (crew.rejectionReason) return 'cancel';
    return 'hourglass_empty';
  }
  getCuadrillaName(crewId: string | undefined | null): string {
    if (!crewId) return 'Desconocida';
    const cuadrilla = this.cuadrillas().find(c => c._id === crewId);
    return cuadrilla?.name || 'No encontrada';
  }

  getCrewStatusIconColor(ticket: Ticket): string {
    const crew = ticket.crewAssignments?.at(-1);
    if (!crew) return 'icon-muted';
    if (crew.accepted) return 'icon-success';
    if (crew.rejectionReason) return 'icon-warn';
    return 'icon-pending';
  }
  hasCrewRejection(ticket: Ticket): boolean {
    const last = ticket.crewAssignments?.at(-1);
    return !!last?.rejectionReason;
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

  countByStatus = (statusId: string) =>
    this.ticketStatusCounts()[statusId] ?? 0;


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
