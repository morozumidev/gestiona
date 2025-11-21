// gestiona/src/app/guards/auth.guard.ts
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
  map(({ authenticated, user }) => {
    if (!authenticated) {
      return router.createUrlTree(['/login']);
    }

    const userRole = user?.role?.name || 'user';
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
