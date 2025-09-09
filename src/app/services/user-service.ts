import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { User } from '../models/User';
import { CoreService } from './core-service';

export type UsersSearchRequest = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
  filters?: { role?: string; area?: string; status?: 'active' | 'inactive' };
};
export type UserLight = {
  _id: string;
  name: string;
  first_lastname?: string;
  second_lastname?: string;
  email?: string;
  phone?: string;
  role?: any; // id u objeto poblado
  area?: any; // id u objeto poblado
};
export type UsersSearchResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: User[];
};

/** Subtipo básico para catálogos / selects */
export type UserBasic = Pick<
  User,
  '_id' | 'name' | 'first_lastname' | 'second_lastname' | 'email' | 'phone' | 'role' | 'area' | 'createdAt' | 'updatedAt'
>;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly core = inject(CoreService);
  private readonly http = inject(HttpClient);

  // Base limpia, apoyada en tu CoreService (sin hardcode)
  private readonly base = `${this.core.URI_API}users/`;

  // ======== Perfil propio ========
  me(): Observable<User> {
    return this.http.get<User>(`${this.base}me/profile`);
  }

  updateMe(payload: Partial<Pick<User, 'name' | 'first_lastname' | 'second_lastname' | 'phone' | 'area'>>): Observable<User> {
    return this.http.put<User>(`${this.base}me/profile`, payload);
  }

  changeMyPassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}me/password`, { currentPassword, newPassword });
  }

  // ======== CRUD general ========
  search(req: UsersSearchRequest): Observable<UsersSearchResponse> {
    return this.http.post<UsersSearchResponse>(`${this.base}search`, req);
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.base}${id}`);
  }

  create(
    payload: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'status'> & { password: string; status?: 'active' | 'inactive' }
  ): Observable<User> {
    return this.http.post<User>(`${this.base}createUser`, payload);
  }

  update(id: string, payload: Partial<User> & { password?: string }): Observable<User> {
    return this.http.put<User>(`${this.base}${id}`, payload);
  }

  remove(id: string): Observable<{ message: string; user: User }> {
    return this.http.delete<{ message: string; user: User }>(`${this.base}${id}`);
  }

  // ======== Utilidades para catálogos (para Cuadrillas, etc.) ========
  /** 
   * Devuelve una lista “básica” de usuarios para selects (id, nombre, apellidos, contacto).
   * Internamente usa /users/search con pageSize controlado y orden por nombre asc.
   */
  listBasic(
    filters?: UsersSearchRequest['filters'],
    options?: { search?: string; limit?: number; sortField?: string; sortDir?: 'asc' | 'desc' }
  ): Observable<UserBasic[]> {
    const pageSize = options?.limit ?? 500; // ajustable según catálogo
    const req: UsersSearchRequest = {
      page: 1,
      pageSize,
      search: options?.search ?? '',
      sort: { field: options?.sortField ?? 'name', direction: options?.sortDir ?? 'asc' },
      filters,
    };
    return this.search(req).pipe(
      map((r) =>
        (r.items ?? []).map((u) => ({
          _id: u._id!,
          name: u.name,
          first_lastname: u.first_lastname,
          second_lastname: u.second_lastname,
          email: u.email,
          phone: u.phone,
          role: u.role,
          area: u.area,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }))
      )
    );
  }

  searchLight(req: UsersSearchRequest): Observable<UserLight[]> {
    return this.search(req).pipe(
      map((r) => Array.isArray(r.items) ? r.items : []),
      map((items: User[]) =>
        items
          .filter(u => typeof u._id === 'string' && !!u._id) // garantiza _id
          .map(u => ({
            _id: u._id as string,
            name: u.name ?? '',
            first_lastname: u.first_lastname,
            second_lastname: u.second_lastname,
            email: u.email,
            phone: u.phone,
            role: u.role,
            area: u.area,
          }))
      )
    );
  }

  /** (Opcional) Si usas getAllBasic para catálogos, que también devuelva UserLight[] */
  getAllBasic(limit = 200, search?: string): Observable<UserLight[]> {
    const req: UsersSearchRequest = {
      page: 1,
      pageSize: Math.min(Math.max(limit, 1), 200),
      ...(search ? { search } : {}),
      sort: { field: 'name', direction: 'asc' },
      // filters: { status: 'active' }, // descomenta si tu backend lo requiere
    };
    return this.searchLight(req);
  }


  /** Lista básica filtrada por área (para cuadrillas de un área). */
  listByAreaBasic(areaId: string, options?: { limit?: number; search?: string }): Observable<UserBasic[]> {
    return this.listBasic({ area: areaId }, { limit: options?.limit, search: options?.search });
  }

  /** Lista básica filtrada por rol (si quieres limitar a supervisores, etc.). */
  listByRoleBasic(roleId: string, options?: { limit?: number; search?: string }): Observable<UserBasic[]> {
    return this.listBasic({ role: roleId }, { limit: options?.limit, search: options?.search });
  }

  /** Lista básica por estado (activos/inactivos) si es útil para catálogos. */
  listByStatusBasic(status: 'active' | 'inactive', options?: { limit?: number; search?: string }): Observable<UserBasic[]> {
    return this.listBasic({ status }, { limit: options?.limit, search: options?.search });
  }
}
