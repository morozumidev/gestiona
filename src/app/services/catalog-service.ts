import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CoreService } from './core-service';
import { CatalogSearchRequest, CatalogSearchResponse, Catalog } from '../models/Catalog';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);
  private readonly core = inject(CoreService);
  private readonly base = `${this.core.URI_API}catalogs`;

  search(body: CatalogSearchRequest): Observable<CatalogSearchResponse> {
    return this.http.post<CatalogSearchResponse>(`${this.base}/search`, body);
  }

  getById(id: string) { return this.http.get<Catalog>(`${this.base}/${id}`); }
  create(payload: Partial<Catalog>) { return this.http.post<Catalog>(this.base, payload); }
  update(id: string, payload: Partial<Catalog>) { return this.http.put<Catalog>(`${this.base}/${id}`, payload); }
  toggleActive(id: string, active: boolean) { return this.http.patch<Catalog>(`${this.base}/${id}/active`, { active }); }
  delete(id: string) { return this.http.delete<{ ok: true }>(`${this.base}/${id}`); }

  reorder(items: { id: string; order: number }[]) {
    return this.http.post<{ ok: true; count: number }>(`${this.base}/reorder`, { items });
  }

  getTypes() { return this.http.get<string[]>(`${this.base}/types`); }
}
