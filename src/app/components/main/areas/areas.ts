import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { debounceTime, distinctUntilChanged, map, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AreaService } from '../../../services/area-service';
import { Area } from '../user-form/user-form';
import { AreaDialog } from '../../dialogs/area-dialog/area-dialog';
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // Material (importes explícitos, uno por línea)
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './areas.html',
  styleUrl: './areas.scss'
})
export class Areas {
  private readonly svc = inject(AreaService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  displayedColumns = ['name', 'createdAt', 'updatedAt', 'actions'] as const;

  // UI state
  readonly searchCtrl = this.fb.control<string>('', { nonNullable: true });
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly sortField = signal<'name' | 'createdAt' | 'updatedAt'>('updatedAt');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  // Data (desde el servicio)
  readonly loading = computed(() => this.svc.loading());
  readonly rows = computed(() => this.svc.lastResult()?.items ?? []);
  readonly total = computed(() => this.svc.lastResult()?.total ?? 0);

  constructor() {
    // Primera carga
    this.fetch();

    // Búsqueda debounced con RxJS (reacciona a cambios del FormControl)
    this.searchCtrl.valueChanges.pipe(
      map(v => (v ?? '').trim()),
      // Evita llamadas por espacios o repeticiones
      distinctUntilChanged(),
      debounceTime(350),
      tap(() => this.page.set(1)),
      tap(() => this.fetch()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  /** Ejecuta el request al backend con el estado actual */
  fetch() {
    this.svc.search({
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.searchCtrl.value?.trim() || undefined,
      sort: { field: this.sortField(), direction: this.sortDir() },
    });
  }

  /** Limpiar búsqueda (sin esperar el debounce para que se sienta inmediato) */
  clearSearch() {
    this.searchCtrl.setValue('');
    this.page.set(1);
    this.fetch();
  }

  onPage(ev: PageEvent) {
    this.page.set(ev.pageIndex + 1);
    this.pageSize.set(ev.pageSize);
    this.fetch();
  }

  sortBy(field: 'name' | 'createdAt' | 'updatedAt') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.fetch();
  }

  /** Indicador visual del sort */
  getSortIndicator(field: 'name' | 'createdAt' | 'updatedAt'): 'asc' | 'desc' | '' {
    if (this.sortField() !== field) return '';
    return this.sortDir();
  }

  create() {
    const ref = this.dialog.open(AreaDialog, {
      width: '480px',
      data: { mode: 'create' as const },
      autoFocus: 'dialog',
      disableClose: true,
    });
    ref.afterClosed().subscribe(res => {
      if (res?.ok) {
        this.snack.open('Área creada correctamente', 'OK', { duration: 2500 });
        this.fetch();
      }
    });
  }

  edit(area: Area) {
    const ref = this.dialog.open(AreaDialog, {
      width: '480px',
      data: { mode: 'edit' as const, area },
      autoFocus: 'dialog',
      disableClose: true,
    });
    ref.afterClosed().subscribe(res => {
      if (res?.ok) {
        this.snack.open('Área actualizada', 'OK', { duration: 2500 });
        this.fetch();
      }
    });
  }

  remove(area: Area) {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '460px',
      data: {
        title: 'Eliminar área',
        message: `¿Deseas eliminar el área "${area.name}"? Se validará que no esté en uso por Cuadrillas, Temas o Tickets.`,
        confirmText: 'Eliminar',
        type: 'danger'
      },
      autoFocus: 'dialog',
      disableClose: true,
    });

    ref.afterClosed().subscribe(ans => {
      if (!ans?.ok) return;
      this.svc.delete(area._id).subscribe({
        next: () => {
          this.snack.open('Área eliminada', 'OK', { duration: 2500 });
          // Ajuste de página si quedó vacía
          const curr = this.page();
          const after = (this.total() - 1) - ((curr - 1) * this.pageSize());
          if (after <= 0 && curr > 1) this.page.set(curr - 1);
          this.fetch();
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'No se pudo eliminar (puede estar en uso)';
          this.snack.open(msg, 'OK', { duration: 3500 });
        }
      });
    });
  }
}
