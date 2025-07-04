import { Routes } from '@angular/router';
import { canActivate } from './guards/auth.guard';

import { Login } from './components/login/login/login';
import { NavigationComponent } from './components/main/navigation/navigation.component';
import { Dashboard } from './components/main/dashboard/dashboard';
import { NewTicket } from './components/forms/new-ticket/new-ticket';
import { NewTicketAlumbrado } from './components/forms/new-ticket-alumbrado/new-ticket-alumbrado';
import { Luminarias } from './components/main/luminarias/luminarias';
import { Tickets } from './components/main/tickets/tickets';

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
    path: 'new-ticket',
    component: NewTicket,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
  {
    path: 'new-ticket-alumbrado',
    component: NewTicketAlumbrado,
    canActivate: [canActivate],
    data: { roles: ['ALL'] }
  },
  {
    path: 'luminarias',
    component: Luminarias,
    canActivate: [canActivate],
    data: { roles: ['ROLE_ALUMBRADO', 'ROLE_ADMIN'] }
  },

  // Ruta comodín (fallback)
  { path: '**', redirectTo: 'login' }
];
