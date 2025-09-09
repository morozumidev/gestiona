import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { startWith, map, debounceTime, distinctUntilChanged } from 'rxjs';
import { RolesSearchRequest, RolesSearchResponse } from '../../../models/Role';
import { RoleService } from '../../../services/role-service';
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';
import { Role } from '../user-form/user-form';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { RoleDialog } from '../../dialogs/role-dialog/role-dialog';

@Component({
  selector: 'app-roles',
  imports: [   CommonModule,
    ReactiveFormsModule,

    // Material
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,],
  templateUrl: './roles.html',
  styleUrl: './roles.scss'
})
export class Roles {
  private fb = inject(FormBuilder);
  private rolesSvc = inject(RoleService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  // Estado base
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly rows = signal<Role[]>([]);
  readonly total = signal<number>(0);

  // Paginación y orden
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly sort = signal<{ field: string; direction: 'asc' | 'desc' }>({ field: 'createdAt', direction: 'desc' });

  // Búsqueda con debounce (FormControl + toSignal)
  readonly searchCtrl = new FormControl<string>('', { nonNullable: true });
  private searchValue = toSignal(
    this.searchCtrl.valueChanges.pipe(
      startWith(this.searchCtrl.value),
      map(v => v?.trim() ?? ''),
      debounceTime(350),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // Resumen/contadores
  readonly filteredCount = computed(() => this.rows().length);

  // Auto-carga al cambiar page/pageSize/search/sort
  private _fetchEff = effect(() => {
    const req: RolesSearchRequest = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.searchValue(),
      sort: this.sort(),
    };
    this.fetch(req);
  });

  // Cargar
  fetch(req: RolesSearchRequest) {
    this.loading.set(true);
    this.error.set(null);
    this.rolesSvc.search(req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: RolesSearchResponse) => {
        this.rows.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (e) => {
        console.error('[roles] search error', e);
        this.error.set('Ocurrió un error al cargar roles');
        this.loading.set(false);
      },
    });
  }

  // UI handlers
  paginatorChange(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.pageSize.set(e.pageSize);
  }

  sortBy(field: string) {
    const s = this.sort();
    const dir: 'asc' | 'desc' =
      s.field === field ? (s.direction === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sort.set({ field, direction: dir });
  }

  create() {
    const ref = this.dialog.open(RoleDialog, { width: '520px', data: { mode: 'create' } });
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => {
      if (ok) {
        this.snack.open('Rol creado', 'OK', { duration: 2200 });
        this.fetch({
          page: this.page(),
          pageSize: this.pageSize(),
          search: this.searchValue(),
          sort: this.sort(),
        });
      }
    });
  }

  edit(row: Role) {
    const ref = this.dialog.open(RoleDialog, { width: '520px', data: { mode: 'edit', role: row } });
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => {
      if (ok) {
        this.snack.open('Rol actualizado', 'OK', { duration: 2200 });
        this.fetch({
          page: this.page(),
          pageSize: this.pageSize(),
          search: this.searchValue(),
          sort: this.sort(),
        });
      }
    });
  }

  remove(row: Role) {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Eliminar rol',
        message: `¿Eliminar el rol <strong>${row.name}</strong>? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        confirmColor: 'warn'
      }
    });
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (!confirmed) return;
      this.loading.set(true);
      this.rolesSvc.delete(row._id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.snack.open('Rol eliminado', 'OK', { duration: 2200 });
          // Si al eliminar te quedas sin filas en la página actual, retrocede una página
          const remaining = this.rows().length - 1;
          const totalAfter = this.total() - 1;
          const maxPage = Math.max(1, Math.ceil(totalAfter / this.pageSize()));
          if (remaining === 0 && this.page() > maxPage) this.page.set(maxPage);
          // Refresca
          this.fetch({
            page: this.page(),
            pageSize: this.pageSize(),
            search: this.searchValue(),
            sort: this.sort(),
          });
        },
        error: (e) => {
          console.error('[roles] delete error', e);
          this.snack.open('No se pudo eliminar el rol', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
        }
      });
    });
  }
}