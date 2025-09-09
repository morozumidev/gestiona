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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { UserService, UsersSearchRequest } from '../../../services/user-service';
import { User } from '../../../models/User';
import { Area } from '../../../models/Area';
import { Role } from '../../../models/Role';
import { TicketsService } from '../../../services/tickets-service';

@Component({
  standalone: true,
  selector: 'app-users-list',
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Angular Material (importes explícitos, uno por línea)
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
  ],
})
export class UsersList {
  private readonly service = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly ticketsService = inject(TicketsService);

  displayedColumns = ['name', 'email', 'role', 'area', 'actions'];

  loading = signal(false);
  items = signal<User[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  sortField = signal<string>('createdAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  protected areas = signal<Area[]>([]);
  protected roles = signal<Role[]>([]);

  // Form reactivo de filtros
  filtersForm = this.fb.group({
    search: ['' as string],
    role: ['' as string],   // texto (e.g., "admin")
    area: ['' as string],   // ObjectId en string
  });

  // Normaliza valores de filtro para no enviar vacíos
  private normalizeFilters = (v: { search?: any; role?: any; area?: any }) => ({
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
  });

  // valueChanges → signal para reaccionar en computed
  private filtersSig = toSignal(
    this.filtersForm.valueChanges.pipe(
      startWith(this.filtersForm.value),
      map(v => this.normalizeFilters(v as any)),
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ),
    { initialValue: this.normalizeFilters(this.filtersForm.value as any) }
  );

  // Query siempre dependiente de señales
  query = computed<UsersSearchRequest>(() => ({
    page: this.page(),
    pageSize: this.pageSize(),
    search: this.filtersSig().search,
    filters: {
      role: this.filtersSig().role, // string (p.ej. 'admin')
      area: this.filtersSig().area, // ObjectId string
    },
    sort: {
      field: this.sortField(),
      direction: this.sortDirection(),
    },
  }));

  constructor() {
    // Auto-fetch en cambios de query
    effect(() => {
      const q = this.query();
      this.fetch(q);
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
    this.service.search(q).subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
  }

  clearFilters() {
    // Volver a valores por defecto (vacíos) para activar "Todos"
    this.filtersForm.setValue({ search: '', role: '', area: '' }, { emitEvent: true });
    this.page.set(1);
  }

  newUser() {
    this.router.navigate(['/user-form', 'new']);
  }

  editUser(u: User) {
    this.router.navigate(['/user-form', (u as any)._id]);
  }

  deleteUser(u: User) {
    if (!confirm(`¿Eliminar a ${u.name}?`)) return;
    this.service.remove((u as any)._id).subscribe({
      next: () => this.page.set(1), // refresca por effect
    });
  }
}
