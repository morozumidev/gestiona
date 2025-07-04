import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanActivateChildFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

export const canActivate: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn().pipe(
    map((isLoggedIn: boolean) => {
      if (!isLoggedIn) {
        authService.clearSession(); // ahora es público
        return router.createUrlTree(['/login']);
      }

      const tokenData: any = authService.getTokenData();
      const userRole = tokenData?.['role'];
      const allowedRoles = route.data?.['roles'] ?? [];

      if (allowedRoles.includes('ALL') || allowedRoles.includes(userRole)) {
        return true;
      }

      return router.createUrlTree([authService.getDefaultRoute(userRole)]);
    }),
    catchError(() => {
      authService.clearSession();
      return of(router.createUrlTree(['/login']));
    })
  );
};

export const canActivateChild: CanActivateChildFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => canActivate(route, state);
