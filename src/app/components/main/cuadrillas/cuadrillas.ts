import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CuadrillasService, CuadrillaSearchRequest } from '../../../services/cuadrillas-service';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CuadrillaDialog } from '../../dialogs/cuadrilla-dialog/cuadrilla-dialog';

@Component({
  selector: 'app-cuadrillas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './cuadrillas.html',
  styleUrls: ['./cuadrillas.scss']
})
export class Cuadrillas {
  private fb = inject(NonNullableFormBuilder);
  private svc = inject(CuadrillasService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  // Estado de tabla
  page = signal(1);
  pageSize = signal(10);
  sort = signal<{ field: 'name'|'createdAt'|'updatedAt'|'available'; dir: 'asc'|'desc' }>({ field: 'name', dir: 'asc' });

  // Control no-nulo → no emite null
  searchCtrl = this.fb.control('');
  search = toSignal(this.searchCtrl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged()
  ), { initialValue: '' });

  filters = signal<{ area?: string; available?: boolean; supervisor?: string }>({});

  rows = computed(() => this.svc.rows());
  total = computed(() => this.svc.total());

  displayedColumns = ['name', 'area', 'shift', 'supervisor', 'membersCount', 'available', 'createdAt', 'actions'];

  constructor() {
    // Efecto: recargar cuando cambian criterios
    effect(() => {
      const q = this.search().trim();
      const body: CuadrillaSearchRequest = {
        filters: this.filters(),
        search: q ? q : undefined, // evita string|null
        page: this.page(),
        pageSize: this.pageSize(),
        sort: this.sort(),
      };
      this.svc.search(body).subscribe({
        next: r => {
          if (r.ok) {
            this.svc.rows.set(r.rows);
            this.svc.total.set(r.total);
          }
        },
        error: () => this.snack.open('Error al cargar cuadrillas', 'Cerrar', { duration: 3000 })
      });
    });
  }

  // ==== Helpers de UI (evitan lógica compleja en template) ====
  clearSearch() { this.searchCtrl.setValue(''); }

  setSort(field: 'name'|'createdAt'|'updatedAt'|'available') {
    const { field: f, dir } = this.sort();
    const nextDir = f === field && dir === 'asc' ? 'desc' : 'asc';
    this.sort.set({ field, dir: nextDir });
  }

  setAvailableFilter(val: boolean | null) {
    // null = "todas" → elimina el filtro
    this.filters.update(f => {
      const next = { ...f };
      if (val === null) delete next.available;
      else next.available = val;
      return next;
    });
    this.page.set(1);
  }

  paginatorChange(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.pageSize.set(e.pageSize);
  }

  create() {
    const ref = this.dialog.open(CuadrillaDialog, { width: '720px', data: null });
    ref.afterClosed().subscribe(res => {
      if (res?.ok) {
        this.snack.open('Cuadrilla creada', 'OK', { duration: 2000 });
        this.page.set(1);
      }
    });
  }

  edit(row: any) {
    const ref = this.dialog.open(CuadrillaDialog, { width: '720px', data: row });
    ref.afterClosed().subscribe(res => {
      if (res?.ok) this.snack.open('Cuadrilla actualizada', 'OK', { duration: 2000 });
    });
  }

  toggle(row: any) {
    this.svc.toggleAvailable(row._id, !row.available).subscribe({
      next: (r) => {
        if (r.ok) {
          row.available = !row.available;
          this.snack.open('Disponibilidad actualizada', 'OK', { duration: 2000 });
        }
      },
      error: () => this.snack.open('Error al cambiar disponibilidad', 'Cerrar', { duration: 3000 })
    });
  }

  remove(row: any) {
    if (!confirm(`¿Eliminar cuadrilla "${row.name}"?`)) return;
    this.svc.delete(row._id).subscribe({
      next: (r) => {
        if (r.ok) {
          this.snack.open('Cuadrilla eliminada', 'OK', { duration: 2000 });
          this.page.set(1);
        }
      },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 })
    });
  }
}
