import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const cloned = req.clone({
    withCredentials: true
  });

  return next(cloned).pipe(
    catchError((err) => {

        console.error(`[Interceptor] ⚠️ HTTP Error ${err.status} from:`, req.url);
      return throwError(() => err);
    })
  );
};
