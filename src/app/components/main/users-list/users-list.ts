import { Component, effect, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';

import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, debounceTime, distinctUntilChanged, map, finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { UserService, UsersSearchRequest } from '../../../services/user-service';
import { User } from '../../../models/User';
import { Area } from '../../../models/Area';
import { Role } from '../../../models/Role';
import { TicketsService } from '../../../services/tickets-service';
import { UsersOverview } from '../../../models/UserOverview';

type StatusFilter = '' | 'active' | 'inactive';

@Component({
  standalone: true,
  selector: 'app-users-list',
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatCheckboxModule,
  ],
})
export class UsersList {
  private readonly service = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly ticketsService = inject(TicketsService);

  displayedColumns = ['select', 'name', 'contact', 'role', 'area', 'status', 'activity', 'actions'];

  loading = signal(false);
  actionBusy = signal(false);
  errorMessage = signal<string | null>(null);
  items = signal<User[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  sortField = signal<string>('createdAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  protected areas = signal<Area[]>([]);
  protected roles = signal<Role[]>([]);
  protected overview = signal<UsersOverview | null>(null);

  selectedIds = signal<Set<string>>(new Set());
  selectedUser = signal<User | null>(null);
  menuUser: User | null = null;

  filtersForm = this.fb.group({
    search: ['' as string],
    role: ['' as string],
    area: ['' as string],
    status: ['' as StatusFilter],
  });

  private normalizeFilters = (v: { search?: any; role?: any; area?: any; status?: any }) => ({
    search:
      typeof v?.search === 'string' && v.search.trim().length > 0
        ? v.search.trim()
        : undefined,
    role:
      typeof v?.role === 'string' && v.role.trim().length > 0
        ? v.role.trim()
        : undefined,
    area:
      typeof v?.area === 'string' && v.area.trim().length > 0
        ? v.area.trim()
        : undefined,
    status:
      typeof v?.status === 'string' && v.status.trim().length > 0
        ? (v.status as 'active' | 'inactive')
        : undefined,
  });

  private filtersSig = toSignal(
    this.filtersForm.valueChanges.pipe(
      startWith(this.filtersForm.value),
      map(v => this.normalizeFilters(v as any)),
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ),
    { initialValue: this.normalizeFilters(this.filtersForm.value as any) }
  );

  query = computed<UsersSearchRequest>(() => ({
    page: this.page(),
    pageSize: this.pageSize(),
    search: this.filtersSig().search,
    filters: {
      role: this.filtersSig().role,
      area: this.filtersSig().area,
      status: this.filtersSig().status,
    },
    sort: {
      field: this.sortField(),
      direction: this.sortDirection(),
    },
  }));

  selectionState = computed(() => {
    const ids = (this.items() ?? []).map(u => u._id).filter(Boolean) as string[];
    const selected = this.selectedIds();
    const selectedCount = ids.filter(id => selected.has(id)).length;
    return {
      total: ids.length,
      selected: selectedCount,
      all: ids.length > 0 && selectedCount === ids.length,
      some: selectedCount > 0 && selectedCount < ids.length,
    };
  });

  stats = computed(() => {
    const data = this.overview();
    return {
      total: data?.total ?? this.total(),
      active: data?.active ?? 0,
      inactive: data?.inactive ?? 0,
      recent7: data?.recent?.last7 ?? 0,
      recent30: data?.recent?.last30 ?? 0,
    };
  });

  constructor() {
    effect(() => {
      this.filtersSig();
      if (this.page() !== 1) this.page.set(1);
    });

    effect(() => {
      const q = this.query();
      this.fetch(q);
      this.loadOverview(q);
      this.selectedIds.set(new Set());
      this.selectedUser.set(null);
    });

    effect(() => {
      const current = this.selectedUser();
      if (!current?._id) return;
      const updated = this.items().find(u => u._id === current._id);
      if (updated && updated !== current) {
        this.selectedUser.set(updated);
      }
    });

    this.loadCatalogos();
  }

  private loadCatalogos() {
    this.ticketsService.getAreas().subscribe({
      next: data => this.areas.set(data ?? []),
    });
    this.ticketsService.getRoles().subscribe({
      next: data => this.roles.set(data ?? []),
    });
  }

  private fetch(q: UsersSearchRequest) {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.search(q).subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });
  }

  private loadOverview(q: UsersSearchRequest) {
    this.service.getOverview(q).subscribe({
      next: (data) => this.overview.set(data ?? null),
      error: () => this.overview.set(null),
    });
  }

  refresh() {
    this.fetch(this.query());
    this.loadOverview(this.query());
  }

  onPage(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.pageSize.set(e.pageSize);
  }

  onSort(field: string) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
  }

  clearFilters() {
    this.filtersForm.setValue({ search: '', role: '', area: '', status: '' }, { emitEvent: true });
    this.page.set(1);
  }

  setStatusFilter(status: StatusFilter) {
    this.filtersForm.controls.status.setValue(status, { emitEvent: true });
    this.page.set(1);
  }

  newUser() {
    this.router.navigate(['/user-form', 'new']);
  }

  editUser(u: User) {
    this.router.navigate(['/user-form', (u as any)._id]);
  }

  selectUser(u: User) {
    this.selectedUser.set(u);
  }

  clearSelection() {
    this.selectedUser.set(null);
  }

  setMenuUser(u: User) {
    this.menuUser = u;
  }

  toggleRowSelection(u: User) {
    const id = u._id;
    if (!id) return;
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  toggleAllCurrent() {
    const ids = (this.items() ?? []).map(u => u._id).filter(Boolean) as string[];
    const next = new Set(this.selectedIds());
    const allSelected = ids.length > 0 && ids.every(id => next.has(id));

    if (allSelected) {
      ids.forEach(id => next.delete(id));
    } else {
      ids.forEach(id => next.add(id));
    }

    this.selectedIds.set(next);
  }

  isSelected(u: User) {
    return !!u._id && this.selectedIds().has(u._id);
  }

  statusLabel(u: User): string {
    return u.status === 'inactive' ? 'Inactivo' : 'Activo';
  }

  statusTone(u: User): 'active' | 'inactive' {
    return u.status === 'inactive' ? 'inactive' : 'active';
  }

  roleName(u: User): string {
    const role = u.role;
    if (!role) return 'Sin rol';
    if (typeof role === 'string') {
      return this.roles().find(r => r._id === role)?.name ?? 'Sin rol';
    }
    return role.name ?? 'Sin rol';
  }

  areaName(u: User): string {
    const area = u.area;
    if (!area) return 'Sin área';
    if (typeof area === 'string') {
      return this.areas().find(a => a._id === area)?.name ?? 'Sin área';
    }
    return area.name ?? 'Sin área';
  }

  toggleStatus(u: User) {
    if (!u._id) return;
    const next = u.status === 'inactive' ? 'active' : 'inactive';
    this.actionBusy.set(true);
    this.service.update(u._id, { status: next } as any).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => this.refresh(),
    });
  }

  resetPassword(u: User) {
    if (!u._id) return;
    const newPassword = prompt(`Nueva contraseña para ${u.name}:`);
    if (!newPassword || newPassword.trim().length < 8) return;

    this.actionBusy.set(true);
    this.service.update(u._id, { password: newPassword.trim() } as any).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => this.refresh(),
    });
  }

  deleteUser(u: User) {
    if (!u._id) return;
    if (!confirm(`¿Eliminar a ${u.name}?`)) return;

    this.actionBusy.set(true);
    this.service.remove(u._id).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => this.refresh(),
    });
  }

  bulkSetStatus(status: 'active' | 'inactive') {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    if (!confirm(`¿Aplicar estado "${status}" a ${ids.length} usuarios?`)) return;

    this.actionBusy.set(true);
    forkJoin(ids.map(id => this.service.update(id, { status } as any))).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => {
        this.clearBulkSelection();
        this.refresh();
      },
    });
  }

  bulkAssignRole(roleId: string) {
    const ids = Array.from(this.selectedIds());
    if (!ids.length || !roleId) return;
    if (!confirm(`¿Asignar rol a ${ids.length} usuarios?`)) return;

    this.actionBusy.set(true);
    forkJoin(ids.map(id => this.service.update(id, { role: roleId } as any))).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => {
        this.clearBulkSelection();
        this.refresh();
      },
    });
  }

  bulkAssignArea(areaId: string) {
    const ids = Array.from(this.selectedIds());
    if (!ids.length || !areaId) return;
    if (!confirm(`¿Asignar área a ${ids.length} usuarios?`)) return;

    this.actionBusy.set(true);
    forkJoin(ids.map(id => this.service.update(id, { area: areaId } as any))).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => {
        this.clearBulkSelection();
        this.refresh();
      },
    });
  }

  bulkDelete() {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    if (!confirm(`¿Eliminar ${ids.length} usuarios seleccionados?`)) return;

    this.actionBusy.set(true);
    forkJoin(ids.map(id => this.service.remove(id))).pipe(
      finalize(() => this.actionBusy.set(false))
    ).subscribe({
      next: () => {
        this.clearBulkSelection();
        this.refresh();
      },
      error: () => this.actionBusy.set(false),
    });
  }

  clearBulkSelection() {
    this.selectedIds.set(new Set());
  }
}
