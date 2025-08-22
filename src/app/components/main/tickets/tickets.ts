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
import { MatMenuModule } from '@angular/material/menu';

import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { Ticket } from '../../../models/Ticket';
import { TicketsService } from '../../../services/tickets-service';
import { TicketStatus } from '../../../models/TicketStatus';
import { Tema } from '../../../models/Tema';
import { AuthService } from '../../../services/auth.service';
import { Area } from '../../../models/Area';
import { TicketAssignmentDialog } from '../../dialogs/ticket-assignment-dialog/ticket-assignment-dialog';
import { RejectionDetailsDialog } from '../../dialogs/rejection-details-dialog/rejection-details-dialog';
import { Cuadrilla } from '../../../models/Cuadrilla';

import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';

type SortableTicketField = keyof Ticket | 'area' | 'cuadrilla' | 'semaforo';
type TicketStage = 'tech' | 'area' | 'attention' | 'closed';

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
  protected readonly authService = inject(AuthService);

  readonly ticketsSignal = signal<Ticket[]>([]);
  readonly filterStatus = signal('Todos');
  readonly searchTerm = signal('');
  private readonly fb = inject(FormBuilder);
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
  readonly sortColumn = signal<SortableTicketField | ''>('');
  cuadrillas = signal<Cuadrilla[]>([]);
  areas = signal<Area[]>([]);

  private areaMap = new Map<string, string>();
  private statusMap = new Map<string, string>();
  private statusClassMap = new Map<string, string>();
  private problemMap = new Map<string, string>();

  readonly displayedColumns = [
    'folio',
    'problem',
    'area',
    'cuadrilla',
    'createdAt',
    'updatedAt',
    'status',
    'semaforo',
    'actions',
  ];

  readonly roleName = this.authService.currentUser.role?.name;
  readonly isAdmin = this.roleName === 'admin';
  readonly isAtencion = this.roleName === 'atencion';
  readonly isUser = this.roleName === 'user';
  readonly isAdminOrAtencion = this.isAdmin || this.isAtencion;

  readonly currentUserArea = computed(() => this.authService.currentUser?.area || null);

  readonly visibleProblems = computed(() => {
    const all = this.ticketProblems();
    const selectedArea = this.selectedArea();

    if (this.isAdminOrAtencion) {
      if (!selectedArea) return all;
      return all.filter(p => {
        const areaId = typeof p.areaId === 'object' ? (p.areaId as any)._id || (p.areaId as any) : p.areaId;
        return areaId === selectedArea;
      });
    }

    return all.filter(p => {
      const areaId = typeof p.areaId === 'object' ? (p.areaId as any)._id || (p.areaId as any) : p.areaId;
      return areaId === this.currentUserArea();
    });
  });

  // ========= Helpers de asignaciones =========

  private getLatestAreaAssignment(ticket: Ticket) {
    return ticket.areaAssignments?.at(-1) ?? null;
  }

  /** El área "respondió" si aceptó o rechazó explícitamente */
  private hasAreaResponded(ticket: Ticket): boolean {
    const a = this.getLatestAreaAssignment(ticket);
    return !!a && (a.accepted === true || !!a.rejectionReason);
  }

  /** Solo tiene sentido permitir cuadrilla si el área aceptó */
  private hasAreaAccepted(ticket: Ticket): boolean {
    const a = this.getLatestAreaAssignment(ticket);
    return !!a?.accepted;
  }

  getLastValidCrew(ticket: Ticket): any | null {
    return ticket.crewAssignments?.filter(a => a.valid !== false).at(-1) || null;
  }

  getAreaName(id: string): string {
    return this.areaMap?.get(id) || 'Desconocida';
  }

  getStatusName(statusId: string): string {
    return this.statusMap?.get(statusId) || 'Sin estado';
  }

  getStatusCssClass(statusId: string): string {
    return this.statusClassMap?.get(statusId) || 'default';
  }

  getProblemName(problemId: string): string {
    return this.problemMap?.get(problemId) || 'Sin problema';
  }

  // ========= Etapas del flujo =========

  private hasCrewClosed(ticket: Ticket): boolean {
    return !!ticket.crewAssignments?.at(-1)?.closure?.closedAt;
  }

  /** ¿Fue enviado a atención? */
  private hasBeenSentToAttention(ticket: Ticket): boolean {
    const t: any = ticket as any;

    if (t.sentToAttentionAt || t.sentBackToAttentionAt || t.attention?.sentAt) return true;

    if (Array.isArray(t.tracking)) {
      const sentEvt = t.tracking.some((ev: any) =>
        /atenci[oó]n/i.test(ev?.event || '') && /(enviad|derivad|turnad)/i.test(ev?.event || '')
      );
      if (sentEvt) return true;
    }

    const statusName = (this.getStatusName(ticket.status!) || '').toLowerCase();
    if (/atenci[oó]n/.test(statusName) || /verificaci[oó]n/.test(statusName)) return true;

    return false;
  }

  /** ¿Ya hubo verificación ciudadana? */
private isCitizenVerified(ticket: Ticket): boolean {
  const t: any = ticket as any;

  // 1) Si hay un área activa, no está cerrado para efectos operativos
  if (t.activeArea) return false;

  // 2) Bandera/estado “fuente de verdad”
  if (t.verifiedByReporter === true) return true;

  const statusName = (this.getStatusName(ticket.status!) || '').toLowerCase();
  if (statusName === 'verified_closed' || /cerrad[oa].*verificad/.test(statusName)) {
    return true;
  }

  // 3) Heurística con tracking: verificación solo cuenta si es POSTERIOR a la última Reapertura
  const log: any[] = Array.isArray(t.tracking) ? t.tracking : [];
  const last = (regex: RegExp) =>
    [...log].reverse().find(ev => regex.test(`${ev?.event ?? ''} ${ev?.description ?? ''}`.toLowerCase()));

  const ver = last(/verificaci[oó]n.*ciudadan|confirmad[oa].*ciudadan/);
  const rep = last(/reapertur/);

  const verAt = ver?.date ? new Date(ver.date).getTime() : -1;
  const repAt = rep?.date ? new Date(rep.date).getTime() : -1;

  return verAt > 0 && verAt > repAt;
}


  /** Deriva la etapa actual para reglas de visibilidad/acciones */
private getStage(ticket: Ticket): TicketStage {
  if ((ticket as any).activeArea) return 'tech'; // o 'area' si prefieres
  if (this.isCitizenVerified(ticket)) return 'closed';
  if (this.hasBeenSentToAttention(ticket)) return 'attention';
  if (this.hasCrewClosed(ticket)) return 'area';
  return 'tech';
}

  // ========= Visibilidad por rol =========

  readonly visibleTickets = computed(() => {
    const role = this.authService.currentUser?.role?.name;
    const userId = this.authService.currentUser?._id;
    const myArea = this.authService.currentUser?.area;

    return this.ticketsSignal().filter(ticket => {
      const stage = this.getStage(ticket);

      if (this.isAdmin) return true;

      if (role === 'atencion') {
        return stage === 'attention' || stage === 'closed';
      }

if (role === 'funcionario') {
  const lastArea = this.getLatestAreaAssignment(ticket);
  const effectiveArea = (ticket as any).activeArea ?? lastArea?.area ?? null;
  const isMyArea =
    effectiveArea != null && String(effectiveArea) === String(myArea);

  if (!isMyArea) return false;

  return stage === 'tech' || stage === 'area';
}


      if (role === 'cuadrilla' || role === 'supervisor') {
        if (stage !== 'tech') return false; // tras cierre técnico, ya no lo ve
        const lastCrew = this.getLastValidCrew(ticket);
        if (!lastCrew) return false;
        const cuadrilla = this.cuadrillas().find(q => q._id === lastCrew.cuadrilla);
        if (!cuadrilla) return false;
        const isMiembro = !!cuadrilla.members?.includes(userId);
        const isSupervisor = cuadrilla.supervisor === userId;
        return isMiembro || isSupervisor;
      }

      if (this.isUser) {
        return (ticket as any).createdBy === userId;
      }

      return true;
    });
  });

  // ========= Guards (botones/acciones) =========

  /** Cerrar por cuadrilla (solo etapa tech) */
  canTechClose(ticket: Ticket): boolean {
    const role = this.authService.currentUser?.role?.name;
    if (this.getStage(ticket) !== 'tech') return false;

    if (!this.hasAreaResponded(ticket) || !this.hasAreaAccepted(ticket)) return false;
    const lastCrew = this.getLastValidCrew(ticket);
    if (!lastCrew) return false;

    if (role === 'supervisor' || role === 'cuadrilla') {
      const cuadrilla = this.cuadrillas().find(q => q._id === lastCrew.cuadrilla);
      const userId = this.authService.currentUser._id;
      const isMiembro = !!cuadrilla?.members?.includes(userId);
      const isSupervisor = cuadrilla?.supervisor === userId;
      return isMiembro || isSupervisor;
    }

    if (role === 'admin') return true;
    return false;
  }

  /** Enviar a atención (etapa área; admin/funcionario del área) */
  canSendToAttention(ticket: Ticket): boolean {
    const stage = this.getStage(ticket);
    if (stage !== 'area') return false;

    const role = this.authService.currentUser?.role?.name;
    if (role === 'admin') return true;

    if (role === 'funcionario') {
      const lastArea = this.getLatestAreaAssignment(ticket);
      return !!lastArea?.accepted && lastArea.area === this.authService.currentUser?.area;
    }
    return false;
  }

  /** Verificación con ciudadano (solo etapa atención; no verificado aún) */
  canVerifyWithCitizen(ticket: Ticket): boolean {
    if (this.getStage(ticket) !== 'attention') return false;
    if (this.isCitizenVerified(ticket)) return false;
    const role = this.authService.currentUser?.role?.name;
    return role === 'atencion' || role === 'admin';
  }

  /** Reabrir (solo etapa closed; admin/atención) */
// 👇 Mostrar "Reabrir" solo para admin/atención y cuando ya hubo verificación ciudadana/cierre final
canReopen(ticket: Ticket): boolean {
  const role = this.authService.currentUser?.role?.name;
  // Reabrir lo hace atención/admin. Puedes acotar más si quieres:
  return role === 'admin' || role === 'atencion';
}

openReopenDialog(ticket: Ticket) {
  this.dialog.open(TicketAssignmentDialog, {
    data: {
      ticket,
      areas: this.areas(),
      mode: 'reopen'              // 👈 clave para activar el flujo de reopen
    },
    width: '600px'
  }).afterClosed().subscribe(refresh => {
    if (refresh) this.loadTickets();
  });
}




  // ========= Acciones backend por fila =========

  sendToAttention(ticketId: string, comment?: string) {
    return this.ticketsService.sendToAttention({ ticketId, comment }).subscribe({
      next: () => this.loadTickets(),
      error: (err) => console.error('Error al enviar a atención:', err),
    });
  }

  crewClose(ticketId: string) {
    const workSummary = prompt('Resumen de trabajo') || '';
    this.ticketsService.crewClose({ ticketId, workSummary, materialsUsed: [], photos: [] })
      .subscribe({
        next: () => this.loadTickets(),
        error: (err) => console.error('Error al cerrar por cuadrilla:', err),
      });
  }

  verifyCitizen(ticketId: string, resolved: boolean) {
    const citizenComment = prompt('Comentario del ciudadano (opcional)') || '';
    this.ticketsService.verifyCitizen({ ticketId, resolved, citizenComment })
      .subscribe({
        next: () => this.loadTickets(),
        error: (err) => console.error('Error en verificación de ciudadano:', err),
      });
  }


  // ========= Lógica previa existente (conservada) =========
private sameId(a: any, b: any) {
  return String(a ?? '') === String(b ?? '');
}

  canRespondToTicket(ticket: Ticket): boolean {
    const user = this.authService.currentUser;

if (user.role.name === 'funcionario') {
  const last = ticket.areaAssignments?.at(-1);
  // Solo si la ÚLTIMA asignación es de su área y está pendiente
  return !!last
    && this.sameId(last.area, user.area)
    && last.accepted !== true
    && !last.rejectionReason;
}

    if (user.role.name === 'cuadrilla' || user.role.name === 'supervisor') {
      if (!this.hasAreaResponded(ticket)) return false;
      if (!this.hasAreaAccepted(ticket)) return false;

      const lastCrew = this.getLastValidCrew(ticket);
      if (!lastCrew) return false;
      if (lastCrew.closure?.closedAt) return false; // ya cerrado => no responde

      const cuadrilla = this.cuadrillas().find(q => q._id === lastCrew.cuadrilla);
      const isMiembro = !!cuadrilla?.members?.includes(user._id);
      const isSupervisor = cuadrilla?.supervisor === user._id;

      return (isMiembro || isSupervisor) && !lastCrew.accepted && !lastCrew.rejectionReason;
    }

    return false;
  }

  /**
   * Acción de respuesta (aceptar/rechazar)
   * Bloqueo explícito: cuadrilla/supervisor no puede ACEPTAR NI RECHAZAR
   * hasta que el área haya respondido; y solo puede cuando el área ACEPTÓ.
   */
  respondToAssignment(ticketId: string, accepted: boolean) {
    const ticket = this.ticketsSignal().find(t => t._id === ticketId);
    if (!ticket) return;

    const roleName = this.authService.currentUser?.role?.name;

    if (roleName === 'cuadrilla' || roleName === 'supervisor') {
      if (!this.hasAreaResponded(ticket)) {
        alert('El área debe responder primero para que la cuadrilla pueda actuar.');
        return;
      }
      if (!this.hasAreaAccepted(ticket)) {
        alert('El área rechazó o no aceptó este ticket. La cuadrilla no puede responder.');
        return;
      }
    }

    const rejectionReason = accepted ? '' : prompt('Motivo de rechazo:');
    if (!accepted && !rejectionReason) return;

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
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        return this.ticketsService.getAllTickets(
          this.buildFilters(),
          this.page(),
          this.pageSize(),
          term,
          this.sortColumn()
            ? { [this.sortColumn()]: this.sortDirection() === 'asc' ? 1 : -1 }
            : { updatedAt: -1 }
        );
      })
    ).subscribe({
      next: (response) => {
        this.ticketsSignal.set(response.data);
        this.totalTickets.set(response.total);
        this.ticketStatusCounts.set(response.statusCounts);
        this.ticketSemaforoCounts.set(response.semaforoCounts);
      },
      error: (err) => {
        console.error('Error inesperado al buscar tickets:', err);
      }
    });

    this.loadTickets();
    this.loadCatalogs();

    this.columnFilters.controls['area'].valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(value => {
        this.selectedArea.set(value);
      });
  }

  private buildFilters() {
    const filters: any[] = [];

    if (this.filterStatus() !== 'Todos') {
      filters.push({ field: 'status', value: this.filterStatus() });
    }

    if (this.filterSemaforo() !== 'todos') {
      filters.push({ field: 'semaforo', value: this.filterSemaforo() });
    }

    if (this.isUser) {
      filters.push({ field: 'createdBy', value: this.authService.currentUser._id });
    }

    const colFilters = this.columnFilters.value as any;
    const { startDate, endDate, ...restFilters } = colFilters;

    for (const key in restFilters) {
      const value = restFilters[key];
      if (!value || value === '') continue;

      if (key === 'area') {
        if (this.isAdminOrAtencion) {
          filters.push({ field: 'activeArea', value }); // antes: 'areaAssignments.area'
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

    return filters;
  }

  get isAdminOrAtencionOrFuncionario(): boolean {
    const role = this.authService.currentUser?.role?.name;
    return ['admin', 'atencion', 'funcionario'].includes(role);
  }

  get userArea(): string {
    return this.authService.currentUser.area;
  }

  private loadCatalogs() {
    forkJoin({
      statuses: this.ticketsService.getTicketStatuses(),
      temas: this.ticketsService.getTemas(),
      areas: this.ticketsService.getAreas(),
      cuadrillas: this.ticketsService.getCuadrillas()
    }).subscribe(({ statuses, temas, areas, cuadrillas }) => {
      this.ticketStatuses.set(statuses);
      this.ticketProblems.set(temas);
      this.areas.set(areas);
      this.cuadrillas.set(cuadrillas);

      this.areaMap = new Map(areas.map(a => [a._id, a.name]));
      this.statusMap = new Map(statuses.map(s => [s._id!, s.name]));
      this.statusClassMap = new Map(statuses.map(s => [s._id!, s.cssClass]));
      this.problemMap = new Map(temas.map(t => [t._id!, t.name]));
    });
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

 openAssignmentDialog(ticket: Ticket) {
  const last = ticket.areaAssignments.at(-1);

  if (this.authService.currentUser.role?.name === 'funcionario') {
    // Debe ser su área
    if (!last || !this.sameId(last.area, this.authService.currentUser.area)) {
      alert('Este ticket no está asignado a tu área.');
      return;
    }
    // Y debe estar aceptado por área antes de gestionar cuadrilla
    if (!last.accepted) {
      alert('Primero debes aceptar el ticket del área.');
      return;
    }
  }

  // Reglas para cuadrilla/supervisor (las tuyas están bien):
  if (
    (this.authService.currentUser.role?.name === 'cuadrilla' ||
     this.authService.currentUser.role?.name === 'supervisor') &&
    !this.hasAreaResponded(ticket)
  ) {
    alert('El área debe responder primero para gestionar la asignación de cuadrilla.');
    return;
  }
  if (
    (this.authService.currentUser.role?.name === 'cuadrilla' ||
     this.authService.currentUser.role?.name === 'supervisor') &&
    !this.hasAreaAccepted(ticket)
  ) {
    alert('El área no aceptó el ticket. No procede la gestión de cuadrilla.');
    return;
  }

  this.dialog.open(TicketAssignmentDialog, {
    data: { ticket, areas: this.areas() },
    width: '600px'
  }).afterClosed().subscribe(refresh => { if (refresh) this.loadTickets(); });
}


  wasRejected(ticket: Ticket): boolean {
    return ticket.areaAssignments.some(
      a => a.assignedBy === this.authService.currentUser._id && a.rejectionReason
    );
  }

  private loadTickets() {
    this.ticketsService.getAllTickets(
      this.buildFilters(),
      this.page(),
      this.pageSize(),
      this.searchTerm(),
      this.sortColumn()
        ? { [this.sortColumn()]: this.sortDirection() === 'asc' ? 1 : -1 }
        : { updatedAt: -1 }
    ).subscribe({
      next: (response) => {
        this.ticketsSignal.set(response.data);
        this.totalTickets.set(response.total);
        this.ticketStatusCounts.set(response.statusCounts);
        this.ticketSemaforoCounts.set(response.semaforoCounts);
        console.log('Tickets cargados:', response.data);
      },
      error: (err) => {
        console.error('Error inesperado al cargar tickets:', err);
      }
    });
  }

  setSearch(value: string) {
    if (value !== this.searchTerm()) {
      this.searchSubject.next(value);
    }
  }

  setFilterStatus(value: string) {
    this.filterStatus.set(value);
    this.page.set(1);
    this.loadTickets();
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

  getSortIndicator(column: SortableTicketField): string {
    if (this.sortColumn() !== column) return '';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  sortBy(column: SortableTicketField) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.loadTickets();
  }

  getProblemIcon(problem: string): string {
    return {
      'Fuga de agua': 'water_drop',
      'Bache': 'construction',
      'Alumbrado': 'lightbulb',
      'Basura': 'delete',
    }[problem] ?? 'report_problem';
  }

getStatusIcon(statusSlug: string): string {
  const m: Record<string,string> = {
    new: 'fiber_new',
    assigned_area: 'assignment_ind',
    accepted_area: 'task_alt',
    rejected_area: 'block',
    assigned_crew: 'groups',
    accepted_crew: 'fact_check',
    rejected_crew: 'block',
    attended_by_crew: 'home_repair_service',
    attended_by_area: 'task',
    verified_closed: 'verified',
    reopened: 'published_with_changes',
  };
  return m[statusSlug] ?? 'help';
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
    this.page.set(pageIndex + 1);
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

  isClosed = (ticket: Ticket) => (this.getStage(ticket) === 'closed');
  countSemaforoColor = (color: 'verde' | 'ambar' | 'rojo') =>
    this.ticketSemaforoCounts()[color] ?? 0;

  getSemaforoColor(createdAt: string): 'verde' | 'ambar' | 'rojo' {
    const diffHours = (Date.now() - new Date(createdAt).getTime()) / 36e5;
    if (diffHours <= 120) return 'verde';
    if (diffHours <= 240) return 'ambar';
    return 'rojo';
  }

  getLatestAssignment(ticket: Ticket) {
    return ticket.areaAssignments.at(-1);
  }

  getAreaStatusIcon(ticket: Ticket): string {
    const assignment = this.getLatestAssignment(ticket);
    if (!assignment) return 'help';
    if (assignment.accepted) return 'check_circle';
    if (assignment.rejectionReason) return 'cancel';
    return 'schedule';
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
    if (crew.closure?.closedAt) return 'Cerrado por cuadrilla';
    if (crew.accepted) return 'Cuadrilla aceptó el ticket';
    if (crew.rejectionReason) return 'Cuadrilla rechazó el ticket';
    return 'Cuadrilla aún no ha respondido';
  }

  getCrewStatusIcon(ticket: Ticket): string {
    const crew = ticket.crewAssignments?.at(-1);
    if (!crew) return 'help';
    if (crew.closure?.closedAt) return 'task_alt'; // check “final”
    if (crew.accepted) return 'check_circle';
    if (crew.rejectionReason) return 'cancel';
    return 'schedule';
  }

  getCuadrillaName(crewId: string | undefined | null): string {
    if (!crewId) return 'Desconocida';
    const cuadrilla = this.cuadrillas().find(c => c._id === crewId);
    return cuadrilla?.name || 'No encontrada';
  }

  getCrewStatusIconColor(ticket: Ticket): string {
    const crew = ticket.crewAssignments?.at(-1);
    if (!crew) return 'icon-muted';
    if (crew.closure?.closedAt) return 'icon-success';
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
    return rejections.at(0);
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
      error: () => {
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

  countByStatus = (statusId: string) => this.ticketStatusCounts()[statusId] ?? 0;
}
