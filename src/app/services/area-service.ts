import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { Area } from '../models/Area';
import { CoreService } from './core-service';

export type AreasSearchRequest = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: { field: 'name' | 'createdAt' | 'updatedAt'; direction: 'asc' | 'desc' };
};

export type AreasSearchResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: Area[];
};

export type AreaLight = Pick<Area, '_id' | 'name'>;

@Injectable({ providedIn: 'root' })
export class AreaService {
  private readonly http = inject(HttpClient);
  private readonly core = inject(CoreService);
  private readonly base = `${this.core.URI_API}areas`; // sin slash final; lo concatenamos abajo

  // ===== Estado reactivo =====
  readonly loading = signal(false);
  readonly lastQuery = signal<AreasSearchRequest>({
    page: 1,
    pageSize: 10,
    sort: { field: 'updatedAt', direction: 'desc' }
  });
  readonly lastResult = signal<AreasSearchResponse | null>(null);

  // Cache para catálogos ligeros
  readonly lightLoading = signal(false);
  readonly lightCache = signal<AreaLight[] | null>(null);

  // ===== Búsqueda =====
  /** Observable puro (no toca señales) */
  search$(req: AreasSearchRequest): Observable<AreasSearchResponse> {
    return this.http.post<AreasSearchResponse>(`${this.base}/search`, req);
  }

  /** Carga y actualiza señales (compat con tu uso actual) */
  search(req: AreasSearchRequest): Subscription {
    this.loading.set(true);
    this.lastQuery.set(req);
    return this.search$(req).subscribe({
      next: (res) => { this.lastResult.set(res); this.loading.set(false); },
      error:  ()   => { this.loading.set(false); }
    });
  }

  // ===== CRUD =====
  getById(id: string): Observable<Area> {
    return this.http.get<Area>(`${this.base}/${id}`);
  }

  create(payload: Pick<Area, 'name'>): Observable<Area> {
    return this.http.post<Area>(`${this.base}`, payload);
  }

  update(id: string, payload: Pick<Area, 'name'>): Observable<Area> {
    return this.http.put<Area>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  // ===== Catálogo ligero (POST /list, conforme a tu política de catálogos) =====
  /** Devuelve lista ligera sin tocar cache */
listAllLight(): Observable<AreaLight[]> {
  const catalogBase = `${this.core.URI_API}catalogs`;
  return this.http.post<AreaLight[]>(`${catalogBase}/areas`, {});
}

  /**
   * Alias que usa cache con signals. Ideal para selects globales.
   * Si ya está en cache, no vuelve a pegar al backend a menos que forces refresh.
   */
  getAll(options?: { refresh?: boolean }): Observable<AreaLight[]> {
    if (!options?.refresh && this.lightCache()) {
      // ya hay cache, regresamos observable "cold" con el valor actual
      return new Observable<AreaLight[]>((sub) => {
        sub.next(this.lightCache()!);
        sub.complete();
      });
    }
    this.lightLoading.set(true);
    const req$ = this.listAllLight();
    req$.subscribe({
      next: (list) => { this.lightCache.set(list); this.lightLoading.set(false); },
      error: ()     => { this.lightLoading.set(false); }
    });
    return req$;
  }
}
