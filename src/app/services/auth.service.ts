import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, map, catchError, of } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { CoreService } from './core-service';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'access_token';
  private readonly roleKey = 'user';
  private _cachedToken: string | null = null;
  private userSubject = new BehaviorSubject<any>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(
    private readonly coreService: CoreService,
    private readonly router: Router,
    private readonly cookieService: CookieService,
    private readonly jwtHelper: JwtHelperService,
    private readonly http: HttpClient
  ) {
  }

  /** Carga el usuario desde el token si es válido */
  private loadSession(): void {
    const token = this.cookieService.get(this.tokenKey);
    console.log('Token cargado:', token);
    if (token) {
      this._cachedToken = token;
      const tokenData = this.getTokenData();
      this.userSubject.next(tokenData);
    } else {
      this.clearSession(); // pero sin redirigir
    }
  }

  /** Inicia sesión y redirige según el rol */
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(
      `${this.coreService.URI_API}auth/login`,
      { email, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        const token = response.token;
        const role = response.user.role;

        this._cachedToken = token;
        this.cookieService.set(this.tokenKey, token, 1, '/');
        this.cookieService.set(this.roleKey, role, 1, '/');
        this.userSubject.next(response.user);

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
  isLoggedIn(): Observable<boolean> {
    return this.http.get<{ authenticated: boolean; user?: any }>(
      `${this.coreService.URI_API}auth/check`,
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res.authenticated && res.user) {
          this.userSubject.next(res.user);
        } else {
          this.clearSession();
        }
      }),
      map(res => res.authenticated),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }


  /** Obtiene el token actual desde caché o cookie */
  private getToken(): string | null {
    if (!this._cachedToken) {
      this._cachedToken = this.cookieService.get(this.tokenKey);
    }
    return this._cachedToken;
  }

  /** Decodifica el token JWT */
  getTokenData(): any {
    const token = this.getToken();
    return token ? this.jwtHelper.decodeToken(token) : {};
  }

 

  /** Limpia sesión del cliente */
  public clearSession(): void {
    this.userSubject.next(null);
    this._cachedToken = null;
    this.cookieService.delete(this.tokenKey, '/');
    this.cookieService.delete(this.roleKey, '/');
  }

  /** Ruta por defecto según rol */
  public getDefaultRoute(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'tickets';
      default:
        return 'login';
    }
  }
}
