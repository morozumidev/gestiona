// gestiona/src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, map, catchError, of, switchMap } from 'rxjs';
import { CoreService } from './core-service';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly roleKey = 'role';
  private userSubject = new BehaviorSubject<any>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(
    private readonly coreService: CoreService,
    private readonly router: Router,
    private readonly cookieService: CookieService,
    private readonly http: HttpClient
  ) { }

  /** Inicia sesión y redirige según el rol */
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(
      `${this.coreService.URI_API}auth/login`,
      { email, password },
      { withCredentials: true }
    ).pipe(
      switchMap(() =>
        this.http.get<any>(`${this.coreService.URI_API}auth/me`, { withCredentials: true })
      ),
      tap(user => {
        const role = user.role?.name || 'user';
        this.cookieService.set(this.roleKey, role, 1, '/');
        this.userSubject.next(user);
        const redirectRoute = this.getDefaultRoute(role);
        this.router.navigate([redirectRoute]);
      })
    );
  }

  /** Cierra sesión y redirige a login */
  logout(): void {
    this.clearSession();
    this.http.post(`${this.coreService.URI_API}auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  /** Valida con backend si sigue logueado */
  isLoggedIn(): Observable<{ authenticated: boolean; user: any | null }> {
    return this.http.get<{ authenticated: boolean; user?: any }>(
      `${this.coreService.URI_API}auth/check`,
      { withCredentials: true }
    ).pipe(
      map(res => {
        if (res.authenticated && res.user) {
          this.userSubject.next(res.user);
          return { authenticated: true, user: res.user };
        } else {
          this.clearSession();
          return { authenticated: false, user: null };
        }
      }),
      catchError(() => {
        this.clearSession();
        return of({ authenticated: false, user: null });
      })
    );
  }


  /** Limpia sesión del cliente */
public clearSession(): void {
  this.userSubject.next(null);

  this.cookieService.delete(this.roleKey, '/');
  this.cookieService.delete('gc_token', '/');


}


  /** Ruta por defecto según rol */
  public getDefaultRoute(role: string): string {
    switch (role) {
      case 'admin':
        return 'tickets';
      default:
        return 'tickets';
    }
  }
  get currentUser(): any {
    return this.userSubject.getValue();
  }
}
