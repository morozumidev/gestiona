import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  login(email: string, password: string) {
    return this.http.post<any>('http://localhost:4000/api/auth/login', { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.userSubject.next(response.user);
        this.router.navigate(['/home']);
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