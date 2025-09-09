// catalogs.ts
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { startWith, map, debounceTime, distinctUntilChanged } from 'rxjs';
import { Catalog, CatalogSearchRequest, SortSpec } from '../../../models/Catalog';
import { CatalogsService } from '../../../services/catalog-service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CatalogDialog } from '../../dialogs/catalog-dialog/catalog-dialog';

@Component({
  selector: 'app-catalogs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Angular Material
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule,
  ],
  templateUrl: './catalogs.html',
  styleUrl: './catalogs.scss',
})
export class Catalogs {
  private readonly svc = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  // State
  rows = signal<Catalog[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  sort = signal<SortSpec>({ field: 'order', dir: 'asc' });
  loading = signal(false);
  types = signal<string[]>([]);
  displayedColumns = ['order', 'type', 'key', 'label', 'active', 'actions'] as const;

  // Filtros
  filtersForm = this.fb.group({
    type: [''],
    active: [''],
    search: [''],
  });

  // Search con debounce como signal
  private search$ = this.filtersForm.controls.search.valueChanges.pipe(
    startWith(this.filtersForm.controls.search.value ?? ''),
    map(v => (v ?? '').trim()),
    debounceTime(350),
    distinctUntilChanged()
  );
  private searchSig = toSignal(this.search$, { initialValue: '' });

  constructor() {
    this.fetchTypes();
    effect(() => { this.fetch(); });
  }

  private fetchTypes() {
    this.svc.getTypes().subscribe({
      next: t => this.types.set(t.sort()),
      error: () => this.types.set([]),
    });
  }

  fetch() {
    this.loading.set(true);
    const body: CatalogSearchRequest = {
      filters: {
        type: this.filtersForm.value.type || undefined,
        active:
          this.filtersForm.value.active === ''
            ? undefined
            : (this.filtersForm.value.active as unknown as string) === 'true',
      },
      search: this.searchSig(),
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sort(),
    };

    this.svc.search(body).subscribe({
      next: res => {
        this.rows.set(res.items);
        this.total.set(res.total);
        if (!this.types().length && res.types?.length) this.types.set(res.types.sort());
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  paginatorChange(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.pageSize.set(e.pageSize);
    this.fetch();
  }

  sortChange(ev: Sort) {
    if (!ev.active || !ev.direction) return;
    this.sort.set({ field: ev.active as SortSpec['field'], dir: ev.direction as SortSpec['dir'] });
    this.fetch();
  }

  clearSearch() { this.filtersForm.patchValue({ search: '' }); }

  new() {
    const ref = this.dialog.open(CatalogDialog, { data: { mode: 'create', types: this.types() }, width: '720px' });
    ref.afterClosed().subscribe(ok => { if (ok) this.fetch(); });
  }

  edit(row: Catalog) {
    const ref = this.dialog.open(CatalogDialog, { data: { mode: 'edit', catalog: row, types: this.types() }, width: '720px' });
    ref.afterClosed().subscribe(ok => { if (ok) this.fetch(); });
  }

  remove(row: Catalog) {
    if (!confirm(`¿Eliminar "${row.label}"?`)) return;
    this.svc.delete(row.id).subscribe({
      next: () => this.fetch(),
      error: e => alert(e?.error?.message ?? 'Error al eliminar'),
    });
  }

  toggleActive(row: Catalog) {
    this.svc.toggleActive(row.id, !row.active).subscribe({
      next: u => {
        this.rows.update(items => items.map(it => it.id === row.id ? { ...it, active: u.active } : it));
      },
      error: () => alert('No se pudo actualizar activo'),
    });
  }

  saveOrder() {
    const payload = this.rows().map(r => ({ id: r.id, order: r.order ?? 0 }));
    this.svc.reorder(payload).subscribe({
      next: () => alert('Orden guardado'),
      error: () => alert('No se pudo guardar el orden'),
    });
  }
}
