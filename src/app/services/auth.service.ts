import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { CoreService } from './core-service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  

  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  constructor(private cookieService: CookieService,private http:HttpClient,private router:Router,private coreService:CoreService) { }
  private cookieKey = 'user';
  login(email: string, password: string) {
    return this.http.post<any>(this.coreService.URI_API+'auth/login', { email, password }).pipe(
      tap(response => {
        this.userSubject.next(response.user);
        this.cookieService.set(this.cookieKey, response.user.role, 1);
        this.router.navigate(['/tickets']);
      })
    );
  }

  logout() {
    localStorage.clear();
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  get token() {
    return localStorage.getItem('token');
  }

  get role() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.role || null;
  }

  isLoggedIn() {
    return !!this.token;
  }
}