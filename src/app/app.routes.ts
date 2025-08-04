import { Routes } from '@angular/router';
import { canActivate } from './guards/auth.guard';

import { Login } from './components/login/login/login';
import { NavigationComponent } from './components/main/navigation/navigation.component';
import { Dashboard } from './components/main/dashboard/dashboard';
import { Luminarias } from './components/main/luminarias/luminarias';
import { Tickets } from './components/main/tickets/tickets';
import { TicketManagement } from './components/main/ticket/ticket';
import { SuccessDialog } from './components/dialogs/success-dialog/success-dialog';

export const routes: Routes = [
  { path: 'login', component: Login },

  {
    path: 'tickets',
    component: Tickets,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
  {
    path: 'navigation',
    component: NavigationComponent,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
  {
    path: 'ticket',
    component: TicketManagement,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
  {
    path: 'luminarias',
    component: Luminarias,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
   {
    path: 'success-dialog',
    component: SuccessDialog,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },

  // Ruta comodín (fallback)
  { path: '**', redirectTo: 'tickets' }
];
