import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CoreService } from './core-service';

export interface CuadrillaSearchRequest {
  filters?: { area?: string; available?: boolean; supervisor?: string };
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: { field: 'name'|'createdAt'|'updatedAt'|'available'; dir: 'asc'|'desc' };
}

export interface CuadrillaDto {
  _id?: string;
  name: string;
  supervisor: string;
  members: string[];
  available: boolean;
  shift?: string | null; // ⬅️ aquí
  area: string;
}

@Injectable({ providedIn: 'root' })
export class CuadrillasService {
  private http = inject(HttpClient);
  private core = inject(CoreService);

  private base = this.core.URI_API + 'cuadrillas/';

  rows = signal<any[]>([]);
  total = signal(0);

  search(body: CuadrillaSearchRequest) {
    return this.http.post<{ ok: boolean; rows: any[]; total: number; page: number; pageSize: number }>(this.base + 'search', body);
  }

  getById(id: string) {
    return this.http.post<{ ok: boolean; cuadrilla: any }>(this.base + 'getById', { id });
  }

  create(dto: CuadrillaDto) {
    return this.http.post<{ ok: boolean; cuadrilla: any }>(this.base + 'create', dto);
  }

  update(id: string, partial: Partial<CuadrillaDto>) {
    return this.http.post<{ ok: boolean; cuadrilla: any }>(this.base + 'update', { id, ...partial });
  }

  toggleAvailable(id: string, available: boolean) {
    return this.http.post<{ ok: boolean }>(this.base + 'toggleAvailable', { id, available });
  }

  delete(id: string) {
    return this.http.post<{ ok: boolean }>(this.base + 'delete', { id });
  }
    /** 👉 Catálogo: cuadrillas por área (para detectar usuarios ocupados) */
  listByAreaLight(areaId: string) {
    return this.http.post<Array<{ _id: string; name: string; supervisor: string; members: string[] }>>(
      `${this.core.URI_API}catalogs/cuadrillas`,
      { areaId }
    );
  }
  listBusyUserIds(areaId?: string) {
  return this.http.post<{ ids: string[] }>(
    `${this.core.URI_API}catalogs/cuadrillas/busy`,
    areaId ? { areaId } : {}
  );
}
}
