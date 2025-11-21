import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    CookieService,
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    // ❌ REMOVE provideServerRendering from here

    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([authInterceptor]),
      withFetch(),
    ),
    provideNativeDateAdapter(),
    JwtHelperService,
    { provide: JWT_OPTIONS, useValue: {} },
  ],
};
