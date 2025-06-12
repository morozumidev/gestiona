import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class Session {
 public cookieKey = 'user';

  constructor(private cookieService: CookieService) {}

  setUser(username: string): void {
    this.cookieService.set(this.cookieKey, username, 1); // 1 día de duración
  }

  getUser(): string | null {
    const user = this.cookieService.get(this.cookieKey);
    return user || null;
  }

  clearUser(): void {
    this.cookieService.delete(this.cookieKey);
  }
}
