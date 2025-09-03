import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/User';
import { CoreService } from './core-service';

export type UsersSearchRequest = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
  filters?: { role?: string; area?: string; status?: 'active' | 'inactive' };
};

export type UsersSearchResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: User[];
};

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly core = inject(CoreService);
  private readonly http = inject(HttpClient);

  // Asegúrate de que URI_API termine con "/" o usa esta base explícita:
  private readonly base = `${this.core.URI_API}users/`;

  me(): Observable<User> {
    return this.http.get<User>(`${this.base}me/profile`);
  }

  updateMe(payload: Partial<Pick<User, 'name' | 'first_lastname' | 'second_lastname' | 'phone' | 'area'>>): Observable<User> {
    return this.http.put<User>(`${this.base}me/profile`, payload);
  }

  changeMyPassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}me/password`, { currentPassword, newPassword });
  }

  search(req: UsersSearchRequest): Observable<UsersSearchResponse> {
    return this.http.post<UsersSearchResponse>(`${this.base}search`, req);
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.base}${id}`);
  }

  create(payload: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'status'> & { password: string; status?: 'active' | 'inactive' }): Observable<User> {
    return this.http.post<User>(`${this.base}createUser`, payload);
  }

  update(id: string, payload: Partial<User> & { password?: string }): Observable<User> {
    return this.http.put<User>(`${this.base}${id}`, payload);
  }

  remove(id: string): Observable<{ message: string; user: User }> {
    return this.http.delete<{ message: string; user: User }>(`${this.base}${id}`);
  }
}
