import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Role, RolesSearchRequest, RolesSearchResponse } from '../models/Role';
import { CoreService } from './core-service';

// Toma baseUrl de environments. No hardcode.


@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
  private readonly core = inject(CoreService);
  private API_BASE = `${this.core.URI_API}roles`;
  // Signals útiles si quieres cachear en memoria (opcional)
  readonly cache = signal<Role[] | null>(null);

  search(req: RolesSearchRequest): Observable<RolesSearchResponse> {
    return this.http.post<RolesSearchResponse>(`${this.API_BASE}/search`, req).pipe(
      map(res => {
        // cachea opcionalmente la página actual
        this.cache.set(res.items);
        return res;
      })
    );
  }

  getById(id: string) {
    return this.http.get<Role>(`${this.API_BASE}/${id}`);
  }

  create(payload: Omit<Role, '_id' | 'createdAt' | 'updatedAt'>) {
    return this.http.post<Role>(`${this.API_BASE}`, payload);
  }

  update(id: string, payload: Partial<Omit<Role, '_id'>>) {
    return this.http.put<Role>(`${this.API_BASE}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<{ message: string; role?: Role }>(`${this.API_BASE}/${id}`);
  }
}
